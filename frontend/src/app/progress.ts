export interface Progress { unlocked: number; stars: number[]; coins: number; best: number[] }
const KEY = 'crisoverde-rust-progress-v2';
export const LEVEL_COUNT = 8;
const fresh = (): Progress => ({ unlocked: 1, stars: Array(LEVEL_COUNT).fill(0), coins: 0, best: Array(LEVEL_COUNT).fill(0) });

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY); if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Progress>; const f = fresh();
    return { unlocked: Math.max(1, Math.min(LEVEL_COUNT, p.unlocked ?? 1)), stars: (p.stars ?? f.stars).slice(0, LEVEL_COUNT), coins: p.coins ?? 0, best: (p.best ?? f.best).slice(0, LEVEL_COUNT) };
  } catch { return fresh(); }
}
export function saveProgress(p: Progress): void { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ } }
export function starsFor(materials: number, total: number): number {
  const r = total ? materials / total : 1; return r >= 0.9 ? 3 : r >= 0.6 ? 2 : 1;
}
export function completeLevel(p: Progress, level: number, stars: number, coins: number, score: number): Progress {
  const stars2 = p.stars.slice(); stars2[level] = Math.max(stars2[level] ?? 0, stars);
  const best = p.best.slice(); best[level] = Math.max(best[level] ?? 0, score);
  return { unlocked: Math.min(LEVEL_COUNT, Math.max(p.unlocked, level + 2)), stars: stars2, coins: p.coins + coins, best };
}
export const unlockAll = (p: Progress): Progress => ({ ...p, unlocked: LEVEL_COUNT });
export const resetProgress = (): Progress => { const f = fresh(); saveProgress(f); return f; };
