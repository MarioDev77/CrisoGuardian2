import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PlayerAnim, type AnimInput } from '../src/game/playerAnim';

const DIR = join(__dirname, '../public/assets/sprites/crisoman');
const meta = JSON.parse(readFileSync(join(DIR, 'crisoman.json'), 'utf8')) as {
  cell: { w: number; h: number }; origin: { x: number; y: number }; image: string;
  frames: Record<string, { x: number; y: number; w: number; h: number; ax: number; ay: number; file: string; anim: string }>;
  animations: Record<string, { sheet: string; frames: string[] }>;
  states: Record<string, { frames: string[]; status: string; pending?: boolean }>;
  pending: { state: string }[];
};
/** Lê largura, altura e tipo de cor do cabeçalho IHDR de um PNG. */
const png = (p: string) => { const b = readFileSync(p); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] }; };

describe('spritesheet normalizado do Crisoman', () => {
  it('todos os quadros são PNG RGBA do mesmo tamanho, com a mesma origem (pés)', () => {
    const names = Object.keys(meta.frames); expect(names.length).toBe(40);
    for (const n of names) {
      const f = meta.frames[n]!; const info = png(join(DIR, f.file));
      expect(info, n).toEqual({ w: meta.cell.w, h: meta.cell.h, colorType: 6 });
      expect([f.w, f.h, f.ax, f.ay], n).toEqual([meta.cell.w, meta.cell.h, meta.origin.x, meta.origin.y]);
    }
  });
  it('a folha de execução e as folhas por animação existem e cobrem todos os quadros', () => {
    const sheet = png(join(DIR, meta.image)); expect(sheet.colorType).toBe(6);
    for (const f of Object.values(meta.frames)) { expect(f.x + f.w).toBeLessThanOrEqual(sheet.w); expect(f.y + f.h).toBeLessThanOrEqual(sheet.h); }
    let total = 0;
    for (const [a, v] of Object.entries(meta.animations)) { expect(existsSync(join(DIR, v.sheet)), a).toBe(true); expect(png(join(DIR, v.sheet)).w).toBe(meta.cell.w * v.frames.length); total += v.frames.length; }
    expect(total).toBe(40);
  });
  it('nenhuma pose que a máquina de animação pode emitir está faltando nos metadados', () => {
    const used = new Set<string>(); const base: AnimInput = { t: 0, onGround: true, vx: 0, vy: 0, climbing: false, climbMoving: false, dead: false, dieT: 0, hurtT: 0, landT: 0, shootT: 9, specialT: 9, interactT: 0, victory: false };
    const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const a = new PlayerAnim(); const st = { ...base };
    for (let i = 0; i < 20000; i++) {
      st.t += 1 / 60; if (i % 90 === 0) { st.onGround = rnd() > 0.4; st.vx = (rnd() - 0.5) * 900; st.vy = (rnd() - 0.5) * 1800; st.hurtT = rnd() > 0.9 ? 0.45 : 0; st.landT = rnd() > 0.8 ? 0.2 : 0; st.shootT = rnd() > 0.7 ? 0 : 9; st.interactT = rnd() > 0.9 ? 0.45 : 0; st.victory = rnd() > 0.95; st.climbing = rnd() > 0.93; st.specialT = rnd() > 0.95 ? 0 : 9; }
      st.hurtT = Math.max(0, st.hurtT - 1 / 60); st.landT = Math.max(0, st.landT - 1 / 60); st.shootT += 1 / 60; st.specialT += 1 / 60; st.interactT = Math.max(0, st.interactT - 1 / 60);
      used.add(a.update({ ...st }).name);
    }
    const dead = new PlayerAnim(); for (let i = 0; i < 90; i++) used.add(dead.update({ ...base, t: i / 60, dead: true, dieT: i / 60 }).name);
    for (const n of used) expect(meta.frames[n], n).toBeDefined();
    expect(used.size).toBeGreaterThan(25);
  });
  it('os 15 estados pedidos existem e só referenciam quadros reais; pendências estão documentadas', () => {
    const required = ['idle', 'walk', 'run', 'jumpStart', 'jumpRise', 'jumpApex', 'fall', 'landing', 'attackStart', 'attack', 'attackRecovery', 'hurt', 'death', 'victory', 'interact'];
    for (const s of required) { const v = meta.states[s]; expect(v, s).toBeDefined(); for (const f of v!.frames) expect(meta.frames[f], `${s}:${f}`).toBeDefined(); }
    const pend = meta.pending.map((p) => p.state); expect(pend).toContain('victory'); expect(pend).toContain('interact');
    for (const [s, v] of Object.entries(meta.states)) if (v.status === 'borrowed') expect(v.pending, s).toBe(true);
  });
});
