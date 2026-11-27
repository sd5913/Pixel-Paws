import * as THREE from 'three';
import { IMPACT_CONFIG } from './config.js';
import { impactLevel, impactVolume, parseAudioPath } from './audio-catalog.js';
import { readAudioPreferences, normalizeAudioPreferences } from '../audio-preferences.js';

export class AudioManager {
  constructor({ three = THREE, fetchImpl = (...args) => globalThis.fetch(...args), random = Math.random,
    warn = console.warn, development = ['localhost', '127.0.0.1'].includes(globalThis.location?.hostname),
    catalogUrl = './assets/audio/catalog.json' } = {}) {
    Object.assign(this, { three, fetchImpl, random, warn, development, catalogUrl });
    this.buffers = new Map();
    this.warned = new Set();
    this.positional = [];
    this.ui = [];
    this.volume = 1;
    this.preferences = readAudioPreferences();
    this.preferencesChanged = event => this.setPreferences(event.detail);
    globalThis.addEventListener?.('pixel-paws-audio', this.preferencesChanged);
    this.muted = false;
    this.disposed = false;
    this.nextVoice = 0;
    this.nextUIVoice = 0;
    this.objectVoices = new Map();
    this.nextObjectPopAt = 0;
    this.visibility = () => {
      if (globalThis.document?.hidden) {
        if (this.musicVoice?.isPlaying) this.musicVoice.pause();
        if (this.fireVoice?.isPlaying) this.fireVoice.stop();
      } else void this.unlock();
    };
    this.gesture = () => { void this.unlock(); };
  }

  init(camera, scene) {
    if (this.disposed) return false;
    if (this.listener) { camera.add(this.listener); return true; }
    try {
      this.listener = new this.three.AudioListener();
      camera.add(this.listener);
      for (let i = 0; i < IMPACT_CONFIG.poolSize; i++) {
        const source = new this.three.PositionalAudio(this.listener);
        source.setRefDistance(IMPACT_CONFIG.refDistance);
        source.setMaxDistance(IMPACT_CONFIG.maxDistance);
        scene.add(source);
        this.positional.push(source);
      }
      for (let i = 0; i < IMPACT_CONFIG.uiPoolSize; i++) this.ui.push(new this.three.Audio(this.listener));
      this.setMasterVolume(this.volume);
      globalThis.document?.addEventListener('visibilitychange', this.visibility);
      globalThis.document?.addEventListener('pointerdown', this.gesture, true);
      globalThis.document?.addEventListener('keydown', this.gesture, true);
      return true;
    } catch (error) {
      this.warn('Audio unavailable; gameplay will continue silently.', error);
      this.dispose();
      return false;
    }
  }

  preload() {
    if (this.loading) return this.loading;
    if (!this.listener || this.disposed) return Promise.resolve();
    const context = this.listener.context;
    this.loading = (async () => {
      try {
        const response = await this.fetchImpl(this.catalogUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const paths = await response.json();
        if (!Array.isArray(paths)) throw new Error('Audio catalog must be an array.');
        await Promise.all(paths.map(async path => {
          const entry = parseAudioPath(path);
          if (!entry || this.disposed) return;
          try {
            // Encode individual path segments so spaces and # in filenames are safe.
            const url = this.catalogUrl.replace(/[^/]*$/, '') + path.split('/').map(encodeURIComponent).join('/');
            const sample = await this.fetchImpl(url);
            if (!sample.ok) throw new Error(`HTTP ${sample.status}`);
            const buffer = await context.decodeAudioData(await sample.arrayBuffer());
            if (this.disposed) return;
            const key = `${entry.kind}:${entry.key}`;
            if (!this.buffers.has(key)) this.buffers.set(key, []);
            this.buffers.get(key).push(buffer);
          } catch (error) { if (!this.disposed) this.warn(`Could not load audio sample: ${path}`, error); }
        }));
        this.startMusic();
      } catch (error) { if (!this.disposed) this.warn('Could not load bundled audio catalog; continuing silently.', error); }
    })();
    return this.loading;
  }

  async unlock() {
    if (!this.listener || this.disposed) return false;
    try {
      const context = this.listener.context;
      if (context.state !== 'running') await context.resume();
      if (this.disposed || context.state !== 'running') return false;
      this.removeGestureListeners();
      this.startMusic();
      return true;
    } catch { return false; } // A later gesture may retry.
  }

  sample(kind, key) {
    const variants = this.buffers.get(`${kind}:${key}`);
    if (variants?.length) {
      if(kind==='ui' && key==='floor-pop' && variants.length>1){
        const previous=this.lastFloorPopIndex;
        const count=previous===undefined?variants.length:variants.length-1;
        let index=Math.floor(this.random()*count);
        if(previous!==undefined && index>=previous)index++;
        this.lastFloorPopIndex=index;
        return variants[index];
      }
      return variants[Math.floor(this.random()*variants.length)];
    }
    if (this.development && !this.warned.has(`${kind}:${key}`)) {
      this.warned.add(`${kind}:${key}`);
      this.warn(`No audio sample for ${kind}:${key}. Add files under src/assets/audio/${kind === 'impact' ? 'impacts' : 'ui'}/${key}/ and rebuild.`);
    }
    return null;
  }

  ready() {
    return !this.disposed && !this.muted && this.listener?.context.state === 'running';
  }

  /** @param {import('./events.js').ImpactEvent} event */
  playImpact(event) {
    if (!this.effectsReady() || !event.audioMaterial || !Number.isFinite(event.impactStrength)) return false;
    if (!event.position || !['x', 'y', 'z'].every(axis => Number.isFinite(event.position[axis]))) return false;
    const buffer = this.sample('impact', `${event.audioMaterial}/${event.surfaceMaterial ?? 'unknown'}/${impactLevel(event.impactStrength)}`);
    if (!buffer) return false;
    const source = this.positional.find(voice => !voice.isPlaying)
      ?? this.positional[this.nextVoice++ % this.positional.length];
    if (source.isPlaying) source.stop();
    source.position.set(event.position.x, event.position.y, event.position.z);
    source.setBuffer(buffer);
    source.setVolume(impactVolume(event.impactStrength) * this.preferences.effectsVolume);
    source.setPlaybackRate(IMPACT_CONFIG.playbackRateMin
      + this.random() * (IMPACT_CONFIG.playbackRateMax - IMPACT_CONFIG.playbackRateMin));
    source.play();
    return true;
  }

  playUISound(soundId, volume = 1) {
    if (!this.effectsReady()) return false;
    const buffer = this.sample('ui', soundId);
    if (!buffer) return false;
    const source = this.ui.find(voice => !voice.isPlaying) ?? this.ui[this.nextUIVoice++ % this.ui.length];
    if (source.isPlaying) source.stop();
    source.setBuffer(buffer);
    const floorSound = soundId.startsWith('floor-');
    if (floorSound && soundId !== 'floor-pop' && this.listener.context.createBiquadFilter) {
      if (!source.floorFilters) {
        const lowCut = this.listener.context.createBiquadFilter();
        lowCut.type = 'highpass'; lowCut.frequency.value = 160; lowCut.Q.value = .7;
        const clarity = this.listener.context.createBiquadFilter();
        clarity.type = 'highshelf'; clarity.frequency.value = 2200; clarity.gain.value = 2;
        source.floorFilters = [lowCut, clarity];
      }
      source.setFilters(source.floorFilters);
    } else source.setFilters?.([]);
    if(floorSound && this.musicVoice?.isPlaying){
      const now=this.listener.context.currentTime,gain=this.musicVoice.gain.gain;
      gain.cancelScheduledValues(now);gain.setValueAtTime(gain.value,now);
      gain.linearRampToValueAtTime(.06*this.preferences.musicVolume,now+.015);
      gain.setValueAtTime(.06*this.preferences.musicVolume,now+.18);
      gain.linearRampToValueAtTime(.12*this.preferences.musicVolume,now+.38);
    }
    source.setPlaybackRate(floorSound ? 1 : 1);
    source.setVolume(Math.max(0,Math.min(1,volume)) * this.preferences.effectsVolume);
    source.play();
    return true;
  }

  playObjectContact(objectId, landing = false, soundId = 'floor-pop') {
    if (!this.effectsReady()) return false;
    const variants=this.buffers.get('ui:'+soundId);
    if(!variants?.length)return false;
    let hash=0;
    for(const character of objectId)hash=(Math.imul(hash,31)+character.charCodeAt(0))>>>0;
    const key=objectId+':' +(landing?'land':'hit');
    let voice=this.objectVoices.get(key);
    if(!voice){voice=new this.three.Audio(this.listener);this.objectVoices.set(key,voice);}
    if(voice.isPlaying)return false;
    voice.setBuffer(variants[hash%variants.length]);
    voice.setVolume((landing?1.35:1.1) * this.preferences.effectsVolume);
    const now=this.listener.context.currentTime;
    const start=Math.max(now,this.nextObjectPopAt);
    this.nextObjectPopAt=start+.035;
    voice.play(start-now);
    this.duckMusic();
    return true;
  }

  resetObjectContactSounds() {
    this.nextObjectPopAt=0;
    for(const voice of this.objectVoices.values())if(voice.isPlaying)voice.stop();
  }

  duckMusic() {
    if(!this.musicVoice?.isPlaying)return;
    const now=this.listener.context.currentTime,gain=this.musicVoice.gain.gain;
    gain.cancelScheduledValues(now);gain.setValueAtTime(gain.value,now);
    gain.linearRampToValueAtTime(.06*this.preferences.musicVolume,now+.015);gain.setValueAtTime(.06*this.preferences.musicVolume,now+.18);
    gain.linearRampToValueAtTime(.12*this.preferences.musicVolume,now+.38);
  }

  startMusic() {
    if (!this.ready() || !this.preferences.musicEnabled || this.preferences.musicVolume === 0 || globalThis.document?.hidden || this.musicVoice?.isPlaying) return false;
    const buffer = this.buffers.get('music:bgm')?.[0];
    if (!buffer) return false;
    if (!this.musicVoice) {
      this.musicVoice = new this.three.Audio(this.listener);
      this.musicVoice.setBuffer(buffer);
      this.musicVoice.setLoop(true);
      this.musicVoice.setVolume(.12 * this.preferences.musicVolume);
    }
    this.musicVoice.play();
    return true;
  }

  setBurningCount(count) {
    const active=Math.max(0,Number.isFinite(count)?count:0);
    if(!active||!this.effectsReady()||globalThis.document?.hidden){if(this.fireVoice?.isPlaying)this.fireVoice.stop();return false;}
    const buffer=this.buffers.get('ui:fire-crackle')?.[0];if(!buffer)return false;
    if(!this.fireVoice){this.fireVoice=new this.three.Audio(this.listener);this.fireVoice.setBuffer(buffer);this.fireVoice.setLoop(true);}
    const volume=Math.min(.30,.16+Math.log2(active+1)*.035)*this.preferences.effectsVolume;
    if(this.fireVoice.isPlaying&&this.fireVoice.gain?.gain.setTargetAtTime)this.fireVoice.gain.gain.setTargetAtTime(volume,this.listener.context.currentTime,.06);
    else this.fireVoice.setVolume(volume);
    if(!this.fireVoice.isPlaying)this.fireVoice.play();
    return true;
  }

  playCatMeow() {
    if (!this.effectsReady() || this.catVoice?.isPlaying) return false;
    const buffer = this.sample('ui', 'meow');
    if (!buffer) return false;
    if (!this.catVoice) this.catVoice = new this.three.Audio(this.listener);
    this.catVoice.setBuffer(buffer);
    // One complete meow from the supplied recording, without the other calls.
    this.catVoice.offset = 4.94;
    this.catVoice.duration = .68;
    this.catVoice.setVolume(.8 * this.preferences.effectsVolume);
    this.catVoice.play();
    return true;
  }

  effectsReady() {
    return this.ready() && this.preferences.effectsEnabled && this.preferences.effectsVolume > 0;
  }

  setPreferences(value) {
    this.preferences = normalizeAudioPreferences(value);
    // Stop existing effects so a disabled channel becomes silent immediately.
    for (const source of [...this.positional, ...this.ui, ...this.objectVoices.values(), ...(this.catVoice ? [this.catVoice] : []), ...(this.fireVoice ? [this.fireVoice] : [])]) if (source.isPlaying) source.stop();
    if (this.musicVoice) {
      this.musicVoice.gain?.gain.cancelScheduledValues(this.listener.context.currentTime);
      this.musicVoice.setVolume(.12 * this.preferences.musicVolume);
      if ((!this.preferences.musicEnabled || this.preferences.musicVolume === 0) && this.musicVoice.isPlaying) this.musicVoice.pause();
    }
    this.startMusic();
  }

  setMasterVolume(value) {
    if (Number.isFinite(value)) this.volume = Math.max(0, Math.min(1, value));
    this.listener?.setMasterVolume(this.muted ? 0 : this.volume);
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (this.muted) for (const source of [...this.positional, ...this.ui, ...this.objectVoices.values(), ...(this.catVoice ? [this.catVoice] : []), ...(this.fireVoice ? [this.fireVoice] : []), ...(this.musicVoice ? [this.musicVoice] : [])]) if (source.isPlaying) source.stop();
    this.setMasterVolume(this.volume);
    if (!this.muted) this.startMusic();
  }

  removeGestureListeners() {
    globalThis.document?.removeEventListener('pointerdown', this.gesture, true);
    globalThis.document?.removeEventListener('keydown', this.gesture, true);
  }

  dispose() {
    this.disposed = true;
    globalThis.removeEventListener?.('pixel-paws-audio', this.preferencesChanged);
    globalThis.document?.removeEventListener('visibilitychange', this.visibility);
    this.removeGestureListeners();
    for (const source of [...this.positional, ...this.ui, ...this.objectVoices.values(), ...(this.catVoice ? [this.catVoice] : []), ...(this.fireVoice ? [this.fireVoice] : []), ...(this.musicVoice ? [this.musicVoice] : [])]) {
      if (source.isPlaying) source.stop();
      // Unplayed THREE.Audio nodes have not yet connected their graph.
      if (source.source) source.disconnect();
      source.floorFilters?.forEach(filter => filter.disconnect());
      source.panner?.disconnect();
      source.gain?.disconnect();
      source.removeFromParent();
      source.buffer = null;
    }
    this.listener?.removeFromParent();
    this.listener?.gain.disconnect();
    this.listener = null;
    this.positional.length = this.ui.length = 0;
    this.objectVoices.clear();
    this.buffers.clear();
    this.warned.clear();
    // THREE shares its AudioContext globally; do not close it here.
  }
}
