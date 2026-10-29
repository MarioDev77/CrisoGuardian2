/**
 * IA dos inimigos: máquina de estados + perfil de comportamento por tipo.
 *
 * Estados: idle · patrol · chase · windup (preparação) · strike (golpe ativo) · recover (recuperação) · hurt · dead.
 *
 * Regras:
 *  - Só um estado por vez; cada estado tem duração própria, então ninguém alterna de estado a cada quadro.
 *  - A perseguição tem histerese: começa dentro do alcance de detecção e só termina em `detect * releaseMul`.
 *  - O ataque só começa dentro do alcance de ataque (vão entre as bordas), com o alvo à frente e vivo. Depois
 *    de iniciado, é um compromisso: preparação (visível) → golpe (bote + área de dano à frente) → recuperação
 *    (o bicho fica exposto e inofensivo) → tempo de espera antes do próximo ataque.
 *  - Voadores não atacam: só patrulham, perseguem e reagem a dano.
 *  - Morto (`dead`) nunca volta a agir; jogador morto encerra a perseguição.
 *
 * O módulo é puro: calcula a velocidade desejada e o estado; quem aplica o movimento e a colisão é o motor.
 */
import type { EnemyKind } from './levels/layouts';

export type EnemyState = 'idle' | 'patrol' | 'chase' | 'windup' | 'strike' | 'recover' | 'hurt' | 'dead';

export interface AttackSpec {
  /** Vão máximo (px) entre as bordas do bicho e do herói para iniciar o ataque. */
  range: number;
  /** Diferença vertical máxima (px) entre os centros. */
  dy: number;
  windup: number; strike: number; recover: number; cooldown: number;
  /** Velocidade do bote (px/s) durante o golpe. */
  lunge: number;
  /** Alcance extra (px) da área de dano à frente do corpo durante o golpe. */
  reach: number;
}

export interface AiProfile {
  /** Alcance de detecção (px, centro a centro). */
  detectX: number; detectY: number;
  /** Histerese: a perseguição só termina em detect * releaseMul. */
  releaseMul: number;
  /** Velocidade de perseguição relativa à de patrulha. */
  chaseMul: number;
  /** Aceleração horizontal (px/s²): baixa = pesado, alta = ágil. */
  accel: number;
  attack: AttackSpec | null;
  /** Tempo (s) de atordoamento ao levar dano e velocidade (px/s) do empurrão. */
  stun: number; knock: number;
  /** Pausa (s, mín–máx) ao chegar numa ponta da patrulha. */
  pause?: [number, number];
  /** Arrancadas durante a patrulha: a cada `every` s, `dur` s a `mul` vezes a velocidade. */
  dart?: { every: [number, number]; dur: number; mul: number };
}

const NO_ATTACK = null;
const flyer = (detectX = 460, detectY = 360): AiProfile => ({ detectX, detectY, releaseMul: 1.2, chaseMul: 1, accel: 0, attack: NO_ATTACK, stun: 0.15, knock: 80 });

export const AI: Record<EnemyKind, AiProfile> = {
  // pequenos e rápidos: ataques curtos
  rat: { detectX: 320, detectY: 90, releaseMul: 1.3, chaseMul: 2.0, accel: 900, stun: 0.18, knock: 130,
    attack: { range: 22, dy: 60, windup: 0.14, strike: 0.12, recover: 0.32, cooldown: 0.6, lunge: 250, reach: 16 } },
  // rasteira: arrancadas e curvas rápidas
  roach: { detectX: 260, detectY: 90, releaseMul: 1.3, chaseMul: 1.9, accel: 1800, stun: 0.14, knock: 120,
    attack: { range: 18, dy: 50, windup: 0.09, strike: 0.1, recover: 0.24, cooldown: 0.5, lunge: 300, reach: 12 },
    dart: { every: [1.2, 2.6], dur: 0.35, mul: 2.2 } },
  // pernas ágeis, para e dá o bote
  spider: { detectX: 280, detectY: 110, releaseMul: 1.3, chaseMul: 1.5, accel: 700, stun: 0.16, knock: 100, pause: [0.4, 1.0],
    attack: { range: 34, dy: 70, windup: 0.34, strike: 0.15, recover: 0.5, cooldown: 1.0, lunge: 380, reach: 22 } },
  // pesado: demora para acelerar, prepara o golpe e fica exposto depois
  mutant: { detectX: 300, detectY: 90, releaseMul: 1.3, chaseMul: 1.5, accel: 450, stun: 0.12, knock: 60,
    attack: { range: 26, dy: 70, windup: 0.5, strike: 0.2, recover: 0.7, cooldown: 1.2, lunge: 180, reach: 26 } },
  // blindado: só avança (sem ataque), muito resistente ao empurrão
  armor: { detectX: 260, detectY: 90, releaseMul: 1.3, chaseMul: 1.4, accel: 500, stun: 0.08, knock: 30, attack: NO_ATTACK },
  robot: { detectX: 280, detectY: 90, releaseMul: 1.3, chaseMul: 1.4, accel: 400, stun: 0.1, knock: 40, pause: [0.5, 1.2],
    attack: { range: 24, dy: 70, windup: 0.45, strike: 0.2, recover: 0.8, cooldown: 1.2, lunge: 170, reach: 26 } },
  yeti: { detectX: 260, detectY: 100, releaseMul: 1.3, chaseMul: 1.5, accel: 420, stun: 0.1, knock: 40, pause: [0.6, 1.4],
    attack: { range: 26, dy: 80, windup: 0.55, strike: 0.2, recover: 0.8, cooldown: 1.3, lunge: 150, reach: 28 } },
  crab: { detectX: 280, detectY: 90, releaseMul: 1.3, chaseMul: 1.8, accel: 1500, stun: 0.14, knock: 110,
    attack: { range: 20, dy: 55, windup: 0.16, strike: 0.12, recover: 0.36, cooldown: 0.7, lunge: 230, reach: 14 } },
  lizard: { detectX: 320, detectY: 90, releaseMul: 1.3, chaseMul: 1.8, accel: 1100, stun: 0.15, knock: 110,
    attack: { range: 30, dy: 60, windup: 0.22, strike: 0.15, recover: 0.42, cooldown: 0.8, lunge: 360, reach: 20 } },
  alien: { detectX: 300, detectY: 110, releaseMul: 1.3, chaseMul: 1.6, accel: 900, stun: 0.15, knock: 100,
    attack: { range: 24, dy: 80, windup: 0.3, strike: 0.2, recover: 0.5, cooldown: 0.9, lunge: 260, reach: 20 } },
  // voadores: sem ataque próprio (o contato machuca), só perseguem
  bat: flyer(), fly: flyer(), cloud: flyer(), fish: flyer(), drone: flyer(),
  // inimigos das ilhas 9–16: reaproveitam o comportamento do arquétipo mais parecido
  fiddler: undefined as never, penguin: undefined as never, salamander: undefined as never, sweeper: undefined as never, monkey: undefined as never, urchin: undefined as never, sentinel: undefined as never, golem: undefined as never,
  dragonfly: flyer(), snowowl: flyer(), ember: flyer(), cogdrone: flyer(), toucan: flyer(), jelly: flyer(), orbdrone: flyer(), wisp: flyer(),
};
const ALIAS: Partial<Record<EnemyKind, EnemyKind>> = { fiddler: 'crab', penguin: 'yeti', salamander: 'lizard', sweeper: 'robot', monkey: 'alien', urchin: 'mutant', sentinel: 'robot', golem: 'armor' };
for (const [kind, base] of Object.entries(ALIAS) as [EnemyKind, EnemyKind][]) AI[kind] = { ...AI[base] };

/** Campos que a IA lê e escreve (compatível com `Enemy`). */
export interface AiEnemy {
  state: EnemyState; stateT: number; atkCd: number; idleT: number; dartT: number;
  dir: 1 | -1; vx: number; chasing: boolean; turnCd: number;
  x: number; w: number; minX: number; maxX: number;
}

export interface TickCtx {
  dt: number;
  /** Multiplicador de velocidade da dificuldade. */
  speedMul: number;
  /** Centro do herói menos centro do inimigo. */
  dx: number; dy: number;
  /** Vão horizontal entre as bordas (negativo = sobrepostos). */
  gap: number;
  playerAlive: boolean;
  /** O inimigo está dentro da "coleira" (faixa de patrulha + folga)? */
  inLeash: boolean;
  rand: () => number;
}

const approach = (v: number, target: number, step: number) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
const range = (r: [number, number], rand: () => number) => r[0] + (r[1] - r[0]) * rand();

export function enter(e: AiEnemy, s: EnemyState): void { e.state = s; e.stateT = 0; }

/** Estado inicial de um inimigo recém-criado. */
export function initAi(rand: () => number, kind: EnemyKind): Pick<AiEnemy, 'state' | 'stateT' | 'atkCd' | 'idleT' | 'dartT'> {
  const d = AI[kind].dart;
  return { state: 'patrol', stateT: 0, atkCd: 0, idleT: 0, dartT: d ? range(d.every, rand) : 0 };
}

/** Marca o inimigo como atordoado (dano) e o empurra para longe do herói. */
export function hurt(e: AiEnemy, kind: EnemyKind, awayDir: 1 | -1): void {
  const pr = AI[kind]; enter(e, 'hurt'); e.vx = awayDir * pr.knock; e.chasing = false; e.atkCd = Math.max(e.atkCd, 0.3);
}

export function kill(e: AiEnemy): void { enter(e, 'dead'); e.vx = 0; e.chasing = false; }

/** O inimigo bateu numa parede/borda (o motor avisa): para o bote ou vira de direção. */
export function bump(e: AiEnemy, kind: EnemyKind, rand: () => number): void {
  const pr = AI[kind];
  if (e.state === 'strike') { enter(e, 'recover'); e.atkCd = pr.attack?.cooldown ?? 0; e.vx = 0; return; }
  if (e.state === 'windup' || e.state === 'recover' || e.state === 'hurt' || e.state === 'dead') { e.vx = 0; return; }
  const wasChasing = e.state === 'chase';
  e.dir = (e.dir * -1) as 1 | -1; e.turnCd = wasChasing ? 1 : 0.2; e.chasing = false; e.vx = 0;
  if (pr.pause && !wasChasing) { enter(e, 'idle'); e.idleT = range(pr.pause, rand); } else enter(e, 'patrol');
}

/** Um passo da IA de bicho terrestre; deixa a velocidade desejada em `e.vx`. */
export function stepGround(e: AiEnemy, speed: number, pr: AiProfile, c: TickCtx): void {
  e.stateT += c.dt; e.atkCd = Math.max(0, e.atkCd - c.dt); e.turnCd = Math.max(0, e.turnCd - c.dt);
  const atk = pr.attack, base = speed * c.speedMul, a = pr.accel * c.dt;
  switch (e.state) {
    case 'dead': e.vx = 0; return;
    case 'hurt':
      e.vx = approach(e.vx, 0, 900 * c.dt);
      if (e.stateT >= pr.stun) enter(e, 'patrol');
      return;
    case 'windup':
      e.vx = approach(e.vx, 0, a * 2);
      if (atk && e.stateT >= atk.windup) enter(e, 'strike');
      return;
    case 'strike':
      e.vx = e.dir * (atk?.lunge ?? 0) * Math.min(1.4, c.speedMul);
      if (atk && e.stateT >= atk.strike) { enter(e, 'recover'); e.atkCd = atk.cooldown; }
      return;
    case 'recover':
      e.vx = approach(e.vx, 0, a * 1.5);
      if (atk && e.stateT >= atk.recover) enter(e, 'patrol');
      return;
    case 'idle':
      e.vx = approach(e.vx, 0, a * 1.5);
      if (e.stateT >= e.idleT) enter(e, 'patrol');
      return;
    default: break;
  }

  // patrol / chase
  const ax = Math.abs(c.dx), ay = Math.abs(c.dy), rel = e.state === 'chase' ? pr.releaseMul : 1;
  const near = c.playerAlive && ax < pr.detectX * rel && ay < pr.detectY * rel;
  const wantChase = near && c.inLeash && e.turnCd <= 0;
  if (wantChase && e.state !== 'chase') enter(e, 'chase');
  // permanência mínima de 0,25 s na perseguição (o herói pulando por cima não liga/desliga o bicho); morte do herói e coleira cortam na hora
  else if (!wantChase && e.state === 'chase' && (e.stateT >= 0.25 || !c.playerAlive || !c.inLeash)) { enter(e, 'patrol'); if (!c.inLeash) e.turnCd = 0.8; }
  e.chasing = e.state === 'chase';

  if (e.state === 'chase') {
    if (ax > 14) e.dir = c.dx >= 0 ? 1 : -1; // direto acima/abaixo: não vira a cada quadro
    const facing = (c.dx >= 0 ? 1 : -1) === e.dir;
    if (atk && e.atkCd <= 0 && c.playerAlive && facing && c.gap <= atk.range && ay < atk.dy) {
      enter(e, 'windup'); e.chasing = false; return;
    }
    e.vx = approach(e.vx, e.dir * base * pr.chaseMul, a);
    return;
  }

  // patrulha: volta à faixa, com pausas e arrancadas opcionais
  const x0 = e.x, x1 = e.x + e.w;
  if ((x0 < e.minX && e.dir < 0) || (x1 > e.maxX && e.dir > 0)) {
    e.dir = (e.dir * -1) as 1 | -1;
    if (pr.pause) { enter(e, 'idle'); e.idleT = range(pr.pause, c.rand); e.vx = approach(e.vx, 0, a); return; }
  }
  let mul = 1;
  if (pr.dart) { e.dartT -= c.dt; if (e.dartT <= -pr.dart.dur) e.dartT = range(pr.dart.every, c.rand); else if (e.dartT <= 0) mul = pr.dart.mul; }
  e.vx = approach(e.vx, e.dir * base * mul, a);
}

/** Um passo da IA de voador: sem ataque, só patrulha/perseguição (com histerese) e atordoamento. */
export function stepFlyer(e: AiEnemy, pr: AiProfile, c: TickCtx): void {
  e.stateT += c.dt;
  if (e.state === 'dead') return;
  if (e.state === 'hurt') { e.vx = approach(e.vx, 0, 400 * c.dt); if (e.stateT >= pr.stun) enter(e, 'patrol'); e.chasing = false; return; }
  const rel = e.state === 'chase' ? pr.releaseMul : 1;
  const near = c.playerAlive && Math.abs(c.dx) < pr.detectX * rel && Math.abs(c.dy) < pr.detectY * rel;
  if (near && e.state !== 'chase') enter(e, 'chase'); else if (!near && e.state === 'chase') enter(e, 'patrol');
  e.chasing = e.state === 'chase';
}

/** Área de dano do golpe: faixa à frente do corpo, só existe no estado `strike`. */
export function strikeBox(e: { x: number; y: number; w: number; h: number; dir: 1 | -1 }, reach: number) {
  return { x: e.dir > 0 ? e.x + e.w : e.x - reach, y: e.y, w: reach, h: e.h };
}
