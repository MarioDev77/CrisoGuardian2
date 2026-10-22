/**
 * Colisão do jogo (pura, sem canvas): resolução por eixo com subpassos.
 *
 * - Superfícies `solid` (chão e caixas) bloqueiam dos quatro lados; as demais (pontes, beirais) são
 *   plataformas de mão única: só seguram quem cai de cima.
 * - O movimento é dividido em subpassos de no máximo MAX_STEP px, então nem um quadro longo nem uma
 *   velocidade alta fazem o corpo atravessar uma parede fina ou uma plataforma.
 * - `settle` é a rede de segurança: se um corpo terminar o movimento enterrado em um sólido (empurrão,
 *   respawn, escada), ele é expulso pelo lado de menor penetração.
 *
 * Os limiares (degrau, tolerância de pouso) são os mesmos que o jogo já usava, para o "feeling" não mudar.
 */

export interface Box { x: number; y: number; w: number; h: number }
export interface Mover extends Box { vx: number; vy: number; onGround: boolean }
/** Compatível com WSurface: o retângulo físico começa em `top`. */
export interface Surface { x: number; w: number; h: number; solid: boolean; top: number }
export interface Bounds { minX?: number; maxX?: number }

/** Maior deslocamento (px) por subpasso. */
export const MAX_STEP = 8;
/** Altura (px) de degrau que o corpo sobe andando, sem pular. */
export const STEP_UP = 16;
/** Tolerância (px) para considerar que um corpo vinha de cima: sólidos e plataformas de mão única. */
export const LAND_TOL_SOLID = 18;
export const LAND_TOL_ONEWAY = 10;

export const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const rectOf = (s: Surface): Box => ({ x: s.x, y: s.top, w: s.w, h: s.h });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Área que pode ser atingida pelo corpo do herói (mais justa que a caixa de física: ignora braços e capacete). */
export function playerHurtbox(p: Box): Box { return { x: p.x + 6, y: p.y + 8, w: p.w - 12, h: p.h - 12 }; }

/** Caixa que cobre todo o trajeto horizontal de um projétil de x0 a x1 (evita o tiro "pular" um alvo fino). */
export function sweptBox(x0: number, x1: number, cy: number, hw: number, hh: number): Box {
  return { x: Math.min(x0, x1) - hw, y: cy - hh, w: Math.abs(x1 - x0) + 2 * hw, h: 2 * hh };
}

/** Move no eixo X; sólidos bloqueiam (ou viram degrau, se baixos). */
export function moveX(b: Mover, dx: number, surfaces: readonly Surface[], bounds: Bounds = {}): void {
  b.x += dx;
  for (const s of surfaces) {
    if (!s.solid) continue; const r = rectOf(s);
    if (!overlaps(b, r)) continue;
    if (b.y + b.h - r.y < STEP_UP && b.vy >= 0) { b.y = r.y - b.h; continue; } // degrau baixo: sobe
    if (dx > 0) b.x = r.x - b.w; else if (dx < 0) b.x = r.x + r.w; else b.x = b.x + b.w / 2 < r.x + r.w / 2 ? r.x - b.w : r.x + r.w;
    b.vx = 0;
  }
  if (bounds.minX !== undefined && b.x < bounds.minX) { b.x = bounds.minX; b.vx = Math.max(0, b.vx); }
  if (bounds.maxX !== undefined && b.x + b.w > bounds.maxX) { b.x = bounds.maxX - b.w; b.vx = Math.min(0, b.vx); }
}

/** Move no eixo Y; pousa em sólidos e (se `drop` for falso) em plataformas de mão única; bate a cabeça no teto. */
export function moveY(b: Mover, dy: number, surfaces: readonly Surface[], drop = false): void {
  const prevBottom = b.y + b.h; b.y += dy;
  for (const s of surfaces) {
    const r = rectOf(s); if (!overlaps(b, r)) continue;
    if (s.solid) {
      if (dy >= 0 && prevBottom <= r.y + LAND_TOL_SOLID) { b.y = r.y - b.h; b.vy = 0; b.onGround = true; }
      else if (dy < 0) { b.y = r.y + r.h; b.vy = 0; }
    } else if (dy >= 0 && !drop && prevBottom <= r.y + LAND_TOL_ONEWAY) { b.y = r.y - b.h; b.vy = 0; b.onGround = true; }
  }
}

/**
 * Rede de segurança: expulsa o corpo de qualquer sólido em que ainda esteja enterrado, pelo lado de menor
 * penetração. `ground` = pode marcar `onGround` quando for empurrado para cima (corpos voadores não).
 */
export function settle(b: Mover, surfaces: readonly Surface[], ground = true): void {
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const s of surfaces) {
      if (!s.solid) continue; const r = rectOf(s);
      const ox = Math.min(b.x + b.w, r.x + r.w) - Math.max(b.x, r.x), oy = Math.min(b.y + b.h, r.y + r.h) - Math.max(b.y, r.y);
      if (ox <= 0.01 || oy <= 0.01) continue;
      if (oy <= ox) {
        if (b.y + b.h / 2 < r.y + r.h / 2) { b.y = r.y - b.h; if (b.vy > 0) b.vy = 0; if (ground) b.onGround = true; }
        else { b.y = r.y + r.h; if (b.vy < 0) b.vy = 0; }
      } else { b.x += b.x + b.w / 2 < r.x + r.w / 2 ? -ox : ox; b.vx = 0; }
      moved = true;
    }
    if (!moved) break;
  }
}

/** Passo completo de física de um corpo: subpassos X→Y e rede de segurança. */
export function moveBody(b: Mover, dt: number, surfaces: readonly Surface[], opts: { drop?: boolean } & Bounds = {}): void {
  const dx = b.vx * dt, dy = b.vy * dt;
  const n = clamp(Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_STEP), 1, 24);
  b.onGround = false;
  for (let i = 0; i < n; i++) { moveX(b, dx / n, surfaces, opts); moveY(b, dy / n, surfaces, opts.drop ?? false); }
  settle(b, surfaces);
}

/** Primeiro alvo atingido por um projétil que andou de x0 até x1, na ordem do trajeto (o mais próximo de x0). */
export function nearestAlong<T extends { box: Box }>(x0: number, x1: number, targets: readonly T[]): T | null {
  const dir = x1 >= x0 ? 1 : -1; let best: T | null = null, bd = Infinity;
  for (const t of targets) { const d = dir > 0 ? Math.max(0, t.box.x - x0) : Math.max(0, x0 - (t.box.x + t.box.w)); if (d < bd) { bd = d; best = t; } }
  return best;
}
