import type { Assets } from './assets';
import { layouts, SCENE_W, type EnemyKind, type Layout, type Material, type Surface } from './levels/layouts';
import type { Rect } from './entities';

export const VIEW_W = 960;
export const VIEW_H = 600;

export interface WSurface { x: number; y: number; w: number; h: number; kind: Surface['kind']; tile: string; rows: number; solid: boolean; top: number }
export interface WLadder extends Rect { }
export interface WDecor { x: number; y: number; tile: string; scale: number; hazard: boolean }
export interface Spawn<T> { x: number; y: number; type: T; minX?: number; maxX?: number }
export interface World {
  layout: Layout; index: number; scale: number; screenW: number; width: number; bottom: number;
  surfaces: WSurface[]; ladders: WLadder[]; decor: WDecor[];
  walkers: Spawn<EnemyKind>[]; flyers: Spawn<EnemyKind>[];
  waste: Spawn<Material>[]; coins: { x: number; y: number }[]; powers: Spawn<'escudo' | 'velocidade' | 'vida'>[];
  bins: { x: number; y: number }[]; goal: { x: number; y: number }; start: { x: number; y: number };
  bossAt: { x: number; y: number } | null;
}

function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Builds the world: the scene art is repeated and mirrored every other screen so geometry always lines up. */
export function buildWorld(index: number, assets: Assets): World {
  const layout = layouts[index] ?? layouts[0]!;
  const rnd = mulberry32(index * 7919 + 13);
  const s = VIEW_H / layout.sceneH;
  const screenW = SCENE_W * s;
  const width = screenW * layout.screens;
  const surfaces: WSurface[] = [];
  const ladders: WLadder[] = [];
  const decor: WDecor[] = [];

  for (let k = 0; k < layout.screens; k++) {
    const flip = k % 2 === 1;
    const mx = (x: number, w: number) => k * screenW + (flip ? screenW - (x + w) * s : x * s);
    for (const sf of layout.surfaces) {
      const x = mx(sf.x, sf.w); const w = sf.w * s; const y = sf.y * s;
      if (sf.kind === 'crates') {
        const src = assets.size(sf.tile); const ch = src.h * (w / Math.max(1, src.w)); const rows = sf.rows ?? 1;
        surfaces.push({ x, y: y - ch * rows, w, h: ch * rows, kind: 'crates', tile: sf.tile, rows, solid: true, top: y - ch * rows });
      } else if (sf.kind === 'ground') {
        surfaces.push({ x, y, w, h: VIEW_H - y + 200, kind: 'ground', tile: sf.tile, rows: 1, solid: true, top: y });
      } else {
        const src = assets.size(sf.tile); const th = sf.kind === 'bridge' ? 14 : Math.max(18, Math.round(src.h * 0.55 * s));
        surfaces.push({ x, y, w, h: th, kind: sf.kind, tile: sf.tile, rows: 1, solid: false, top: y });
      }
    }
    for (const l of layout.ladders) ladders.push({ x: mx(l.x, 0) - 22, y: l.top * s, w: 44, h: (l.bottom - l.top) * s });
    for (const d of layout.decor) decor.push({ x: mx(d.x, 0), y: d.y * s, tile: d.tile, scale: (d.scale ?? 1) * s, hazard: !!d.hazard });
  }

  // merge abutting ground/plat pieces that share height & tile (mirror seams) so no visible join remains
  surfaces.sort((a, b) => a.x - b.x);
  const merged: WSurface[] = [];
  for (const sf of surfaces) {
    const prev = [...merged].reverse().find((m) => m.kind === sf.kind && m.tile === sf.tile && Math.abs(m.y - sf.y) < 1 && sf.kind !== 'crates' && Math.abs(m.x + m.w - sf.x) < 2);
    if (prev) prev.w = sf.x + sf.w - prev.x; else merged.push({ ...sf });
  }

  const topAt = (x: number): number => {
    let best = VIEW_H;
    for (const m of merged) if (m.kind === 'ground' && x >= m.x && x <= m.x + m.w) best = Math.min(best, m.top);
    return best;
  };
  const grounds = merged.filter((m) => m.kind === 'ground');
  const start = { x: 120, y: topAt(120) };

  // goal at the end of the last screen
  const goalX = width - 180; const goal = { x: goalX, y: topAt(goalX) };

  const walkers: Spawn<EnemyKind>[] = []; const flyers: Spawn<EnemyKind>[] = []; const waste: Spawn<Material>[] = [];
  const coins: { x: number; y: number }[] = []; const powers: World['powers'] = []; const bins: { x: number; y: number }[] = [];
  const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)]!;
  const bossAt = layout.boss ? { x: width - 640, y: topAt(width - 640) } : null;

  /** Faixa de patrulha de um bicho: a superfície inteira (margem de 6px) + vizinhas coladas que ele consegue pisar (degrau pequeno). */
  const walkSpan = (sf: WSurface): [number, number] => {
    const solid = sf.kind === 'ground'; const cand = merged.filter((m) => m.kind === sf.kind);
    const ok = (from: WSurface, to: WSurface) => solid ? (to.top - from.top <= 10 && from.top - to.top <= 14) : Math.abs(to.top - from.top) < 3;
    let lo = sf.x, hi = sf.x + sf.w, r = sf, l = sf;
    for (let i = 0; i < 8; i++) { const n = cand.find((m) => m !== r && Math.abs(m.x - hi) <= 4 && ok(r, m)); if (!n) break; r = n; hi = n.x + n.w; }
    for (let i = 0; i < 8; i++) { const n = cand.find((m) => m !== l && Math.abs(m.x + m.w - lo) <= 4 && ok(l, m)); if (!n) break; l = n; lo = n.x; }
    return [Math.max(0, lo + 6), Math.min(width, hi - 6)];
  };

  for (const sf of merged) {
    if (sf.kind === 'crates') continue;
    const top = sf.top; const cx = sf.x + sf.w / 2;
    const nearStart = sf.x + sf.w < 520; const nearGoal = sf.x > width - 420;
    // coins in a row above surface
    const n = Math.max(2, Math.min(7, Math.floor(sf.w / 120)));
    for (let i = 0; i < n; i++) {
      const x = sf.x + sf.w * ((i + 1) / (n + 1)); const arc = Math.sin(((i + 1) / (n + 1)) * Math.PI) * 24;
      if (sf.kind === 'ground' && sf.w > 700 && i % 2) continue;
      coins.push({ x, y: top - 56 - arc });
    }
    // waste items
    const wn = sf.w > 700 ? Math.floor(sf.w / 380) : sf.w > 70 ? 1 : 0;
    for (let i = 0; i < wn; i++) {
      const x = sf.x + sf.w * ((i + 0.5) / wn) + (rnd() - 0.5) * 60;
      if (nearStart && sf.kind === 'ground' && x < 380) continue;
      waste.push({ x, y: top - 44, type: pick(layout.materials) });
    }
    // walkers on wide surfaces
    if (!nearStart && !nearGoal && sf.w > 150 && layout.walkers.length) {
      const k = cx / screenW;
      const [lo, hi] = walkSpan(sf);
      // caixas sobre o chão cortam a superfície: o bicho patrulha o maior trecho livre entre elas (sem bater nem tremer)
      const crates = merged.filter((c) => c.kind === 'crates' && c.x < hi && c.x + c.w > lo && Math.abs(c.top + c.h - sf.top) < 8).sort((a, b) => a.x - b.x);
      const segs: [number, number][] = []; let cut = lo;
      for (const c of crates) { if (c.x - 4 > cut) segs.push([cut, c.x - 4]); cut = Math.max(cut, c.x + c.w + 4); }
      if (hi > cut) segs.push([cut, hi]);
      const [a, b] = segs.sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]))[0] ?? [lo, hi];
      // (mantém o sorteio idêntico ao original: a chance menor só descarta o bicho, não muda os números sorteados depois)
      const roll = rnd(); const orig = 0.38 + 0.07 * k;
      if (roll < orig) {
        const xr = rnd(); const type = pick(layout.walkers);
        if (b - a >= 150 && roll < orig * (b - a < 260 ? 0.5 : 1)) walkers.push({ x: Math.max(a + 40, Math.min(b - 40, (a + b) / 2 + (xr - 0.5) * (b - a) * 0.3)), y: top, type, minX: a, maxX: b });
      }
      if (sf.w > 600 && rnd() < 0.7) { const xr = rnd(); walkers.push({ x: Math.max(a + 40, Math.min(b - 40, a + (b - a) * (0.25 + xr * 0.5))), y: top, type: pick(layout.walkers), minX: a, maxX: b }); }
      // chão muito longo (fases 7 e 8): mais bichos espalhados, cada um com seu trecho de ~800px (compensa as plataformas minúsculas que ficaram sem bicho; sem sorteio extra)
      if (b - a > 1400) {
        const extras = Math.floor((b - a) / 700) - 2;
        for (let i = 0; i < extras; i++) {
          const x = a + (b - a) * ((i + 1) / (extras + 1));
          if (x < 700 || x > width - 900) continue;
          walkers.push({ x, y: top, type: layout.walkers[(i + index) % layout.walkers.length]!, minX: Math.max(a, x - 400), maxX: Math.min(b, x + 400) });
        }
      }
    }
  }
  // flyers
  if (layout.flyers.length) {
    for (let k = 1; k < layout.screens; k++) {
      const count = k > 2 ? 2 : 1;
      for (let i = 0; i < count; i++) flyers.push({ x: k * screenW + 160 + rnd() * (screenW - 320), y: VIEW_H * (0.28 + rnd() * 0.3), type: pick(layout.flyers) });
    }
  }
  // checkpoint bins at the middle of widest ground on screens 1..3
  for (let k = 1; k < layout.screens - 1; k++) {
    const inScreen = grounds.filter((g) => g.x < (k + 1) * screenW && g.x + g.w > k * screenW);
    const g = inScreen.sort((a, b) => b.w - a.w)[0];
    if (g) {
      // margem = meia largura REAL da lixeira + folga: a base fica inteira sobre o chão (antes era fixa em 40px e a lixeira pendurava na borda)
      const half = Math.max(40, assets.size(layout.bin).w * s * 0.95 / 2 + 8);
      const lo = g.x + half, hi = g.x + g.w - half; const want = k * screenW + screenW * 0.5;
      const bx = lo <= hi ? Math.max(lo, Math.min(hi, want)) : g.x + g.w / 2;
      bins.push({ x: bx, y: topAt(bx) });
    }
  }
  // power-ups
  const plats = merged.filter((m) => m.kind !== 'ground' && m.kind !== 'crates');
  (['escudo', 'vida', 'velocidade'] as const).forEach((type, i) => {
    const k = i + 1; const cand = plats.filter((p) => p.x > k * screenW && p.x < (k + 1) * screenW);
    const p = cand.length ? pick(cand) : null;
    if (p) powers.push({ x: p.x + p.w / 2, y: p.top - 52, type }); else powers.push({ x: k * screenW + screenW / 2, y: topAt(k * screenW + screenW / 2) - 52, type });
  });

  return { layout, index, scale: s, screenW, width, bottom: VIEW_H, surfaces: merged, ladders, decor, walkers, flyers, waste, coins, powers, bins, goal, start, bossAt };
}
