export const ROOMS = Object.freeze([
  { level: 1, name: 'Study desk', url: './play.html' },
  { level: 2, name: 'Baking table', url: './level-2.html' },
  { level: 3, name: 'Christmas room', url: './level-3.html' },
]);

export function createCampaignProgress(storage = () => globalThis.localStorage) {
  const key = 'pixel-paws.campaign';
  let saved = {};
  try { saved = JSON.parse(storage().getItem(key)) ?? {}; } catch { /* Start with session progress. */ }
  const progress = {};
  for (const { level } of ROOMS) {
    const entry = saved[level];
    let legacy = 0;
    try { legacy = Number(storage().getItem(level === 1 ? 'pixel-paws.best-score' : `pixel-paws.level-${level}.best-score`)) || 0; } catch { /* Storage may be disabled. */ }
    progress[level] = {
      best: Math.max(0, Number.isFinite(entry?.best) ? entry.best : 0, legacy),
      stars: Number.isInteger(entry?.stars) ? Math.max(0, Math.min(3, entry.stars)) : 0,
      cleared: entry?.cleared === true,
    };
  }
  return {
    snapshot: () => structuredClone(progress),
    complete: () => ROOMS.every(({ level }) => progress[level].cleared),
    record(level, { total, reason }, stars) {
      if (!progress[level] || !['cleared', 'timeout'].includes(reason) || !Number.isFinite(total)) return;
      const entry = progress[level];
      entry.best = Math.max(entry.best, total);
      entry.stars = Math.max(entry.stars, Math.max(0, Math.min(3, stars)));
      entry.cleared ||= reason === 'cleared';
      try { storage().setItem(key, JSON.stringify(progress)); } catch { /* Session progress still works. */ }
    },
  };
}
