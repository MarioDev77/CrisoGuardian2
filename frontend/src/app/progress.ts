export interface Progress { unlocked: number; stars: number[]; coins: number; best: number[] }
const KEY = 'crisoverde-rust-progress-v2';
import { NEW_ISLANDS } from './catalog';
export const LEVEL_COUNT = 8 + NEW_ISLANDS.length;
const fresh = (): Progress => ({ unlocked: 1, stars: Array(LEVEL_COUNT).fill(0), coins: 0, best: Array(LEVEL_COUNT).fill(0) });
export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY); if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Progress>; const base = fresh();
    return {
      unlocked: Number.isSafeInteger(p.unlocked) ? Math.max(1, Math.min(LEVEL_COUNT, p.unlocked!)) : 1,
      stars: Array.isArray(p.stars) ? base.stars.map((_, i) => Number.isInteger(p.stars![i]) ? Math.max(0, Math.min(3, p.stars![i]!)) : 0) : base.stars,
      coins: Number.isSafeInteger(p.coins) && p.coins! >= 0 ? p.coins! : 0,
      best: Array.isArray(p.best) ? base.best.map((_, i) => Number.isSafeInteger(p.best![i]) && p.best![i]! >= 0 ? p.best![i]! : 0) : base.best,
    };
  } catch { return fresh(); }
}
export function saveProgress(progress: Progress): void { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* storage can be unavailable */ } }
export function starsFor(materials: number, total: number): number { const ratio = total ? materials / total : 1; return ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1; }
