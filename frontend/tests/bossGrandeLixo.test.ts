import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { grandeLixoPose, projectileFrame, GRANDE_LIXO_LEVEL } from '../src/game/bossAnim';
import { layouts } from '../src/game/levels/layouts';

const base = { state: 'idle' as const, stateT: 0.2, atk: null, hurt: 0, dying: 0, vx: 0, t: 1, windup: 0.6 };
describe('chefão da fase 16 — O Grande Lixo', () => {
  it('é o chefe da última fase', () => { expect(layouts[GRANDE_LIXO_LEVEL]!.boss).toBe(true); expect(layouts[GRANDE_LIXO_LEVEL]!.name).toMatch(/Guardião/); });
  it('quadros individuais RGBA, todas as animações e projéteis', () => {
    const meta = JSON.parse(fs.readFileSync('public/assets/characters/grande_lixo/sprites.json', 'utf8'));
    const need: Record<string, number> = { idle: 4, walk: 8, attack: 6, hurt: 5, death: 5, proj: 5 };
    for (const [a, n] of Object.entries(need)) {
      expect(meta.animations[a].frames, a).toHaveLength(n);
      for (const f of meta.animations[a].frames) { const b = fs.readFileSync(`public/assets/characters/grande_lixo/${a}/${f}.png`); expect(b.readUInt8(25)).toBe(6); expect(b.readUInt32BE(16)).toBe(meta.cell.w); }
    }
  });
  it('escolhe a pose certa por estado, sempre com quadros que existem', () => {
    const meta = JSON.parse(fs.readFileSync('public/assets/characters/grande_lixo/sprites.json', 'utf8'));
    const states = ['idle', 'windup', 'charge', 'leap', 'spit', 'recover', 'phase', 'dead'] as const;
    for (const state of states) for (const hurt of [0, 0.1]) for (const stateT of [0, 0.3, 2]) {
      const p = grandeLixoPose({ ...base, state, hurt, stateT, dying: state === 'dead' ? -1 : 0, vx: state === 'idle' ? 50 : 0 });
      const an = meta.animations[p.anim]; expect(an, `${state}/${p.anim}`).toBeDefined();
      const idx = an.loop ? ((p.index % an.frames.length) + an.frames.length) % an.frames.length : Math.min(p.index, an.frames.length - 1); expect(an.frames[idx]).toBeTruthy();
    }
    expect(grandeLixoPose({ ...base, state: 'dead', dying: 1.6 }).index).toBe(0); expect(grandeLixoPose({ ...base, state: 'dead', dying: -1 }).anim).toBe('death');
    expect(grandeLixoPose({ ...base, state: 'idle', vx: 40 }).anim).toBe('walk'); expect(grandeLixoPose({ ...base, state: 'charge' }).anim).toBe('walk');
    expect(grandeLixoPose({ ...base, hurt: 0.1 }).anim).toBe('hurt');
  });
  it('projétil de lixo usa só os 4 itens (a bola de lodo é o quadro 4)', () => { for (let i = -50; i < 200; i++) expect(projectileFrame(i * 13.7)).toBeLessThan(4); });
});
