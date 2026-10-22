/**
 * IA do chefão (Monstro do Lixão): máquina de estados com 3 fases por vida restante.
 *
 * Estados: idle · windup (aviso) · charge · leap · spit · recover · phase (transição) · dead.
 *
 * Regras:
 *  - Todo ataque tem aviso (`windup`) com um alvo marcado no chão, depois a ação, depois uma recuperação em que o
 *    chefão fica exposto e inofensivo ao toque. A cada fase os tempos encurtam e entram golpes novos.
 *  - Fase 1 (vida > 66%): investida e salto com pancada. Fase 2 (> 33%): + cuspe de lama. Fase 3: mais rápido,
 *    pancada com 4 poças, cuspe de 5 e combos (ataque encadeado sem pausa).
 *  - Ao cruzar 66% e 33% de vida ele para e ruge (`phase`): fica invulnerável por 1,4 s e o ataque em curso é cancelado.
 *    Um golpe forte que pule uma fase leva direto à fase correta.
 *  - Não repete o mesmo ataque mais de duas vezes seguidas. Herói morto: não inicia ataques novos.
 *  - É puro: devolve eventos (poças, tremor, fala) que o motor aplica; o movimento e a colisão são do motor.
 */

export type BossAttack = 'charge' | 'leap' | 'spit';
export type BossState = 'idle' | 'windup' | 'charge' | 'leap' | 'spit' | 'recover' | 'phase' | 'dead';
export type BossPhase = 1 | 2 | 3;

export interface PhaseProfile {
  walk: number;
  /** Pausa (s, mín–máx) andando atrás do herói antes do próximo ataque. */
  cooldown: [number, number];
  windup: Record<BossAttack, number>;
  recover: Record<BossAttack, number>;
  chargeSpeed: number; chargeDur: number;
  /** Velocidades horizontais das poças criadas no pouso do salto (negativo = para a esquerda). */
  slamBlobs: number[];
  spit: { count: number; gap: number; speed: number } | null;
  attacks: BossAttack[];
  /** Chance de encadear outro ataque logo depois da recuperação. */
  comboChance: number;
}

export const PHASES: Record<BossPhase, PhaseProfile> = {
  1: { walk: 62, cooldown: [1.8, 2.4], windup: { charge: 0.75, leap: 0.6, spit: 0.5 }, recover: { charge: 0.9, leap: 0.8, spit: 0.6 },
    chargeSpeed: 270, chargeDur: 1.2, slamBlobs: [-340, 340], spit: null, attacks: ['charge', 'leap'], comboChance: 0 },
  2: { walk: 78, cooldown: [1.3, 1.8], windup: { charge: 0.6, leap: 0.5, spit: 0.45 }, recover: { charge: 0.75, leap: 0.7, spit: 0.55 },
    chargeSpeed: 320, chargeDur: 1.3, slamBlobs: [-340, 340], spit: { count: 3, gap: 0.28, speed: 280 }, attacks: ['charge', 'leap', 'spit'], comboChance: 0 },
  3: { walk: 96, cooldown: [0.8, 1.2], windup: { charge: 0.45, leap: 0.4, spit: 0.35 }, recover: { charge: 0.6, leap: 0.55, spit: 0.45 },
    chargeSpeed: 380, chargeDur: 1.4, slamBlobs: [-260, -380, 260, 380], spit: { count: 5, gap: 0.22, speed: 320 }, attacks: ['charge', 'leap', 'spit'], comboChance: 0.35 },
};

export const PHASE_TIME = 1.4;
/** Margem (s) antes do fim do aviso em que o alvo do salto trava (o herói ainda pode se mexer até aí). */
export const AIM_LOCK = 0.15;
/** Pausa extra (s) quando a investida bate na parede. */
export const WALL_STUN = 0.5;

export interface BossAi {
  state: BossState; stateT: number; cd: number; phase: BossPhase;
  atk: BossAttack | null; lastAtk: BossAttack | null; streak: number;
  /** Alvo marcado no chão (x do centro do herói, travado no fim do aviso). */
  aimX: number; spitLeft: number; spitT: number; combo: boolean;
  dir: 1 | -1; vx: number; vy: number; onGround: boolean;
  x: number; y: number; w: number; h: number; hp: number; maxHp: number;
}

export type BossEvent =
  | { type: 'slam'; x: number; y: number; vx: number[] }
  | { type: 'spit'; x: number; y: number; vx: number }
  | { type: 'roar'; phase: BossPhase }
  | { type: 'say'; text: string };

export interface BossCtx {
  dt: number;
  /** Centro do herói menos centro do chefão. */
  dx: number;
  playerAlive: boolean;
  /** O movimento do quadro anterior foi barrado (parede/limite da arena) durante a investida? */
  blocked: boolean;
  rand: () => number;
}

export function phaseFor(hp: number, maxHp: number): BossPhase {
  const r = hp / maxHp; return r > 0.66 ? 1 : r > 0.33 ? 2 : 3;
}

const range = (r: [number, number], rand: () => number) => r[0] + (r[1] - r[0]) * rand();
const enter = (b: BossAi, s: BossState) => { b.state = s; b.stateT = 0; };

export function initBoss(rand: () => number): Pick<BossAi, 'state' | 'stateT' | 'cd' | 'phase' | 'atk' | 'lastAtk' | 'streak' | 'aimX' | 'spitLeft' | 'spitT' | 'combo'> {
  return { state: 'idle', stateT: 0, cd: range(PHASES[1].cooldown, rand), phase: 1, atk: null, lastAtk: null, streak: 0, aimX: 0, spitLeft: 0, spitT: 0, combo: false };
}

/** Chame depois de tirar vida: se cruzou 66%/33%, inicia a transição de fase (ruge e fica invulnerável). */
export function onDamaged(b: BossAi): BossEvent[] {
  if (b.state === 'dead' || b.hp <= 0) return [];
  const np = phaseFor(b.hp, b.maxHp); if (np <= b.phase) return [];
  b.phase = np; b.atk = null; b.spitLeft = 0; b.combo = false; b.vx = 0; enter(b, 'phase');
  return [{ type: 'roar', phase: np }, { type: 'say', text: np === 2 ? 'O MONSTRO ENFURECE!' : 'ELE ESTÁ FORA DE SI! CUIDADO COM AS POÇAS!' }];
}

export function kill(b: BossAi): void { enter(b, 'dead'); b.vx = 0; b.atk = null; b.spitLeft = 0; }

/** Escolhe o próximo ataque da fase (sem repetir mais de duas vezes seguidas; distância influencia o peso). */
export function pickAttack(b: BossAi, dist: number, rand: () => number): BossAttack {
  const pool = PHASES[b.phase].attacks.filter((a) => !(a === b.lastAtk && b.streak >= 2));
  const w = (a: BossAttack) => (a === 'charge' ? 1 + (dist > 300 ? 1 : 0) : a === 'leap' ? 1 + (dist < 350 ? 1 : 0) : dist > 250 ? 2 : 0.5);
  const total = pool.reduce((s, a) => s + w(a), 0); let r = rand() * total;
  for (const a of pool) { r -= w(a); if (r <= 0) return a; }
  return pool[pool.length - 1]!;
}

/** Um passo da IA. Deixa a velocidade desejada em `b.vx` (e o impulso do salto em `b.vy`) e devolve eventos. */
export function stepBoss(b: BossAi, c: BossCtx): BossEvent[] {
  const ev: BossEvent[] = []; const pr = PHASES[b.phase];
  b.stateT += c.dt; b.cd -= c.dt;
  const cx = b.x + b.w / 2, ground = b.y + b.h - 18;
  switch (b.state) {
    case 'dead': b.vx = 0; return ev;
    case 'phase':
      b.vx = 0; if (b.stateT >= PHASE_TIME) { enter(b, 'idle'); b.cd = 0.6; }
      return ev;
    case 'idle': {
      b.dir = c.dx >= 0 ? 1 : -1; b.vx = b.dir * pr.walk;
      if (b.cd <= 0 && c.playerAlive) {
        const a = pickAttack(b, Math.abs(c.dx), c.rand);
        b.streak = a === b.lastAtk ? b.streak + 1 : 1; b.lastAtk = a; b.atk = a; b.aimX = cx + c.dx; b.vx = 0; enter(b, 'windup');
      }
      return ev;
    }
    case 'windup': {
      const a = b.atk ?? 'charge'; const t = b.combo ? pr.windup[a] * 0.6 : pr.windup[a];
      b.vx = 0; if (c.playerAlive) b.dir = c.dx >= 0 ? 1 : -1;
      if (b.stateT < t - AIM_LOCK && c.playerAlive) b.aimX = cx + c.dx; // o alvo acompanha o herói até travar
      if (b.stateT >= t) {
        if (a === 'charge') { b.dir = b.aimX >= cx ? 1 : -1; enter(b, 'charge'); b.vx = b.dir * pr.chargeSpeed; }
        else if (a === 'leap') { enter(b, 'leap'); b.vy = -1100; b.vx = Math.max(-420, Math.min(420, (b.aimX - cx) / 0.9)); b.onGround = false; }
        else { enter(b, 'spit'); b.spitLeft = pr.spit?.count ?? 0; b.spitT = 0; }
      }
      return ev;
    }
    case 'charge':
      b.vx = b.dir * pr.chargeSpeed;
      if (c.blocked) { enter(b, 'recover'); b.vx = 0; b.stateT = -WALL_STUN; }          // bateu na parede: atordoado
      else if (b.stateT >= pr.chargeDur) { enter(b, 'recover'); b.vx = 0; }
      return ev;
    case 'leap':
      if (b.onGround && b.stateT > 0.25) {
        enter(b, 'recover'); b.vx = 0;
        ev.push({ type: 'slam', x: cx, y: ground, vx: pr.slamBlobs });
      }
      return ev;
    case 'spit': {
      b.vx = 0; const sp = pr.spit;
      if (!sp || b.spitLeft <= 0) { enter(b, 'recover'); return ev; }
      b.spitT -= c.dt;
      if (b.spitT <= 0) { b.spitLeft--; b.spitT = sp.gap; ev.push({ type: 'spit', x: cx + b.dir * 50, y: ground, vx: b.dir * sp.speed }); }
      return ev;
    }
    case 'recover': {
      b.vx = 0; const a = b.atk ?? 'charge';
      if (b.stateT >= pr.recover[a]) {
        const combo = !b.combo && pr.comboChance > 0 && c.playerAlive && c.rand() < pr.comboChance;
        b.combo = combo; b.atk = null; enter(b, 'idle'); b.cd = combo ? 0.1 : range(pr.cooldown, c.rand);
      }
      return ev;
    }
  }
}

/** Corpo que o herói acerta (tiros e pisão): a caixa inteira. */
export const bossBody = (b: { x: number; y: number; w: number; h: number }) => ({ x: b.x, y: b.y, w: b.w, h: b.h });
/** Área que machuca o herói ao toque: mais justa que o corpo (ignora bordas do sprite). */
export const bossTouch = (b: { x: number; y: number; w: number; h: number }) => ({ x: b.x + 10, y: b.y + 20, w: b.w - 20, h: b.h - 20 });
/** O toque machuca? Não na recuperação (janela para atacar) nem na transição de fase. */
export const bossHarmful = (s: BossState): boolean => s !== 'recover' && s !== 'phase' && s !== 'dead';
