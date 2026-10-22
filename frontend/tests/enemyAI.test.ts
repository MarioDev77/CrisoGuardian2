import { describe, it, expect } from 'vitest';
import { AI, stepGround, stepFlyer, hurt, kill, bump, initAi, type AiEnemy, type EnemyState, type TickCtx } from '../src/game/enemyAI';
import { ENEMIES } from '../src/game/entities';
import type { EnemyKind } from '../src/game/levels/layouts';

const KINDS = Object.keys(AI) as EnemyKind[];
const ATTACKERS = KINDS.filter((k) => AI[k].attack);
const rnd = () => 0.5;
const mk = (kind: EnemyKind, o: Partial<AiEnemy> = {}): AiEnemy => ({ ...initAi(rnd, kind), dir: 1, vx: 0, chasing: false, turnCd: 0, x: 0, w: 60, minX: -2000, maxX: 2000, ...o });
const ctx = (o: Partial<TickCtx> = {}): TickCtx => ({ dt: 1 / 60, speedMul: 1, dx: 200, dy: 0, gap: 140, playerAlive: true, inLeash: true, rand: rnd, ...o });
/** Roda n quadros chamando `f` para montar o contexto; devolve a sequência de estados (sem repetições). */
function run(e: AiEnemy, kind: EnemyKind, n: number, f: (i: number) => Partial<TickCtx> = () => ({})): EnemyState[] {
  const out: EnemyState[] = [];
  for (let i = 0; i < n; i++) { stepGround(e, ENEMIES[kind].speed, AI[kind], ctx(f(i))); if (out[out.length - 1] !== e.state) out.push(e.state); }
  return out;
}

describe('perfis de IA', () => {
  it('todo tipo de inimigo existente tem perfil; voadores não atacam', () => {
    for (const k of Object.keys(ENEMIES)) expect(AI[k as EnemyKind], k).toBeDefined();
    for (const k of KINDS) if (ENEMIES[k].fly) expect(AI[k].attack, k).toBeNull();
  });
  it('quem ataca tem preparação, golpe e recuperação; pesados demoram mais que ágeis', () => {
    for (const k of ATTACKERS) { const a = AI[k].attack!; expect(a.windup, k).toBeGreaterThan(0.05); expect(a.strike, k).toBeGreaterThan(0); expect(a.recover, k).toBeGreaterThan(0.2); expect(a.range, k).toBeGreaterThan(0); }
    expect(AI.mutant.attack!.windup).toBeGreaterThan(AI.rat.attack!.windup * 2);
    expect(AI.mutant.attack!.recover).toBeGreaterThan(AI.rat.attack!.recover * 1.5);
    expect(AI.roach.accel).toBeGreaterThan(AI.mutant.accel * 2);
    expect(AI.rat.chaseMul).toBeGreaterThan(AI.mutant.chaseMul);
  });
});

describe('máquina de estados terrestre', () => {
  it.each(ATTACKERS)('%s: chase → windup → strike → recover, com as durações do perfil', (k) => {
    const a = AI[k].attack!; const e = mk(k);
    const seen: EnemyState[] = [];
    for (let i = 0; i < 600 && !(seen.includes('recover') && e.state !== 'recover'); i++) {
      const prev = e.state; stepGround(e, ENEMIES[k].speed, AI[k], ctx({ dx: i < 20 ? 200 : 40, gap: i < 20 ? 140 : a.range - 1 }));
      if (prev !== e.state) seen.push(e.state);
    }
    expect(seen.slice(0, 4)).toEqual(['chase', 'windup', 'strike', 'recover']);
    // durações: conta quadros em cada estado numa rodada controlada
    const e2 = mk(k, { state: 'windup' }); let n = 0; while (e2.state === 'windup' && n < 600) { stepGround(e2, 70, AI[k], ctx()); n++; }
    expect(n / 60).toBeGreaterThanOrEqual(a.windup - 1 / 60); expect(n / 60).toBeLessThanOrEqual(a.windup + 2 / 60);
  });

  it('não ataca fora do alcance, de costas, nem sem esperar o cooldown', () => {
    const e = mk('rat'); const seen = run(e, 'rat', 180, () => ({ dx: 200, gap: AI.rat.attack!.range + 6 })); // vão fora do alcance
    expect(seen).not.toContain('windup');
    const back = mk('rat', { dir: 1 }); expect(run(back, 'rat', 120, () => ({ dx: -5, gap: 0 }))).not.toContain('windup'); // alvo atrás e sem virar (|dx|<14)
    const cd = mk('rat', { atkCd: 0.5 }); const s2 = run(cd, 'rat', 20, () => ({ dx: 40, gap: 0 })); expect(s2).not.toContain('windup'); // 20 quadros = 0,33 s < 0,5 s
  });

  it('o ataque é compromisso: depois da preparação o golpe sai mesmo que o herói se afaste', () => {
    const e = mk('mutant', { state: 'windup' }); const seen = run(e, 'mutant', 60, () => ({ dx: 400, gap: 300 }));
    expect(seen.slice(0, 2)).toEqual(['windup', 'strike']);
  });

  it('o bote para ao bater na parede; a patrulha vira de direção', () => {
    const s = mk('rat', { state: 'strike' }); bump(s, 'rat', rnd); expect(s.state).toBe('recover'); expect(s.vx).toBe(0);
    const p = mk('rat', { dir: 1 }); bump(p, 'rat', rnd); expect(p.dir).toBe(-1); expect(p.turnCd).toBeGreaterThan(0); expect(p.state).toBe('patrol');
  });

  it('blindado nunca ataca, mas persegue', () => {
    const seen = run(mk('armor'), 'armor', 300, () => ({ dx: 30, gap: 0 }));
    expect(seen).toEqual(['chase']);
  });

  it('jogador morto encerra a perseguição na hora e o ataque não recomeça', () => {
    const e = mk('rat'); run(e, 'rat', 30, () => ({ dx: 150, gap: 90 })); expect(e.state).toBe('chase');
    run(e, 'rat', 1, () => ({ dx: 150, gap: 90, playerAlive: false })); expect(e.state).toBe('patrol'); expect(e.chasing).toBe(false);
    expect(run(e, 'rat', 240, () => ({ dx: 20, gap: 0, playerAlive: false }))).not.toContain('windup');
  });

  it('histerese: no limite do alcance de detecção não liga/desliga a cada quadro', () => {
    const e = mk('rat'); const d = AI.rat.detectX; const seen = run(e, 'rat', 300, (i) => ({ dx: d + (i % 2 ? 6 : -6) }));
    expect(seen.length).toBeLessThanOrEqual(2); // patrol -> chase uma vez
  });

  it('dano atordoa, empurra para longe e depois retoma; nunca ataca atordoado', () => {
    const e = mk('mutant', { state: 'windup' }); hurt(e, 'mutant', -1);
    expect(e.state).toBe('hurt'); expect(e.vx).toBe(-AI.mutant.knock);
    const seen = run(e, 'mutant', 40, () => ({ dx: 30, gap: 0 }));
    expect(seen[0]).toBe('hurt'); expect(seen[1]).toBe('patrol'); expect(Math.abs(e.vx)).toBeLessThan(AI.mutant.knock);
  });

  it('morto permanece morto: sem perseguir nem atacar', () => {
    const e = mk('rat'); kill(e); expect(run(e, 'rat', 300, () => ({ dx: 10, gap: -20 }))).toEqual(['dead']); expect(e.vx).toBe(0);
  });

  it('aceleração: barata chega à velocidade de perseguição bem antes do mutante pesado', () => {
    const t = (k: EnemyKind) => { const e = mk(k, { state: 'chase' }); const goal = ENEMIES[k].speed * AI[k].chaseMul * 0.9; let n = 0;
      while (Math.abs(e.vx) < goal && n < 600) { stepGround(e, ENEMIES[k].speed, AI[k], ctx({ gap: 500, dx: 520 })); n++; } return n / 60; };
    expect(t('roach')).toBeLessThan(t('mutant') / 2);
  });

  it('barata faz arrancadas na patrulha; rato não', () => {
    const peak = (k: EnemyKind) => { const e = mk(k); let m = 0; for (let i = 0; i < 600; i++) { stepGround(e, ENEMIES[k].speed, AI[k], ctx({ dx: 5000, gap: 4000 })); m = Math.max(m, Math.abs(e.vx)); } return m; };
    expect(peak('roach')).toBeGreaterThan(ENEMIES.roach.speed * 1.5); expect(peak('rat')).toBeLessThanOrEqual(ENEMIES.rat.speed + 0.001);
  });

  it('aranha para (idle) ao chegar na ponta da patrulha', () => {
    const e = mk('spider', { x: 205, w: 74, minX: 0, maxX: 200, dir: 1 }); expect(run(e, 'spider', 5, () => ({ dx: 5000, gap: 4000 }))[0]).toBe('idle');
  });
});

describe('voadores', () => {
  it('perseguem com histerese, reagem a dano e nunca entram em estados de ataque', () => {
    const e = mk('bat'); const seen: EnemyState[] = []; const d = AI.bat.detectX;
    for (let i = 0; i < 300; i++) { stepFlyer(e, AI.bat, ctx({ dx: d + (i % 2 ? 8 : -8), dy: 0 })); if (seen[seen.length - 1] !== e.state) seen.push(e.state); }
    expect(seen.length).toBeLessThanOrEqual(2);
    hurt(e, 'bat', 1); stepFlyer(e, AI.bat, ctx()); expect(e.state).toBe('hurt');
    for (const s of seen) expect(['patrol', 'chase']).toContain(s);
  });
});
