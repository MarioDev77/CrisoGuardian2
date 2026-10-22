// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { Engine } from '../src/game/engine';
import { PHASES, type BossAttack, type BossPhase, type BossState } from '../src/game/bossAI';
import type { Assets } from '../src/game/assets';

class FakeAssets { scenes = new Map(); tiles = new Map(); meta = {}; size() { return { w: 48, h: 40 }; } src() { return null; } has() { return true; } draw() { /* */ } region() { /* */ } }
interface B { x: number; y: number; w: number; h: number; vx: number; vy: number; onGround: boolean; hp: number; maxHp: number; dir: 1 | -1; hurt: number; dying: number; active: boolean; state: BossState; stateT: number; cd: number; phase: BossPhase; atk: BossAttack | null; combo: boolean }
interface I {
  update(dt: number): void; boss: B | null; enemies: unknown[]; pickups: unknown[]; sludge: { x: number; vx: number; life: number }[]; ended: boolean;
  p: { x: number; y: number; w: number; h: number; vx: number; vy: number; hp: number; inv: number; dieT: number; onGround: boolean; shield: number; facing: number };
  world: { width: number; surfaces: unknown[]; ladders: unknown[] }; damageBoss(d: number, src?: 'shot' | 'blast' | 'stomp' | 'shield'): void;
}
function arena(): { e: I; b: B } {
  const canvas = document.createElement('canvas');
  (canvas as unknown as { getContext: () => unknown }).getContext = () => new Proxy({}, { get: () => () => ({ addColorStop() { /* */ } }), set: () => true });
  vi.stubGlobal('ResizeObserver', class { observe() { /* */ } disconnect() { /* */ } });
  let e: I | null = null;
  for (let lvl = 0; lvl < 8 && !e?.boss; lvl++) e = new Engine(canvas, new FakeAssets() as unknown as Assets, lvl, { onWin: () => { /* */ }, onLose: () => { /* */ } }) as unknown as I;
  if (!e || !e.boss) throw new Error('nenhuma fase com chefão');
  const W = e.world.width;
  e.world.surfaces = [{ x: -2000, y: 400, w: W + 4000, h: 800, kind: 'ground', tile: '', rows: 1, solid: true, top: 400 }];
  e.world.ladders = []; e.pickups = []; e.enemies = [];
  const b = e.boss; b.x = W - 700; b.y = 400 - b.h; b.active = true; b.cd = 0.2;
  e.p.hp = 99999; e.p.x = W - 1100; e.p.y = 400 - e.p.h; e.p.vx = 0; e.p.vy = 0;
  return { e, b };
}
const states = (e: I, b: B, secs: number, pin = true) => { const out: BossState[] = []; for (let i = 0; i < secs * 60; i++) { if (pin) { e.p.hp = 99999; e.p.inv = 9; } e.update(1 / 60); if (out[out.length - 1] !== b.state) out.push(b.state); } return out; };

describe('chefão no motor real', () => {
  it('existe uma fase com chefão e ele começa na fase 1, ativo só perto do herói', () => {
    const { b } = arena(); expect(b.phase).toBe(1); expect(b.maxHp).toBeGreaterThan(0);
  });

  it('ataca sempre com aviso: nunca vai de idle direto para investida/salto/cuspe', () => {
    const { e, b } = arena(); const seq = states(e, b, 40); const bad: string[] = [];
    for (let i = 1; i < seq.length; i++) if (['charge', 'leap', 'spit'].includes(seq[i]!) && seq[i - 1] !== 'windup') bad.push(`${seq[i - 1]}->${seq[i]}`);
    expect(bad).toEqual([]); expect(seq).toContain('windup'); expect(seq).toContain('recover');
  });

  it('transição de fase: invulnerável, sem dano duplicado, e fases na ordem 1 → 2 → 3', () => {
    const { e, b } = arena(); b.cd = 99;
    e.damageBoss(1); const afterShot = b.hp; e.damageBoss(2, 'stomp'); expect(b.hp).toBe(afterShot); // pisão colado num tiro: dentro da janela de 0,16 s, não conta de novo
    b.hurt = 0; e.damageBoss(2, 'stomp'); e.damageBoss(2, 'stomp'); expect(afterShot - b.hp).toBe(2); // pisão duplicado no mesmo contato: só um conta
    b.hp = Math.floor(b.maxHp * 0.6); b.hurt = 0; e.damageBoss(1); expect(b.state).toBe('phase'); expect(b.phase).toBe(2);
    const hp = b.hp; e.damageBoss(5); e.damageBoss(5, 'blast'); expect(b.hp).toBe(hp); // invulnerável na transição
    states(e, b, 1.6); expect(b.state).not.toBe('phase');
    b.hp = Math.floor(b.maxHp * 0.3); b.hurt = 0; e.damageBoss(1); expect(b.phase).toBe(3);
  });

  it('o toque não machuca na recuperação, mas machuca fora dela', () => {
    const { e, b } = arena(); b.cd = 99; b.state = 'recover'; b.stateT = -60; b.atk = 'charge';
    e.p.x = b.x + 30; e.p.y = 400 - e.p.h; e.p.hp = 50; e.p.inv = 0;
    for (let i = 0; i < 20; i++) { e.p.inv = 0; e.p.x = b.x + 30; e.update(1 / 60); }
    expect(e.p.hp).toBe(50);
    b.state = 'idle'; b.stateT = 0; b.cd = 99; e.p.inv = 0; e.p.x = b.x + 30; e.update(1 / 60); expect(e.p.hp).toBeLessThan(50);
  });

  it('cuspe da fase 2 cria poças em direção ao herói; pancada da fase 3 cria 4 poças', () => {
    const { e, b } = arena(); b.phase = 2; b.state = 'windup'; b.atk = 'spit'; b.stateT = 0; b.cd = 99;
    let seen = 0, dirOk = true;
    for (let i = 0; i < 60 * 3; i++) { e.p.hp = 99999; e.p.inv = 9; e.update(1 / 60); seen = Math.max(seen, e.sludge.length); if (e.sludge.some((s) => s.vx > 0)) dirOk = false; }
    expect(seen).toBeGreaterThanOrEqual(2); expect(dirOk).toBe(true); // o herói está à esquerda: todas as poças vão para a esquerda
    const r = arena(); r.b.phase = 3; r.b.state = 'windup'; r.b.atk = 'leap'; r.b.stateT = 0; r.b.cd = 99; r.e.sludge = [];
    let maxBlobs = 0; for (let i = 0; i < 60 * 3; i++) { r.e.p.hp = 99999; r.e.p.inv = 9; r.e.update(1 / 60); maxBlobs = Math.max(maxBlobs, r.e.sludge.length); }
    expect(maxBlobs).toBeGreaterThanOrEqual(PHASES[3].slamBlobs.length - 1);
  });

  it('chefão derrotado: limpa as poças, fica parado e não machuca', () => {
    const { e, b } = arena(); e.sludge = [{ x: 1, vx: 1, life: 9 }]; e.damageBoss(9999, 'blast');
    expect(b.state).toBe('dead'); expect(e.sludge).toEqual([]);
    e.p.x = b.x + 30; e.p.hp = 50; e.p.inv = 0; for (let i = 0; i < 60; i++) { e.p.inv = 0; e.update(1 / 60); } expect(e.p.hp).toBe(50);
  });

  it('a investida respeita a arena: nunca sai da fase nem fica enterrado', () => {
    const { e, b } = arena(); let worstX = 0; b.x = e.world.width - 200; b.phase = 3; b.cd = 0;
    for (let i = 0; i < 60 * 30; i++) { e.p.hp = 99999; e.p.inv = 9; e.p.x = e.world.width - 1400; e.update(1 / 60); worstX = Math.max(worstX, b.x + b.w - e.world.width); if (b.y + b.h > 401) throw new Error('afundou no chão'); }
    expect(worstX).toBeLessThanOrEqual(0.01); expect(b.x).toBeGreaterThanOrEqual(e.world.width - 1500 - 0.01);
  });

  it('luta completa (bot invencível atirando): passa pelas 3 fases, termina e nenhum estado trava', () => {
    const { e, b } = arena(); const phases = new Set<number>(); let t = 0, stuck = 0, last: BossState = b.state, worst = 0, killedAt = -1;
    const e2 = e as unknown as { keys: Record<string, boolean> }; const st = () => b.state as BossState;
    for (let i = 0; i < 60 * 240 && st() !== 'dead'; i++) {
      e.p.hp = 99999; e.p.inv = 9; e.p.x = Math.max(b.x - 360, e.world.width - 1480); e.p.facing = 1; e2.keys.shoot = true;
      e.update(1 / 60); t += 1 / 60; phases.add(b.phase);
      if (b.state === last) { stuck += 1 / 60; worst = Math.max(worst, stuck); } else { stuck = 0; last = b.state; }
      if (st() === 'dead' && killedAt < 0) killedAt = t;
    }
    expect([...phases].sort()).toEqual([1, 2, 3]); expect(b.state).toBe('dead'); expect(killedAt).toBeLessThan(200);
    expect(worst, 'maior tempo seguido no mesmo estado (s)').toBeLessThan(8); // idle com cooldown de 2,4 s e recuperação de 0,9 s: folga larga
  });
});
