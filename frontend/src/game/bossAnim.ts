import type { BossAttack, BossState } from './bossAI';

/** Quadros do chefão da fase 16 ("O Grande Lixo"): assets/characters/grande_lixo. */
export interface BossPoseInput { state: BossState; stateT: number; atk: BossAttack | null; hurt: number; dying: number; vx: number; t: number; windup: number }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const BOSS_HURT_TIME = 0.16;

export function grandeLixoPose(i: BossPoseInput): { anim: string; index: number } {
  if (i.state === 'dead') return { anim: 'death', index: clamp(Math.floor((1.6 - i.dying) * 3.4), 0, 4) };
  if (i.hurt > 0) return { anim: 'hurt', index: clamp(Math.floor((1 - i.hurt / BOSS_HURT_TIME) * 5), 0, 4) };
  switch (i.state) {
    case 'phase': return { anim: 'hurt', index: 2 };                                          // transição de fase: treme em meio à fumaça verde
    case 'windup': return { anim: 'attack', index: clamp(Math.floor((i.stateT / Math.max(0.05, i.windup)) * 3), 0, 2) }; // prepara o golpe
    case 'charge': return { anim: 'walk', index: Math.floor(i.t * 14) };                       // investida: corre
    case 'leap': return { anim: 'attack', index: 4 };
    case 'spit': return { anim: 'attack', index: clamp(3 + Math.floor(i.stateT * 8), 3, 5) };  // joga o lixo
    case 'recover': return { anim: 'idle', index: Math.floor(i.t * 5) };
    default: return Math.abs(i.vx) > 8 ? { anim: 'walk', index: Math.floor(i.t * 9) } : { anim: 'idle', index: Math.floor(i.t * 5) };
  }
}
/** Qual projétil o chefão joga (lixeira, garrafa, lata, saco) — varia por posição; bola de lodo para o cuspe verde. */
export const projectileFrame = (seed: number): number => Math.abs(Math.floor(seed)) % 4;
export const GRANDE_LIXO_LEVEL = 15;
