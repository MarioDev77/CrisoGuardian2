import { describe, it, expect } from 'vitest';
import { PlayerAnim, type AnimInput, ATTACK_FIRE_T } from '../src/game/playerAnim';

const base = (): AnimInput => ({ t: 0, onGround: true, vx: 0, vy: 0, climbing: false, climbMoving: false, dead: false, dieT: 0, hurtT: 0, landT: 0, collectT: 0, shootT: 9, specialT: 9, interactT: 0, victory: false });
/** Roda o controlador por `secs` segundos em passos de `dt`, aplicando `patch` a cada passo. */
function run(a: PlayerAnim, st: AnimInput, secs: number, dt: number, patch: (s: AnimInput) => void = () => {}) {
  const seen: string[] = [];
  for (let n = 0; n < Math.round(secs / dt); n++) { st.t += dt; patch(st); seen.push(a.update({ ...st }).state); }
  return seen;
}

describe('PlayerAnim', () => {
  it('parado fica em idle e nunca usa quadros de corrida', () => {
    const a = new PlayerAnim(); const st = base(); const out: string[] = [];
    for (let n = 0; n < 120; n++) { st.t += 1 / 60; out.push(a.update({ ...st }).name); }
    expect(out.every((n) => n.startsWith('p_idle_'))).toBe(true);
  });

  it('andar e correr têm histerese: não pisca perto do limiar', () => {
    const a = new PlayerAnim(); const st = base();
    const seen = run(a, st, 2, 1 / 60, (s) => { s.vx = 280 + Math.sin(s.t * 40) * 12; }); // oscila ao redor de 285
    let flips = 0; for (let i = 1; i < seen.length; i++) if (seen[i] !== seen[i - 1]) flips++;
    expect(flips).toBeLessThanOrEqual(2);
  });

  it('salto: jumpStart -> jumpRise -> jumpApex -> fall -> landing, sem repetir o salto no ar', () => {
    const a = new PlayerAnim(); const st = base(); let vy = -980; const seen: string[] = [];
    st.onGround = false;
    for (let n = 0; n < 200; n++) {
      st.t += 1 / 60; vy += 2400 / 60; st.vy = vy;
      if (vy > 700) { st.onGround = true; st.vy = 0; st.landT = 0.2; }
      const s = a.update({ ...st }).state; if (seen[seen.length - 1] !== s) seen.push(s);
      if (st.onGround) st.landT = Math.max(0, st.landT - 1 / 60);
    }
    expect(seen.slice(0, 5)).toEqual(['jumpStart', 'jumpRise', 'jumpApex', 'fall', 'landing']);
    expect(seen.filter((s) => s === 'jumpStart')).toHaveLength(1);
  });

  it('sair de uma borda sem pular vai direto para fall (sem jumpStart)', () => {
    const a = new PlayerAnim(); const st = base(); st.onGround = false; st.vy = 60;
    expect(run(a, st, 0.2, 1 / 60, (s) => { s.vy += 40; })[0]).toBe('fall');
  });

  it('ataque percorre start -> attack -> recovery nos tempos do tiro', () => {
    const a = new PlayerAnim(); const st = base(); st.shootT = 0; const seen: string[] = [];
    for (let n = 0; n < 24; n++) { st.t += 1 / 60; st.shootT += 1 / 60; const s = a.update({ ...st }).state; if (seen[seen.length - 1] !== s) seen.push(s); }
    expect(seen).toEqual(['attackStart', 'attack', 'attackRecovery', 'idle']);
    expect(ATTACK_FIRE_T).toBeGreaterThan(0);
  });

  it('dano toca até o fim e tem prioridade sobre movimento', () => {
    const a = new PlayerAnim(); const st = base(); st.hurtT = 0.45; st.vx = 300; const names: string[] = [];
    for (let n = 0; n < 27; n++) { st.t += 1 / 60; st.hurtT = Math.max(0, st.hurtT - 1 / 60); const o = a.update({ ...st }); if (st.hurtT > 0) names.push(o.name); }
    expect(names[0]).toBe('p_hurt_0'); expect(names.every((n) => n.startsWith('p_hurt_'))).toBe(true);
  });

  it('morte é terminal: não reinicia nem sai do estado', () => {
    const a = new PlayerAnim(); const st = base(); st.dead = true; st.dieT = 0.001;
    const seen: string[] = [];
    for (let n = 0; n < 120; n++) { st.t += 1 / 60; st.dieT += 1 / 60; if (n > 60) { st.dead = false; st.onGround = true; st.hurtT = 0.3; } seen.push(a.update({ ...st }).name); }
    expect(new Set(seen.map((n) => n.slice(0, 5)))).toEqual(new Set(['p_die']));
    expect(seen[seen.length - 1]).toBe('p_die_2');
    a.reset(); expect(a.update({ ...base(), t: 0 }).state).toBe('idle');
  });

  it('a velocidade da animação independe da taxa de quadros (30 x 144 fps)', () => {
    const count = (fps: number) => { const a = new PlayerAnim(); const st = base(); st.vx = 150; const names = new Set<string>(); const dt = 1 / fps;
      for (let n = 0; n < fps; n++) { st.t += dt; names.add(a.update({ ...st }).name); } return names.size; };
    expect(count(30)).toBe(5); expect(count(144)).toBe(5);
  });

  it('pausa (relógio parado) congela a animação', () => {
    const a = new PlayerAnim(); const st = base(); st.vx = 150; run(a, st, 0.3, 1 / 60);
    const n1 = a.update({ ...st }).name; for (let i = 0; i < 50; i++) expect(a.update({ ...st }).name).toBe(n1);
  });

  it('subir escada parado congela o quadro', () => {
    const a = new PlayerAnim(); const st = base(); st.climbing = true; st.climbMoving = true; run(a, st, 0.3, 1 / 60);
    st.climbMoving = false; const n1 = a.update({ ...st }).name; run(a, st, 0.5, 1 / 60); expect(a.update({ ...st }).name).toBe(n1);
  });
});
