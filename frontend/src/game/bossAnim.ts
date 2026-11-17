import type { BossAttack, BossState } from './bossAI';

/** Índice zero-based da fase 8, que mantém o chefe clássico Grande Lixo. */
export const GRANDE_LIXO_LEVEL = 7;

export interface GrandeLixoPoseInput {
  state: BossState;
  stateT: number;
  atk: BossAttack | null;
  hurt: number;
  dying: number;
  vx: number;
  t: number;
  windup: number;
}

export interface GrandeLixoPose {
  anim: string;
  index: number;
}

/**
 * Seleciona a animação do chefe clássico. O motor usa fallback do atlas antigo
 * quando o pacote opcional de sprites de Grande Lixo não está instalado.
 */
export function grandeLixoPose(input: GrandeLixoPoseInput): GrandeLixoPose {
  const { state, stateT, atk, hurt, dying, vx, t, windup } = input;
  if (state === 'dead' || dying > 0) return { anim: 'die', index: Math.max(0, Math.floor(Math.max(0, dying) * 8)) };
  if (hurt > 0 || state === 'phase') return { anim: 'hurt', index: Math.floor(t * 8) % 2 };
  if (state === 'windup') return { anim: 'windup', index: Math.min(2, Math.floor(Math.max(0, stateT / Math.max(0.01, windup)) * 3)) };
  if (state === 'charge' || state === 'spit' || state === 'leap') {
    return { anim: atk === 'leap' ? 'attack2' : 'attack1', index: Math.floor(t * 10) % 3 };
  }
  if (state === 'recover') return { anim: 'recover', index: Math.min(1, Math.floor(stateT * 4)) };
  return Math.abs(vx) > 12
    ? { anim: 'walk', index: Math.floor(t * 7) % 4 }
    : { anim: 'idle', index: Math.floor(t * 3) % 2 };
}

/** Quadro cíclico para os cinco projéteis desenhados no atlas de projéteis do chefe. */
export function projectileFrame(seed: number): number {
  if (!Number.isFinite(seed)) return 0;
  return ((Math.floor(Math.abs(seed)) % 5) + 5) % 5;
}
