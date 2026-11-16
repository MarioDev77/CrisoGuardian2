import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PlayerAnim, type AnimInput } from '../src/game/playerAnim';

/** Atlas que o jogo realmente carrega em tempo de execução. */
const atlas = JSON.parse(readFileSync(join(__dirname, '../public/assets/game/atlas.json'), 'utf8')) as Record<string, unknown>;

describe('animação do Crisoman', () => {
  it('nenhuma pose que a máquina de animação pode emitir está faltando no atlas do jogo (atlas.json)', () => {
    const used = new Set<string>(); const base: AnimInput = { t: 0, onGround: true, vx: 0, vy: 0, climbing: false, climbMoving: false, dead: false, dieT: 0, hurtT: 0, landT: 0, collectT: 0, shootT: 9, specialT: 9, interactT: 0, victory: false };
    const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const a = new PlayerAnim(); const st = { ...base };
    for (let i = 0; i < 20000; i++) {
      st.t += 1 / 60; if (i % 90 === 0) { st.onGround = rnd() > 0.4; st.vx = (rnd() - 0.5) * 900; st.vy = (rnd() - 0.5) * 1800; st.hurtT = rnd() > 0.9 ? 0.45 : 0; st.landT = rnd() > 0.8 ? 0.2 : 0; st.shootT = rnd() > 0.7 ? 0 : 9; st.interactT = rnd() > 0.9 ? 0.45 : 0; st.victory = rnd() > 0.95; st.climbing = rnd() > 0.93; st.specialT = rnd() > 0.95 ? 0 : 9; }
      st.hurtT = Math.max(0, st.hurtT - 1 / 60); st.landT = Math.max(0, st.landT - 1 / 60); st.shootT += 1 / 60; st.specialT += 1 / 60; st.interactT = Math.max(0, st.interactT - 1 / 60);
      used.add(a.update({ ...st }).name);
    }
    const dead = new PlayerAnim(); for (let i = 0; i < 90; i++) used.add(dead.update({ ...base, t: i / 60, dead: true, dieT: i / 60 }).name);
    for (const n of used) expect(atlas[n], n).toBeDefined();
    expect(used.size).toBeGreaterThan(25);
  });
});
