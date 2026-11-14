import * as THREE from 'three';
import { IMPACT_CONFIG } from './config.js';
import { impactLevel, impactVolume, parseAudioPath } from './audio-catalog.js';

export class AudioManager {
  constructor({ three = THREE, fetchImpl = globalThis.fetch, random = Math.random,
    warn = console.warn, development = ['localhost', '127.0.0.1'].includes(globalThis.location?.hostname),
    catalogUrl = './assets/audio/catalog.json' } = {}) {
    Object.assign(this, { three, fetchImpl, random, warn, development, catalogUrl });
    this.buffers = new Map();
    this.warned = new Set();
    this.positional = [];
    this.ui = [];
    this.volume = 1;
    this.muted = false;
    this.disposed = false;
    this.nextVoice = 0;
    this.nextUIVoice = 0;
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
      return true;
    } catch { return false; } // A later gesture may retry.
  }

  sample(kind, key) {
    const variants = this.buffers.get(`${kind}:${key}`);
    if (variants?.length) return variants[Math.floor(this.random() * variants.length)];
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
    if (!this.ready() || !event.audioMaterial || !Number.isFinite(event.impactStrength)) return false;
    if (!event.position || !['x', 'y', 'z'].every(axis => Number.isFinite(event.position[axis]))) return false;
    const buffer = this.sample('impact', `${event.audioMaterial}/${event.surfaceMaterial ?? 'unknown'}/${impactLevel(event.impactStrength)}`);
    if (!buffer) return false;
    const source = this.positional.find(voice => !voice.isPlaying)
      ?? this.positional[this.nextVoice++ % this.positional.length];
    if (source.isPlaying) source.stop();
    source.position.set(event.position.x, event.position.y, event.position.z);
    source.setBuffer(buffer);
    source.setVolume(impactVolume(event.impactStrength));
    source.setPlaybackRate(IMPACT_CONFIG.playbackRateMin
      + this.random() * (IMPACT_CONFIG.playbackRateMax - IMPACT_CONFIG.playbackRateMin));
    source.play();
    return true;
  }

  playUISound(soundId) {
    if (!this.ready()) return false;
    const buffer = this.sample('ui', soundId);
    if (!buffer) return false;
    const source = this.ui.find(voice => !voice.isPlaying) ?? this.ui[this.nextUIVoice++ % this.ui.length];
    if (source.isPlaying) source.stop();
    source.setBuffer(buffer);
    source.setVolume(1);
    source.play();
    return true;
  }

  setMasterVolume(value) {
    if (Number.isFinite(value)) this.volume = Math.max(0, Math.min(1, value));
    this.listener?.setMasterVolume(this.muted ? 0 : this.volume);
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (this.muted) for (const source of [...this.positional, ...this.ui]) if (source.isPlaying) source.stop();
    this.setMasterVolume(this.volume);
  }

  removeGestureListeners() {
    globalThis.document?.removeEventListener('pointerdown', this.gesture, true);
    globalThis.document?.removeEventListener('keydown', this.gesture, true);
  }

  dispose() {
    this.disposed = true;
    this.removeGestureListeners();
    for (const source of [...this.positional, ...this.ui]) {
      if (source.isPlaying) source.stop();
      // Unplayed THREE.Audio nodes have not yet connected their graph.
      if (source.source) source.disconnect();
      source.panner?.disconnect();
      source.gain?.disconnect();
      source.removeFromParent();
      source.buffer = null;
    }
    this.listener?.removeFromParent();
    this.listener?.gain.disconnect();
    this.listener = null;
    this.positional.length = this.ui.length = 0;
    this.buffers.clear();
    this.warned.clear();
    // THREE shares its AudioContext globally; do not close it here.
  }
}
