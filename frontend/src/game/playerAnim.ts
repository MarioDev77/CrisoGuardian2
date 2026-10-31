/**
 * Máquina de estados da animação do Crisoman.
 *
 * Decide QUAL quadro do atlas (p_*) mostrar a partir do estado físico e das ações do jogador.
 * É pura (não toca no canvas nem na física), então dá para testar sem navegador.
 *
 * Regras principais:
 *  - O tempo vem de um relógio monotônico (`t`), nunca da taxa de quadros do monitor. Em pausa o relógio
 *    não avança, então a animação congela sem pular.
 *  - Morte é terminal: depois de entrar, só `reset()` (reinício da fase) sai dela.
 *  - Dano tem prioridade sobre tudo, exceto morte, e sempre toca até o fim.
 *  - Corrida/caminhada têm histerese (limiares diferentes para entrar e sair), evitando piscar entre quadros.
 *  - Cada estado de locomoção tem a sua fase de animação; ela só avança no estado correspondente
 *    (corrida não toca com o herói parado, salto não reinicia no ar).
 */

export type PlayerState =
  | 'idle' | 'walk' | 'run'
  | 'jumpStart' | 'jumpRise' | 'jumpApex' | 'fall' | 'landing'
  | 'attackStart' | 'attack' | 'attackRecovery'
  | 'hurt' | 'death' | 'victory' | 'interact' | 'collect' | 'special' | 'climb';

/** Tempos (s) compartilhados com o motor, para pose e efeito acontecerem no mesmo instante. */
export const HURT_TIME = 0.45;
export const LAND_TIME = 0.2;
export const JUMP_START_TIME = 0.07;
export const ATTACK_START_END = 0.05;   // fim da mira (quadro 0)
/** Instante em que o tiro realmente sai (primeiro quadro "ativo" do golpe). */
export const ATTACK_FIRE_T = ATTACK_START_END;
export const ATTACK_ACTIVE_END = 0.11;  // fim do clarão de saída (quadro 1)
/** Dentro da recuperação: até aqui o quadro é a rajada (2), depois o brilho se dissipando (3). */
export const ATTACK_BLAST_END = 0.18;
export const ATTACK_TOTAL = 0.28;       // fim da recuperação
export const SPECIAL_TIME = 0.4;
export const INTERACT_TIME = 0.45;

export interface AnimInput {
  /** Relógio da animação em segundos (monotônico). */
  t: number;
  onGround: boolean; vx: number; vy: number;
  climbing: boolean; climbMoving: boolean;
  dead: boolean; dieT: number;
  hurtT: number; landT: number; collectT: number;
  shootT: number; specialT: number; interactT: number;
  /** Verdadeiro durante a comemoração ao chegar no portal. */
  victory: boolean;
}

export interface AnimOutput { state: PlayerState; name: string }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export class PlayerAnim {
  state: PlayerState = 'idle';
  /** Tempo (s) dentro do estado atual. */
  stateT = 0;
  private phase = 0; private lastT: number | null = null;
  private airT = 0; private jumped = false; private dead = false;

  reset(): void {
    this.state = 'idle'; this.stateT = 0; this.phase = 0; this.lastT = null;
    this.airT = 0; this.jumped = false; this.dead = false;
  }

  update(i: AnimInput): AnimOutput {
    const dt = this.lastT === null ? 0 : clamp(i.t - this.lastT, 0, 0.1);
    this.lastT = i.t;
    const sp = Math.abs(i.vx);

    if (i.onGround) { this.airT = 0; this.jumped = false; } else { this.airT += dt; if (i.vy < -120) this.jumped = true; }

    const next = this.resolve(i, sp);
    if (next !== this.state) this.enter(next); else this.stateT += dt;

    // fase da animação: só avança no estado que a usa
    switch (this.state) {
      case 'idle': this.phase += dt * 4; break;
      case 'walk': this.phase += dt * clamp(5 + sp / 40, 7, 12); break;
      case 'run': this.phase += dt * clamp(10 + (sp - 250) / 40, 10, 16); break;
      case 'fall': this.phase += dt * 8; break;
      case 'climb': if (i.climbMoving) this.phase += dt * 8; break;
      default: break;
    }
    return { state: this.state, name: this.frame(i) };
  }

  private enter(next: PlayerState): void {
    const prev = this.state;
    // trocar entre andar e correr mantém a posição relativa no ciclo (sem "recomeçar" o passo)
    if (prev === 'walk' && next === 'run') this.phase = (this.phase % 5) / 5 * 4;
    else if (prev === 'run' && next === 'walk') this.phase = (this.phase % 4) / 4 * 5;
    else this.phase = 0;
    this.state = next; this.stateT = 0;
  }

  private resolve(i: AnimInput, sp: number): PlayerState {
    if (this.dead || i.dead) { this.dead = true; return 'death'; }
    if (i.hurtT > 0) return 'hurt';
    if (i.specialT < SPECIAL_TIME) return 'special';
    if (i.collectT > 0) return 'collect';
    if (i.climbing) return 'climb';

    if (!i.onGround) {
      if (i.victory) return 'victory';
      if (this.jumped && this.airT < JUMP_START_TIME && i.vy < -300) return 'jumpStart';
      if (i.vy < -140) return 'jumpRise';
      if (this.jumped && i.vy <= 140) return 'jumpApex';
      return 'fall';
    }

    if (i.shootT < ATTACK_TOTAL) return i.shootT < ATTACK_START_END ? 'attackStart' : i.shootT < ATTACK_ACTIVE_END ? 'attack' : 'attackRecovery';
    if (i.landT > 0 && !(LAND_TIME - i.landT > 0.07 && sp > 20)) return 'landing';
    if (i.interactT > 0 && sp < 60) return 'interact';

    const was = this.state;
    const moving = was === 'walk' || was === 'run' ? sp > 12 : sp > 25;
    if (!moving) return 'idle';
    return (was === 'run' ? sp > 250 : sp > 285) ? 'run' : 'walk';
  }

  private frame(i: AnimInput): string {
    const f = Math.floor(this.phase);
    switch (this.state) {
      case 'death': return `p_die_${Math.min(2, Math.floor(i.dieT * 3))}`;
      case 'hurt': return `p_hurt_${clamp(Math.floor((HURT_TIME - i.hurtT) * 9), 0, 3)}`;
      case 'special': return 'p_special_0';
      case 'climb': return `p_walk_${f % 5}`;
      case 'jumpStart': return 'p_jump_0';
      case 'jumpRise': return i.vy < -520 ? 'p_jump_1' : 'p_jump_2';
      case 'jumpApex': return i.vy < 0 ? 'p_jump_3' : 'p_jump_4';
      case 'fall': return this.stateT < 0.1 ? 'p_fall_0' : i.vy >= 650 ? 'p_fall_2' : f % 2 ? 'p_fall_3' : 'p_fall_1';
      case 'victory': return i.vy < -300 ? 'p_jump_1' : i.vy < 0 ? 'p_jump_3' : i.vy < 200 ? 'p_jump_4' : 'p_fall_0';
      case 'landing': return `p_land_${clamp(Math.floor((LAND_TIME - i.landT) * 15), 0, 2)}`;
      case 'attackStart': return 'p_shoot_0';
      case 'attack': return 'p_shoot_1';
      case 'attackRecovery': return 'p_shoot_2';
      case 'interact': return `p_reload_${clamp(Math.floor((1 - i.interactT / INTERACT_TIME) * 4), 0, 3)}`;
      case 'collect': return `p_reload_${clamp(Math.floor((0.45 - i.collectT) * 9), 0, 3)}`;
      case 'run': return `p_run_${f % 4}`;
      case 'walk': return `p_walk_${f % 5}`;
      default: return `p_idle_${f % 4}`;
    }
  }
}


/** Entrada para escolher o quadro dos sprites novos (assets/characters/<herói>/<animação>). */
export interface HeroPoseInput { stateT: number; hurtT: number; landT: number; dieT: number; vy: number; speed: number }
/** Animação e índice de quadro dos heróis. O índice de animações em laço é "bruto" (o assets enrola com módulo). */
export function heroPose(state: PlayerState, i: HeroPoseInput): { anim: string; index: number } {
  /** Locomoção pela velocidade: coletar/aterrissar em movimento não pode "agachar" o herói. */
  const moving = (): { anim: string; index: number } => i.speed > 285 ? { anim: 'run', index: Math.floor(i.stateT * clamp(11 + (i.speed - 250) / 60, 11, 16)) }
    : i.speed > 25 ? { anim: 'walk', index: Math.floor(i.stateT * clamp(6 + i.speed / 45, 7, 11)) } : { anim: 'idle', index: Math.floor(i.stateT * 5) };
  switch (state) {
    case 'death': return { anim: 'death', index: clamp(Math.floor(i.dieT * 5), 0, 3) };
    case 'hurt': return { anim: 'hurt', index: clamp(Math.floor((HURT_TIME - i.hurtT) * 7), 0, 2) };
    case 'special': return { anim: 'attack', index: 1 };
    case 'attackStart': return { anim: 'attack', index: 0 };
    case 'attack': return { anim: 'attack', index: 1 };
    case 'attackRecovery': return { anim: 'attack', index: ATTACK_ACTIVE_END + i.stateT < ATTACK_BLAST_END ? 2 : 3 };
    case 'jumpStart': return { anim: 'jump', index: 0 };
    case 'jumpRise': case 'jumpApex': case 'victory': return { anim: 'jump', index: 1 };
    case 'fall': return { anim: 'fall', index: Math.floor(i.stateT * 8) };
    // a pose agachada só vale com o herói quase parado; correndo, segue o ciclo de corrida
    case 'landing': return i.speed > 60 ? moving() : { anim: 'land', index: i.landT > LAND_TIME / 2 ? 0 : 1 };
    case 'collect': case 'interact': return moving();
    case 'run': case 'walk': case 'climb': return moving().anim === 'idle' && state !== 'climb' ? { anim: state, index: Math.floor(i.stateT * 8) } : state === 'run' ? { anim: 'run', index: Math.floor(i.stateT * clamp(11 + (i.speed - 250) / 60, 11, 16)) } : { anim: 'walk', index: Math.floor(i.stateT * clamp(6 + i.speed / 45, 7, 11)) };
    default: return { anim: 'idle', index: Math.floor(i.stateT * 5) };
  }
}
