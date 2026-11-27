const KEY = 'pixel-paws.audio';
export const AUDIO_DEFAULTS = Object.freeze({ musicEnabled: true, effectsEnabled: true, musicVolume: 1, effectsVolume: 1 });
export function readAudioPreferences(storage) {
  let value;
  try { value = JSON.parse((storage ?? globalThis.localStorage)?.getItem(KEY)); } catch { /* Use defaults for invalid or unavailable storage. */ }
  return normalizeAudioPreferences(value);
}
export function normalizeAudioPreferences(value) {
  const result = { ...AUDIO_DEFAULTS };
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'boolean' && typeof value?.[key] === 'boolean') result[key] = value[key];
    if (typeof result[key] === 'number' && Number.isFinite(value?.[key])) result[key] = Math.max(0, Math.min(1, value[key]));
  }
  return result;
}
export function saveAudioPreferences(value) {
  const result = normalizeAudioPreferences(value);
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(result)); } catch { /* Keep live controls usable without storage. */ }
  globalThis.dispatchEvent?.(new CustomEvent('pixel-paws-audio', { detail: result }));
  return result;
}
