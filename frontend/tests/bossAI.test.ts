import { describe, it, expect } from 'vitest';
import { PHASES, PHASE_TIME, AIM_LOCK, WALL_STUN, phaseFor, onDamaged, stepBoss, pickAttack, kill, bossHarmful, initBoss, type BossAi, type BossCtx, type BossState } from '../src/game/bossAI';

function rng(seed: number) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const mk = (o: Partial<BossAi> = {}, rand = rng(1)): BossAi => ({ ...initBoss(rand), dir: -1, vx: 0, vy: 0, onGround: true, x: 1000, y: 220, w: 120, h: 180, hp: 28, maxHp: 28, ...o });
const ctx = (o: Partial<BossCtx> = {}): BossCtx => ({ dt: 1 / 60, dx: -300, playerAlive: true, blocked: false, rand: rng(2), ...o });
/** Roda o chefão simulando chão: o salto cai sozinho depois de 0,9 s. */
function sim(b: BossAi, secs: number, f: (b: BossAi, i: number) => Partial<BossCtx> = () => ({}), rand = rng(3)) {
  const seq: BossState[] = []; const events: ReturnType<typeof stepBoss> = []; let airT = 0;
  for (let i = 0; i < Math.round(secs * 60); i++) {
    if (b.state === 'leap') { airT += 1 / 60; b.onGround = airT > 0.9; } else { airT = 0; b.onGround = true; }
    events.push(...stepBoss(b, ctx({ rand, ...f(b, i) }))); if (seq[seq.length - 1] !== b.state) seq.push(b.state);
  }
  return { seq, events };
}

describe('fases', () => {
  it('limiares de vida: >66% fase 1, >33% fase 2, resto fase 3', () => {
    expect([phaseFor(28, 28), phaseFor(19, 28), phaseFor(18, 28), phaseFor(10, 28), phaseFor(9, 28), phaseFor(1, 28)]).toEqual([1, 1, 2, 2, 3, 3]);
  });
  it('cruzar o limiar inicia a transição: ruge, cancela o ataque e fica parado por 1,4 s', () => {
    const b = mk({ state: 'charge', atk: 'charge', vx: 270 }); b.hp = 18; const ev = onDamaged(b);
    expect(b.state).toBe('phase'); expect(b.phase).toBe(2); expect(b.vx).toBe(0); expect(b.atk).toBeNull();
    expect(ev.some((e) => e.type === 'roar')).toBe(true); expect(ev.some((e) => e.type === 'say')).toBe(true);
    const { seq } = sim(b, PHASE_TIME + 0.2); expect(seq).toEqual(['phase', 'idle']);
  });
  it('golpe forte que pula uma fase leva direto à fase certa; a fase nunca volta atrás', () => {
    const b = mk(); b.hp = 8; onDamaged(b); expect(b.phase).toBe(3);
    b.hp = 25; expect(onDamaged(b)).toEqual([]); expect(b.phase).toBe(3);
  });
  it('morto não muda de fase nem age', () => {
    const b = mk(); kill(b); b.hp = 0; expect(onDamaged(b)).toEqual([]); expect(sim(b, 3, () => ({ dx: 10 })).seq).toEqual(['dead']);
  });
  it('fases ficam mais rápidas e agressivas', () => {
    for (const a of ['charge', 'leap', 'spit'] as const) { expect(PHASES[2].windup[a]).toBeLessThan(PHASES[1].windup[a]); expect(PHASES[3].windup[a]).toBeLessThan(PHASES[2].windup[a]); }
    expect(PHASES[3].walk).toBeGreaterThan(PHASES[1].walk); expect(PHASES[3].slamBlobs.length).toBeGreaterThan(PHASES[1].slamBlobs.length);
    expect(PHASES[1].spit).toBeNull(); expect(PHASES[2].spit!.count).toBeLessThan(PHASES[3].spit!.count);
  });
});

describe('ataques', () => {
  it('toda transição é legal: sempre há aviso antes da ação e recuperação depois (3 fases, 5 min simulados)', () => {
    const ok: Record<BossState, BossState[]> = { idle: ['windup', 'phase', 'dead'], windup: ['charge', 'leap', 'spit', 'phase', 'dead'], charge: ['recover', 'phase', 'dead'], leap: ['recover', 'phase', 'dead'], spit: ['recover', 'phase', 'dead'], recover: ['idle', 'phase', 'dead'], phase: ['idle', 'dead'], dead: [] };
    for (const phase of [1, 2, 3] as const) {
      const b = mk({ phase }); const rand = rng(10 + phase); let prev = b.state; let bad = '';
      for (let i = 0; i < 60 * 300; i++) {
        let air = 0; void air;
        if (b.state === 'leap') b.onGround = b.stateT > 0.9; else b.onGround = true;
        stepBoss(b, ctx({ rand, dx: -200 + 400 * rand(), blocked: b.state === 'charge' && rand() < 0.01 }));
        if (b.state !== prev) { if (!ok[prev].includes(b.state)) bad ||= `${prev}->${b.state}`; prev = b.state; }
      }
      expect(bad, `fase ${phase}`).toBe('');
    }
  });

  it('o aviso dura o tempo do perfil e o ataque vem depois dele', () => {
    const b = mk({ cd: 0 }); let n = 0, started = false;
    for (let i = 0; i < 600; i++) { stepBoss(b, ctx({ dx: -150 })); if (b.state === 'windup') { started = true; n++; } else if (started) break; }
    const t = PHASES[1].windup[b.lastAtk!]; expect(n / 60).toBeGreaterThanOrEqual(t - 1 / 60); expect(n / 60).toBeLessThanOrEqual(t + 2 / 60);
  });

  it('o alvo acompanha o herói e trava um instante antes do ataque', () => {
    const b = mk({ cd: 0, x: 1000 }); const cx = 1060; let lastAim = NaN; let locked: number[] = [];
    for (let i = 0; i < 90 && b.state !== 'charge' && b.state !== 'leap'; i++) {
      const px = 300 + i * 10; stepBoss(b, ctx({ dx: px - cx }));
      if (b.state === 'windup') { const t = PHASES[1].windup[b.atk!]; if (b.stateT < t - AIM_LOCK - 1 / 30) lastAim = b.aimX; else locked.push(b.aimX); }
    }
    expect(Number.isNaN(lastAim)).toBe(false); expect(new Set(locked.map((x) => Math.round(x))).size).toBeLessThanOrEqual(2); // praticamente travado
  });

  it('salto: sai em direção ao alvo (limitado a 420 px/s) e a pancada cria as poças da fase', () => {
    for (const phase of [1, 3] as const) {
      const b = mk({ phase, state: 'windup', atk: 'leap', aimX: 5000, x: 1000 }); b.stateT = PHASES[phase].windup.leap;
      stepBoss(b, ctx({ dx: 4000 })); expect(b.state).toBe('leap'); expect(b.vy).toBe(-1100); expect(b.vx).toBe(420);
      const { events } = sim(b, 2); const slam = events.find((e) => e.type === 'slam'); expect(slam).toBeDefined();
      expect(slam && slam.type === 'slam' ? slam.vx : []).toEqual(PHASES[phase].slamBlobs);
    }
  });

  it('investida que bate na parede termina atordoada (recuperação mais longa)', () => {
    const b = mk({ state: 'charge', atk: 'charge', dir: -1 }); stepBoss(b, ctx({ blocked: true }));
    expect(b.state).toBe('recover'); expect(b.stateT).toBe(-WALL_STUN);
    const free = mk({ state: 'charge', atk: 'charge' }); for (let i = 0; i < 60 * 2; i++) stepBoss(free, ctx()); expect(free.state).not.toBe('charge');
  });

  it('cuspe só existe a partir da fase 2 e solta a quantidade de poças da fase, espaçadas', () => {
    const picks = (phase: 1 | 2 | 3) => { const r = rng(5), got = new Set<string>(); for (let i = 0; i < 400; i++) got.add(pickAttack(mk({ phase }), 400, r)); return got; };
    expect(picks(1).has('spit')).toBe(false); expect(picks(2).has('spit')).toBe(true);
    for (const phase of [2, 3] as const) {
      const b = mk({ phase, state: 'windup', atk: 'spit', dir: -1 }); b.stateT = PHASES[phase].windup.spit;
      const { events } = sim(b, 3); const spits = events.filter((e) => e.type === 'spit');
      expect(spits.length).toBe(PHASES[phase].spit!.count); for (const s of spits) if (s.type === 'spit') expect(Math.sign(s.vx)).toBe(-1);
    }
  });

  it('nunca repete o mesmo ataque mais de duas vezes seguidas', () => {
    const r = rng(9); const b = mk({ phase: 2 }); const seq: string[] = [];
    for (let i = 0; i < 2000; i++) { const a = pickAttack(b, 100 + 500 * r(), r); b.streak = a === b.lastAtk ? b.streak + 1 : 1; b.lastAtk = a; seq.push(a); }
    let run = 1, max = 1; for (let i = 1; i < seq.length; i++) { run = seq[i] === seq[i - 1] ? run + 1 : 1; max = Math.max(max, run); }
    expect(max).toBeLessThanOrEqual(2);
  });

  it('combos só existem na fase 3 e encurtam o aviso do ataque seguinte', () => {
    const combos = (phase: 1 | 2 | 3) => { const b = mk({ phase }); let n = 0; const r = rng(21); for (let i = 0; i < 60 * 120; i++) { if (b.state === 'leap') b.onGround = b.stateT > 0.9; stepBoss(b, ctx({ rand: r, dx: -250 })); if (b.combo && b.state === 'idle' && b.stateT === 0) n++; } return n; };
    expect(combos(1)).toBe(0); expect(combos(2)).toBe(0); expect(combos(3)).toBeGreaterThan(0);
  });

  it('herói morto: não inicia ataque novo', () => {
    const b = mk({ cd: 0 }); expect(sim(b, 3, () => ({ playerAlive: false })).seq).toEqual(['idle']);
  });

  it('o toque não machuca na recuperação, na transição nem morto', () => {
    expect(bossHarmful('recover')).toBe(false); expect(bossHarmful('phase')).toBe(false); expect(bossHarmful('dead')).toBe(false);
    for (const s of ['idle', 'windup', 'charge', 'leap', 'spit'] as const) expect(bossHarmful(s)).toBe(true);
  });
});
