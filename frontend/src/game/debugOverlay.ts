/**
 * Overlay de depuração visual (hitboxes, superfícies, origem do sprite, estado da animação, velocidades).
 * Só é chamado sob `import.meta.env.DEV`: no build de produção as chamadas somem e este módulo é descartado.
 * Liga/desliga com F3 (ou `?debug=1` na URL) em `npm run dev`.
 */
import { playerHurtbox, sweptBox, type Box } from './collision';
import type { Frame } from './assets';

export interface DebugState {
  p: Box & { vx: number; vy: number; onGround: boolean; coyote: number; jumpBuf: number; inv: number; hurtT: number; shootT: number; hp: number; maxHp: number };
  world: { surfaces: { x: number; w: number; h: number; top: number; solid: boolean }[]; ladders: Box[] };
  enemies: (Box & { dying: number })[]; boss: Box | null; bins: Box[];
  shots: { x: number; y: number; vx: number }[];
  cam: number; vw: number; frame: Frame | undefined; frameName: string; ps: number; feetY: number;
  animState: string; animT: number; shotPending: boolean; fps: number;
}

/** Em coordenadas do mundo (chamar dentro da transformação da câmera). */
export function drawDebugWorld(ctx: CanvasRenderingContext2D, d: DebugState): void {
  const p = d.p; ctx.save(); ctx.lineWidth = 1; ctx.font = '10px monospace';
  const box = (r: Box, c: string) => { ctx.strokeStyle = c; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); };
  for (const sf of d.world.surfaces) {
    if (sf.x + sf.w < d.cam - 40 || sf.x > d.cam + d.vw + 40) continue;
    const r = { x: sf.x, y: sf.top, w: sf.w, h: Math.min(sf.h, 28) };
    ctx.fillStyle = sf.solid ? 'rgba(255,60,60,.12)' : 'rgba(60,200,255,.18)'; ctx.fillRect(r.x, r.y, r.w, r.h); box(r, sf.solid ? '#ff3c3c' : '#3cc8ff');
  }
  for (const l of d.world.ladders) box(l, '#b07cff');
  for (const e of d.enemies) if (e.dying <= 0) box(e, '#ff9f1c');
  if (d.boss) box(d.boss, '#ff5ec4');
  for (const b of d.bins) box(b, '#7dffb0');
  for (const s of d.shots) box(sweptBox(s.x - s.vx * 0.016, s.x, s.y, 20, 10), '#ffffff');
  // tamanho visual do sprite (célula do quadro) x hitbox física
  const f = d.frame, fx = p.x + p.w / 2, fy = p.y + p.h + d.feetY;
  if (f) { ctx.setLineDash([3, 3]); box({ x: fx - f.ax * d.ps, y: fy - f.ay * d.ps, w: f.w * d.ps, h: f.h * d.ps }, '#ffffff'); ctx.setLineDash([]); }
  box(p, '#ffe600'); box(playerHurtbox(p), '#ff8a00');
  ctx.strokeStyle = '#00ff66'; ctx.beginPath(); ctx.moveTo(fx - 8, fy); ctx.lineTo(fx + 8, fy); ctx.moveTo(fx, fy - 8); ctx.lineTo(fx, fy + 8); ctx.stroke();
  ctx.fillStyle = '#00ff66'; ctx.fillText(p.onGround ? 'chão' : 'ar', p.x, p.y - 4);
  ctx.restore();
}

/** Em coordenadas da tela (depois do HUD). */
export function drawDebugPanel(ctx: CanvasRenderingContext2D, d: DebugState): void {
  const p = d.p; const lines = [
    `estado  ${d.animState}  (${d.animT.toFixed(2)}s)`, `quadro  ${d.frameName}`,
    `vx ${p.vx.toFixed(0)}  vy ${p.vy.toFixed(0)}  ${p.onGround ? 'NO CHÃO' : 'NO AR'}`,
    `coyote ${Math.max(0, p.coyote).toFixed(2)}  buffer ${Math.max(0, p.jumpBuf).toFixed(2)}`,
    `inv ${p.inv.toFixed(2)}  hurt ${p.hurtT.toFixed(2)}  tiro ${p.shootT.toFixed(2)}${d.shotPending ? ' (aguarda)' : ''}`,
    `pos ${p.x.toFixed(0)},${p.y.toFixed(0)}  hp ${p.hp}/${p.maxHp}  fps ${d.fps}`, 'F3: ocultar  (somente DEV)',
  ];
  ctx.save(); ctx.font = '12px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(8, 56, 300, 14 * lines.length + 10);
  ctx.fillStyle = '#b6ffb0'; lines.forEach((l, i) => ctx.fillText(l, 14, 72 + i * 14)); ctx.restore();
}
