import { AUDIO_MATERIALS, IMPACT_CONFIG } from './config.js';

export function parseAudioPath(path) {
  if (typeof path !== 'string' || path.split('/').some(part => !part || part === '..' || part === '.')) return null;
  if (!/\.(mp3|wav|ogg|m4a)$/i.test(path)) return null;
  const parts = path.split('/');
  if (parts[0] === 'impacts' && parts.length === 5
    && AUDIO_MATERIALS.includes(parts[1]) && AUDIO_MATERIALS.includes(parts[2])
    && ['light', 'medium', 'heavy'].includes(parts[3])) {
    return { kind: 'impact', key: parts.slice(1, 4).join('/') };
  }
  if (parts[0] === 'ui' && (parts.length === 2 || parts.length === 3)) {
    return { kind: 'ui', key: parts.length === 3 ? parts[1] : parts[1].replace(/\.[^.]+$/, '') };
  }
  return null;
}

export function impactLevel(strength) {
  return strength >= IMPACT_CONFIG.heavyImpulse ? 'heavy'
    : strength >= IMPACT_CONFIG.mediumImpulse ? 'medium' : 'light';
}

export function impactVolume(strength) {
  const normalized = Math.sqrt(Math.max(0, strength) / IMPACT_CONFIG.fullVolumeImpulse);
  return Math.min(IMPACT_CONFIG.maxVolume, Math.max(IMPACT_CONFIG.minVolume, normalized * IMPACT_CONFIG.maxVolume));
}
