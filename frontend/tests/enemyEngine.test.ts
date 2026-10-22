// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { Engine } from '../src/game/engine';
import { AI, initAi, type EnemyState } from '../src/game/enemyAI';
import { ENEMIES } from '../src/game/entities';
import type { Assets } from '../src/game/assets';
import type { EnemyKind } from '../src/game/levels/layouts';

class FakeAssets { scenes = new Map(); tiles = new Map(); meta = {}; size() { return { w: 48, h: 40 }; } src() { return null; } has() { return true; } draw() { /* */ } region() { /* */ } }
interface E { id: number; kind: EnemyKind; x: number; y: number; w: number; h: number; vx: number; vy: number; onGround: boolean; hp: number; maxHp: number; dir: 1 | -1; minX: number; maxX: number; baseY: number; t: number; hurt: number; dying: number; chasing: boolean; attacking: number; turnCd: number; state: EnemyState; stateT: number }
interface I {
  update(dt: number): void; enemies: E[]; boss: unknown; pickups: unknown[]; keys: Record<string, boolean>;
  p: { x: number; y: number; w: number; h: number; vx: number; vy: number; hp: number; inv: number; dieT: number; onGround: boolean };
  world: { surfaces: unknown[]; ladders: unknown[] }; damageEnemy(e: E, d: number): void;
}
const KINDS = (Object.keys(AI) as EnemyKind[]).filter((k) => AI[k].attack);

/** Motor real, mas com um chão plano e um único inimigo (deterministicamente testável). */
function arena(kind: EnemyKind): { e: I; en: E } {
  const canvas = document.createElement('canvas');
  (canvas as unknown as { getContext: () => unknown }).getContext = () => new Proxy({}, { get: () => () => ({ addColorStop() { /* */ } }), set: () => true });
  vi.stubGlobal('ResizeObserver', class { observe() { /* */ } disconnect() { /* */ } });
  const e = new Engine(canvas, new FakeAssets() as unknown as Assets, 0, { onWin: () => { /* */ }, onLose: () => { /* */ } }) as unknown as I;
  e.world.surfaces = [{ x: -2000, y: 400, w: 9000, h: 800, kind: 'ground', tile: '', rows: 1, solid: true, top: 400 }];
  e.world.ladders = []; e.pickups = []; e.boss = null;
  const sp = ENEMIES[kind];
  const en = { id: 1, kind, x: 1000, y: 400 - sp.h, w: sp.w, h: sp.h, vx: 0, vy: 0, onGround: true, hp: 99, maxHp: 99, dir: 1 as const, minX: 400, maxX: 1800, baseY: 400, t: 0, hurt: 0, dying: 0, chasing: false, attacking: 0, turnCd: 0, ...initAi(() => 0.5, kind) };
  e.enemies = [en];
  e.p.hp = 9999; e.p.x = 1400; e.p.y = 400 - e.p.h; e.p.vx = 0; e.p.vy = 0;
  return { e, en };
}

describe('IA dos inimigos no motor real', () => {
  it.each(KINDS)('%s: persegue, prepara, golpeia e se recupera, e o golpe só começa dentro do alcance', (k) => {
    const { e, en } = arena(k); const a = AI[k].attack!; const seq: EnemyState[] = []; let gapAtWindup = NaN; let hpBefore = e.p.hp, hurtInRecover = 0;
    for (let i = 0; i < 60 * 8; i++) {
      const prev = en.state; e.p.x = 1400; e.update(1 / 60);
      if (en.state !== prev) { seq.push(en.state); if (en.state === 'windup' && Number.isNaN(gapAtWindup)) gapAtWindup = Math.abs((e.p.x + e.p.w / 2) - (en.x + en.w / 2)) - en.w / 2 - e.p.w / 2; }
      if (en.state === 'recover' && e.p.hp < hpBefore) hurtInRecover++;
      hpBefore = e.p.hp;
    }
    const i0 = seq.indexOf('windup'); expect(i0, 'chegou a atacar').toBeGreaterThan(-1);
    expect(seq.slice(i0, i0 + 3)).toEqual(['windup', 'strike', 'recover']);
    expect(gapAtWindup).toBeLessThanOrEqual(a.range + 8); // 8 px: um quadro de deslocamento
    expect(hurtInRecover, 'inofensivo na recuperação').toBe(0);
    expect(en.y + en.h).toBeCloseTo(400, 0); // nunca afunda nem flutua
  });

  it('inimigo morto fica parado e inofensivo, mesmo com o herói em cima', () => {
    const { e, en } = arena('rat'); en.x = 1380; e.update(1 / 60);
    e.damageEnemy(en, 999); expect(en.state).toBe('dead');
    const hp = e.p.hp; const x = en.x; for (let i = 0; i < 40; i++) e.update(1 / 60);
    expect(e.p.hp).toBe(hp); expect(Math.abs(en.x - x)).toBeLessThan(2);
  });

  it('dano atordoa: o inimigo recua e não ataca durante o atordoamento', () => {
    const { e, en } = arena('mutant'); en.x = 1300; en.state = 'windup'; en.stateT = 0.1; en.dir = 1;
    e.update(1 / 60); e.damageEnemy(en, 1); expect(en.state).toBe('hurt'); const x0 = en.x;
    let sawAttack = false; for (let i = 0; i < 6; i++) { e.update(1 / 60); if (en.state === 'windup' || en.state === 'strike') sawAttack = true; }
    expect(sawAttack).toBe(false); expect(en.x).toBeLessThan(x0); // empurrado para longe do herói (à direita dele)
  });

  it('herói morto: ninguém continua perseguindo nem atacando', () => {
    const { e, en } = arena('rat'); en.x = 1200; for (let i = 0; i < 20; i++) e.update(1 / 60); expect(en.chasing).toBe(true);
    e.p.hp = 0; e.p.dieT = 0.01; const seen = new Set<EnemyState>();
    for (let i = 0; i < 120; i++) { e.p.dieT = 0.5; e.update(1 / 60); seen.add(en.state); }
    expect(en.chasing).toBe(false); expect(seen.has('chase')).toBe(false);
  });
});
