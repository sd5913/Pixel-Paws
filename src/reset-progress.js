const PROGRESS_KEYS = Object.freeze([
  'pixel-paws.achievements',
  'pixel-paws.controls-seen',
  'pixel-paws.campaign',
  'pixel-paws.best-score',
  'pixel-paws.level-2.best-score',
  'pixel-paws.level-3.best-score',
]);

// Reset gameplay progress without changing the player's sound preferences.
export function resetSavedProgress(storage = () => globalThis.localStorage) {
  try {
    const save = storage();
    for (const key of PROGRESS_KEYS) save.removeItem(key);
    return true;
  } catch { return false; }
}
