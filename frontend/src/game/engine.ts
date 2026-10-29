import { Assets } from './assets';
import { buildWorld, VIEW_H, VIEW_W as BASE_VIEW_W, type World, type WSurface } from './level';
import { audio } from './audio';
import { grandeLixoPose, projectileFrame, GRANDE_LIXO_LEVEL } from './bossAnim';
import { PlayerAnim, ATTACK_FIRE_T, INTERACT_TIME, heroPose, type PlayerState } from './playerAnim';
import { drawDebugWorld, drawDebugPanel, type DebugState } from './debugOverlay';
import { AI, stepGround, stepFlyer, bump, kill, hurt as hurtAi, initAi, strikeBox, type TickCtx } from './enemyAI';
import { stepBoss, AIM_LOCK, onDamaged, kill as killBoss, initBoss, bossBody, bossTouch, bossHarmful, PHASES, type BossEvent } from './bossAI';
import { moveBody, moveX, moveY, settle, sweptBox, nearestAlong, playerHurtbox, type Box } from './collision';
import { actionForCode, DIFFICULTY, getSettings, QUALITY, subscribeSettings, type Action } from '../app/settings';
import { ENEMIES, WASTE_VALUE, type Bin, type Boss, type Enemy, type EnemySpec, type FloatText, type Particle, type Pickup, type Player, type Rect, type Shot, type Sludge, type Body } from './entities';
import type { CharacterId } from '../app/catalog';

export type Control = 'left' | 'right' | 'jump' | 'shoot' | 'special' | 'up' | 'down';
export interface LevelResult { coins: number; score: number; materials: number; totalMaterials: number; hpLeft: number; time: number; collectibles: { id: string; type: 'coin' | 'material'; material?: string }[] }
export interface EngineCallbacks { onWin: (r: LevelResult) => void; onLose: (r: LevelResult) => void; onAnnounce?: (message: string) => void }

const PW = 40, PH = 92, PS = 1.32;
/** Os quadros novos já saem normalizados (≈100 px de altura em tela); 1 = tamanho calibrado. */
const HERO_SCALE = 1;
const GRAV = 2400, JUMP_V = 980;

/** Crisoman uses the original shipped art; only Crisogirl uses the newly drawn atlas. */
export function playerSpriteName(character: CharacterId, legacyName: string, girlFrame: string | null | undefined): string {
  return character === 'crisogirl' && girlFrame ? girlFrame : legacyName;
}
function legacySkinFilter(skinId: string): string {
  if (skinId.includes('urbana') || skinId.includes('urbano')) return 'grayscale(.72)';
  if (skinId.includes('natureza') || skinId.includes('floresta')) return 'sepia(.55) saturate(1.25)';
  if (skinId.includes('agua')) return 'hue-rotate(100deg) saturate(1.2)';
  if (skinId.includes('fogo')) return 'hue-rotate(250deg) saturate(1.35)';
  return 'none';
}

const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const sfRect = (s: WSurface): Rect => ({ x: s.x, y: s.top, w: s.w, h: s.h });

export interface PlayerAppearance { character: CharacterId; skinId: string; petId: string | null }

export class Engine {
  private ctx: CanvasRenderingContext2D;
  private raf = 0; private last = 0; private t = 0;
  private world!: World;
  private keys: Record<Control, boolean> = { left: false, right: false, jump: false, shoot: false, special: false, up: false, down: false };
  private jumpWas = false; private specialWas = false;
  /** Máquina de estados da animação do herói; `interactT` = pose de interação; `shotPending` = tiro aguardando o quadro ativo do golpe. */
  private anim = new PlayerAnim(); private interactT = 0; private collectT = 0; private petCollectT = 0; private shotPending = false;
  paused = false; private ended = false;
  /** Depuração visual (hitboxes, origem do sprite, estado da animação): só em `npm run dev` (F3 ou ?debug=1). */
  private debug = false; private lastPF = { name: 'p_idle_0', state: 'idle' };

  private p!: Player;
  private enemies: Enemy[] = []; private boss: Boss | null = null; private bossBlocked = false;
  private pickups: Pickup[] = []; private bins: Bin[] = [];
  private shots: Shot[] = []; private sludge: Sludge[] = []; private parts: Particle[] = []; private texts: FloatText[] = [];
  private coins = 0; private score = 0; private materials = 0; private totalMaterials = 0; private sinceBin = 0; private runCollectibles: LevelResult['collectibles'] = [];
  private cam = 0; private safe = { x: 0, y: 0, t: 0 };
  private specialFx = 0; private shake = 0; private hitStop = 0; private dustT = 0; private banner = { text: '', t: 0 };
  private nextId = 1; private time = 0; private fallCount = 0;
  /** Sequência de vitória (andar até o portal → sucção → explosão → íris) e abertura de fase. */
  private win: { t: number; phase: 'walk' | 'suck' | 'burst' | 'iris'; hop: boolean; pt: number; sx: number; sy: number; z: number; glow: number; armed: boolean; sparks: { a: number; r: number; w: number; s: number; c: number }[] } | null = null;
  private introT = 0; private portalSpin = 0;
  private onKey: (e: KeyboardEvent, down: boolean) => void;
  private resizeObs: ResizeObserver;
  private unsubSettings: () => void;
  /** FPS medido (média de ~0,5 s) para o contador opcional da tela. */
  private fps = 0; private fpsFrames = 0; private fpsT = 0;
  /** Largura lógica da câmera: acompanha a proporção da tela para preencher tudo na horizontal. */
  private vw = BASE_VIEW_W;

  constructor(private canvas: HTMLCanvasElement, private assets: Assets, private levelIndex: number, private cb: EngineCallbacks, private appearance: PlayerAppearance = { character: 'crisoman', skinId: 'skin-crisoman-verde', petId: null }) {
    this.ctx = canvas.getContext('2d')!;
    this.assets.setLevel?.(levelIndex);
    this.reset();
    if (import.meta.env.DEV) { this.debug = new URLSearchParams(location.search).has('debug'); }
    // teclas lidas das configurações a cada evento: remapear no menu de pausa vale imediatamente
    this.onKey = (e, down) => {
      const a: Action | null = actionForCode(e.code, getSettings().keys); if (!a || a === 'pause') return;
      e.preventDefault(); this.keys[a] = down;
    };
    window.addEventListener('keydown', this.kd); window.addEventListener('keyup', this.ku); window.addEventListener('blur', this.releaseAll);
    this.unsubSettings = subscribeSettings(() => this.resize());
    this.resizeObs = new ResizeObserver(() => this.resize()); this.resizeObs.observe(canvas.parentElement ?? canvas);
    this.resize();
  }
  private kd = (e: KeyboardEvent) => { if (import.meta.env.DEV && e.code === 'F3') { e.preventDefault(); this.debug = !this.debug; return; } this.onKey(e, true); };
  private ku = (e: KeyboardEvent) => this.onKey(e, false);
  /** Solta todas as teclas (ao pausar, trocar de aba ou remapear), para o herói não ficar "preso" andando. */
  releaseAll = (): void => { for (const k of Object.keys(this.keys) as Control[]) this.keys[k] = false; this.jumpWas = false; this.specialWas = false; };

  get levelName(): string { return this.world.layout.name; }

  private reset(): void {
    const w = buildWorld(this.levelIndex, this.assets); this.world = w; const df = DIFFICULTY[getSettings().difficulty];
    this.p = {
      x: w.start.x, y: w.start.y - PH, w: PW, h: PH, vx: 0, vy: 0, onGround: true, hp: df.hp, maxHp: df.hp, facing: 1, inv: 0, shield: 0, speed: 0,
      shootT: 9, shootCd: 0, specialCd: 0, hurtT: 0, landT: 0, dieT: 0, animT: 0, climbing: false, dropT: 0, coyote: 0, jumpBuf: 0, specialT: 9,
    };
    this.safe = { x: this.p.x, y: this.p.y, t: 0 };
    this.anim.reset(); this.interactT = 0; this.collectT = 0; this.petCollectT = 0; this.shotPending = false;
    this.fallCount = 0; this.enemies = []; this.pickups = []; this.bins = []; this.shots = []; this.sludge = []; this.parts = []; this.texts = [];
    this.coins = 0; this.score = 0; this.materials = 0; this.runCollectibles = []; this.sinceBin = 0; this.time = 0; this.ended = false; this.boss = null; this.win = null; this.introT = getSettings().introAnim ? 0 : 99; this.portalSpin = 0;
    for (const s of w.walkers) {
      const sp = ENEMIES[s.type];
      // nasce dentro da faixa de patrulha e nunca dentro de caixa (se sobrepor, empurra para o lado livre mais próximo)
      const mnX = s.minX ?? s.x - 120, mxX = s.maxX ?? s.x + 120;
      let wx = s.x - sp.w / 2; if (mxX - mnX > sp.w) wx = Math.max(mnX, Math.min(mxX - sp.w, wx));
      for (let pass = 0; pass < 3; pass++) for (const c of w.surfaces) {
        if (c.kind !== 'crates') continue; const r = sfRect(c);
        if (wx < r.x + r.w + 2 && wx + sp.w > r.x - 2 && s.y > r.y) wx = wx + sp.w / 2 < r.x + r.w / 2 ? r.x - sp.w - 2 : r.x + r.w + 2;
      }
      this.enemies.push({ id: this.nextId++, kind: s.type, x: wx, y: s.y - sp.h, w: sp.w, h: sp.h, vx: 0, vy: 0, onGround: true, hp: Math.max(1, Math.round(sp.hp * df.enemyHp)), maxHp: Math.max(1, Math.round(sp.hp * df.enemyHp)), dir: Math.random() < 0.5 ? 1 : -1, minX: mnX, maxX: mxX, baseY: s.y, t: Math.random() * 5, hurt: 0, dying: 0, chasing: false, attacking: 0, turnCd: 0, ...initAi(Math.random, s.type) });
    }
    for (const s of w.flyers) {
      const sp = ENEMIES[s.type];
      this.enemies.push({ id: this.nextId++, kind: s.type, x: s.x, y: s.y, w: sp.w, h: sp.h, vx: 0, vy: 0, onGround: false, hp: Math.max(1, Math.round(sp.hp * df.enemyHp)), maxHp: Math.max(1, Math.round(sp.hp * df.enemyHp)), dir: Math.random() < 0.5 ? 1 : -1, minX: Math.max(40, s.x - 520), maxX: Math.min(w.width - 40, s.x + 520), baseY: s.y, t: Math.random() * 5, hurt: 0, dying: 0, chasing: false, attacking: 0, turnCd: 0, ...initAi(Math.random, s.type) });
    }
    for (const c of w.coins) this.pickups.push({ id: this.nextId++, type: 'coin', sprite: 'it_moeda', value: 'coin', x: c.x - 14, y: c.y - 14, w: 28, h: 28, taken: false, phase: Math.random() * 6, spawnKey: `coin:${Math.round(c.x)}:${Math.round(c.y)}` });
    for (const c of w.waste) { this.pickups.push({ id: this.nextId++, type: 'waste', sprite: 'it_' + c.type, value: c.type, x: c.x - 18, y: c.y - 18, w: 36, h: 36, taken: false, phase: Math.random() * 6, spawnKey: `material:${c.type}:${Math.round(c.x)}:${Math.round(c.y)}` }); this.totalMaterials++; }
    for (const c of w.powers) this.pickups.push({ id: this.nextId++, type: 'power', sprite: 'it_' + c.type, value: c.type, x: c.x - 20, y: c.y - 20, w: 40, h: 40, taken: false, phase: Math.random() * 6 });
    for (const b of w.bins) {
      const sz = this.assets.size(w.layout.bin); const sc = w.scale * 0.95;
      this.bins.push({ id: this.nextId++, sprite: w.layout.bin, x: b.x - sz.w * sc / 2, y: b.y - sz.h * sc, w: sz.w * sc, h: sz.h * sc, used: false, pulse: 0 });
    }
    if (w.bossAt) {
      const bw = this.levelIndex === GRANDE_LIXO_LEVEL ? 150 : 120, bh = this.levelIndex === GRANDE_LIXO_LEVEL ? 215 : 180; // o Grande Lixo é maior (≈250 px em tela)
      this.boss = { x: w.bossAt.x - bw / 2, y: w.bossAt.y - bh, w: bw, h: bh, vx: 0, vy: 0, onGround: true, hp: Math.round(28 * df.bossHp), maxHp: Math.round(28 * df.bossHp), dir: -1, ...initBoss(Math.random), hurt: 0, dying: 0, active: false };
    }
  }

  start(): void { this.last = performance.now(); const loop = (n: number) => { const raw = (n - this.last) / 1000; const dt = Math.min(0.033, raw); this.last = n; this.fpsT += raw; this.fpsFrames++; if (this.fpsT >= 0.5) { this.fps = Math.round(this.fpsFrames / this.fpsT); this.fpsT = 0; this.fpsFrames = 0; } if (!this.paused) { if (this.hitStop > 0) this.hitStop -= raw; else this.update(dt); } this.render(); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  destroy(): void { cancelAnimationFrame(this.raf); window.removeEventListener('keydown', this.kd); window.removeEventListener('keyup', this.ku); this.resizeObs.disconnect(); window.removeEventListener('blur', this.releaseAll); this.unsubSettings(); }
  restart(): void { this.reset(); }
  setControl(c: Control, v: boolean): void { this.keys[c] = v; }
  private say(text: string, t = 1.6): void { this.banner = { text, t }; this.cb.onAnnounce?.(text); }
  private resultNow(): LevelResult { return { coins: this.coins, score: this.score, materials: this.materials, totalMaterials: this.totalMaterials, hpLeft: this.p.hp, time: this.time, collectibles: [...this.runCollectibles] }; }

  private resize(): void {
    const host = this.canvas.parentElement ?? this.canvas; const r = host.getBoundingClientRect(); const dpr = Math.min(QUALITY[getSettings().quality].cap, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(r.width * dpr)); this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.canvas.style.width = r.width + 'px'; this.canvas.style.height = r.height + 'px';
    const aspect = r.width / Math.max(1, r.height);
    this.vw = Math.max(640, Math.min(1760, Math.round(VIEW_H * aspect)));
    this.cam = Math.max(0, Math.min(this.cam, Math.max(0, this.world.width - this.vw)));
  }

  // ---------------------------------------------------------------- physics
  /** Movimento com colisão (subpassos + rede de segurança): ver collision.ts. */
  private move(b: Body, dt: number, drop = false): void { moveBody(b, dt, this.world.surfaces, { drop, minX: 0, maxX: this.world.width }); }

  /** Pausa curtíssima no impacto (sensação de peso). Respeita a opção de tremor de tela. */
  private freeze(s: number): void { if (getSettings().screenShake) this.hitStop = Math.max(this.hitStop, s); }
  private spawnParts(x: number, y: number, color: string, n = 8, speed = 220): void {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = (0.4 + Math.random()) * speed; this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 0.5 + Math.random() * 0.4, max: 0.9, color, size: 3 + Math.random() * 4 }); }
  }
  private float(x: number, y: number, text: string, color = '#fff'): void { this.texts.push({ x, y, life: 1.1, text, color }); }

  private hurtPlayer(fromX: number): void {
    const p = this.p; if (p.inv > 0 || p.shield > 0 || p.dieT > 0) return;
    p.hp -= 1; this.cb.onAnnounce?.(p.hp <= 0 ? 'Você ficou sem vidas.' : `Você sofreu dano. ${p.hp} vida${p.hp === 1 ? '' : 's'} restante${p.hp === 1 ? '' : 's'}.`); p.inv = DIFFICULTY[getSettings().difficulty].invuln; p.hurtT = 0.45; audio.sfx(p.hp <= 0 ? 'lose' : 'hurt'); p.vy = -420; p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 280; p.climbing = false;
    this.shake = 0.25; this.freeze(0.1); this.spawnParts(p.x + p.w / 2, p.y + 40, '#ff6b6b', 10);
    if (p.hp <= 0) { p.dieT = 0.001; p.vx = 0; }
  }

  private damageEnemy(e: Enemy, dmg: number): void {
    if (e.dying > 0) return;
    e.hp -= dmg; this.cb.onAnnounce?.(e.hp <= 0 ? 'Inimigo derrotado.' : 'Ataque acertou um inimigo.'); e.hurt = 0.18; audio.sfx(e.hp <= 0 ? 'enemyDie' : 'hit'); this.freeze(e.hp <= 0 ? 0.08 : 0.045); if (e.hp <= 0) this.shake = Math.max(this.shake, 0.12); this.spawnParts(e.x + e.w / 2, e.y + e.h / 2, '#caff7a', 6, 160);
    if (e.hp <= 0) {
      kill(e); e.dying = 0.6; const sp = ENEMIES[e.kind]; this.score += sp.score; this.float(e.x + e.w / 2, e.y - 6, '+' + sp.score, '#ffe35b');
      if (Math.random() < 0.3) this.pickups.push({ id: this.nextId++, type: 'coin', sprite: 'it_moeda', value: 'coin', x: e.x + e.w / 2 - 14, y: e.y - 20, w: 28, h: 28, taken: false, phase: 0, spawnKey: `enemy-coin:${e.kind}:${Math.round(e.x)}:${Math.round(e.y)}` });
    } else hurtAi(e, e.kind, this.p.x + this.p.w / 2 < e.x + e.w / 2 ? 1 : -1); // atordoa e empurra para longe do herói
  }

  /**
   * Dano no chefão. `src`: tiro e especial sempre acertam; pisão e escudo respeitam a janela de 0,16 s (sem dano duplicado
   * no mesmo contato). Na transição de fase ele é invulnerável.
   */
  private damageBoss(d: number, src: 'shot' | 'blast' | 'stomp' | 'shield' = 'shot'): void {
    const b = this.boss; if (!b || b.state === 'dead') return;
    if (b.state === 'phase') { this.spawnParts(b.x + b.w / 2, b.y + 80, '#ffffff', 3, 120); return; }
    if ((src === 'stomp' || src === 'shield') && b.hurt > 0) return;
    b.hp -= d; b.hurt = 0.16; audio.sfx('bossHit'); this.freeze(0.06); this.spawnParts(b.x + b.w / 2, b.y + 80, '#b6ff6a', 6, 200);
    if (b.hp <= 0) { killBoss(b); b.dying = 1.6; this.sludge = []; audio.sfx('enemyDie'); audio.sfx('win'); this.score += 2000; this.float(b.x + b.w / 2, b.y - 10, '+2000', '#ffe35b'); this.say('MONSTRO DERROTADO! ALCANCE O PORTAL', 3); this.shake = 0.6; }
    else this.applyBossEvents(onDamaged(b));
  }

  private applyBossEvents(events: BossEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'slam') { this.shake = 0.5; audio.sfx('slam'); for (const v of ev.vx) this.sludge.push({ x: ev.x, y: ev.y, vx: v, life: 2.2, fx: 4 }); }
      else if (ev.type === 'spit') { audio.sfx('hit'); this.sludge.push({ x: ev.x, y: ev.y, vx: ev.vx, life: 2.4, fx: projectileFrame(ev.x * 7 + this.t * 100) }); }
      else if (ev.type === 'roar') { this.shake = 0.6; audio.sfx('bossRoar'); }
      else this.say(ev.text, 2.2);
    }
  }

  // ---------------------------------------------------------------- update
  private update(dt: number): void {
    if (this.ended) return;
    this.introT += dt;
    if (this.win) { this.updateWin(dt); return; }
    this.portalSpin += dt * 0.8;
    const p = this.p; const w = this.world; this.t += dt; this.time += dt;
    for (const k of ['inv', 'shield', 'speed', 'hurtT', 'landT', 'shootCd', 'specialCd', 'dropT', 'jumpBuf'] as const) p[k] = Math.max(0, p[k] - dt);
    this.interactT = Math.max(0, this.interactT - dt); this.collectT = Math.max(0, this.collectT - dt); this.petCollectT = Math.max(0, this.petCollectT - dt);
    p.shootT += dt; p.specialT += dt; p.animT += dt; this.shake = Math.max(0, this.shake - dt); this.specialFx = Math.max(0, this.specialFx - dt);
    this.banner.t = Math.max(0, this.banner.t - dt);

    if (p.dieT > 0) {
      p.dieT += dt; p.vy += GRAV * dt; this.move(p, dt); p.vx *= 0.9;
      if (p.dieT > 1.5) { this.ended = true; this.cb.onLose(this.resultNow()); }
      this.updateEnemies(dt); // a IA segue rodando: com o herói morto os bichos largam a perseguição em vez de congelar no meio do golpe
      this.updateWorldBits(dt); return;
    }

    // --- input
    const dir = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    const ladder = w.ladders.find((l) => overlap({ x: p.x + 8, y: p.y, w: p.w - 16, h: p.h }, l));
    const wantJump = this.keys.jump || (this.keys.up && !ladder);
    if (!p.climbing && ladder && (this.keys.up || (this.keys.down && !p.onGround))) p.climbing = true;
    if (p.climbing && !ladder) p.climbing = false;

    if (p.climbing && ladder) {
      p.vy = 0; p.vx = dir * 110; moveX(p, p.vx * dt, w.surfaces); p.x = Math.max(ladder.x - 10, Math.min(ladder.x + ladder.w - p.w + 10, p.x)); settle(p, w.surfaces, false);
      const cdy = ((this.keys.down ? 1 : 0) - (this.keys.up ? 1 : 0)) * 190 * dt; p.onGround = false; moveY(p, cdy, w.surfaces, true); if (p.onGround && cdy > 0) p.climbing = false; // sólidos ao lado da escada bloqueiam
      p.y = Math.min(p.y, ladder.y + ladder.h - p.h); if (p.y + p.h < ladder.y + 6) { p.y = ladder.y - p.h; p.climbing = false; p.onGround = true; }
      if (wantJump && !this.jumpWas) { p.climbing = false; p.vy = -JUMP_V * 0.75; p.vx = dir * 240; audio.sfx('jump'); }
      if (this.keys.down && p.y + p.h >= ladder.y + ladder.h - 2) p.climbing = false;
    } else {
      const maxV = p.speed > 0 ? 440 : 320;
      const target = dir * maxV; const acc = p.onGround ? 3200 : 2000;
      if (p.hurtT > 0.25) { /* knockback phase */ } else if (dir !== 0) { p.vx += Math.sign(target - p.vx) * acc * dt; if (Math.abs(p.vx - target) < acc * dt) p.vx = target; } else { const f = (p.onGround ? 3000 : 700) * dt; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; }
      if (dir !== 0) p.facing = dir as 1 | -1;
      if (p.onGround) p.coyote = 0.1; else p.coyote -= dt;
      if (wantJump && !this.jumpWas) p.jumpBuf = 0.12;
      if (p.jumpBuf > 0 && p.coyote > 0) { p.vy = -JUMP_V; p.onGround = false; p.coyote = 0; p.jumpBuf = 0; audio.sfx('jump'); this.spawnParts(p.x + p.w / 2, p.y + p.h, '#e8f7d8', 4, 110); }
      if (!wantJump && p.vy < -300) p.vy += GRAV * 1.3 * dt; // variable jump height
      if (this.keys.down && p.onGround) p.dropT = 0.25;
      p.vy += GRAV * dt; p.vy = Math.min(p.vy, 1400);
      const wasAir = !p.onGround; const vyBefore = p.vy;
      this.move(p, dt, p.dropT > 0);
      if (wasAir && p.onGround && vyBefore > 560) { p.landT = 0.2; audio.sfx('land'); this.spawnParts(p.x + p.w / 2, p.y + p.h, '#e8f7d8', 7, 150); this.shake = Math.max(this.shake, vyBefore > 900 ? 0.14 : 0); }
      this.dustT -= dt; if (p.onGround && Math.abs(p.vx) > 280 && this.dustT <= 0) { this.dustT = 0.11; this.spawnParts(p.x + p.w / 2 - p.facing * 14, p.y + p.h - 2, '#e8f7d8', 1, 60); }
    }
    this.jumpWas = wantJump;
    p.x = Math.max(0, Math.min(w.width - p.w, p.x));
    if (p.onGround && p.dropT <= 0) { this.safe.t += dt; if (this.safe.t > 0.35) { this.safe = { x: p.x, y: p.y, t: 0 }; this.fallCount = 0; } }

    // --- shooting / special
    if ((this.keys.shoot || getSettings().autoFire) && p.shootCd <= 0) {
      p.shootCd = 0.26; p.shootT = 0; this.shotPending = true;
    }
    // o tiro sai no quadro ativo do golpe (não no primeiro instante), alinhado com a pose e o som
    if (this.shotPending && p.shootT >= ATTACK_FIRE_T) {
      this.shotPending = false; audio.sfx('shoot');
      this.shots.push({ x: p.x + p.w / 2 + p.facing * 36, y: p.y + 40, vx: p.facing * 780, life: 1.1 });
    }
    if (this.keys.special && !this.specialWas && p.specialCd <= 0) {
      p.specialCd = DIFFICULTY[getSettings().difficulty].specialCd; p.specialT = 0; this.specialFx = 0.7; this.shake = 0.3; audio.sfx('special');
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      for (const e of this.enemies) if (e.dying <= 0 && Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < 340) this.damageEnemy(e, 3);
      if (this.boss && this.boss.active && Math.hypot(this.boss.x + 60 - cx, this.boss.y + 90 - cy) < 380) this.damageBoss(4, 'blast');
      this.sludge = []; this.say('ATAQUE ESPECIAL!', 0.9);
    }
    this.specialWas = this.keys.special;

    // --- fall hazard
    if (p.y > w.bottom + 90) {
      this.hurtPlayer(p.x); this.fallCount++;
      // volta exatamente para onde ele estava pisando (nunca para o vazio ao lado); se cair de novo sem pousar, usa o chão firme mais próximo
      let rx = this.safe.x, ry = this.safe.y - 4;
      if (this.fallCount >= 2) { const g = this.nearestGround(this.safe.x); if (g) { rx = Math.max(g.x + 8, Math.min(g.x + g.w - p.w - 8, this.safe.x)); ry = g.top - p.h - 2; } }
      p.x = Math.max(0, rx); p.y = ry; p.vx = 0; p.vy = 0; p.climbing = false; p.onGround = false; p.inv = Math.max(p.inv, DIFFICULTY[getSettings().difficulty].invuln); if (p.hp <= 0) { p.dieT = 0.001; }
    }

    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateWorldBits(dt);
    this.updatePickups();

    // --- hazards (cacti)
    for (const d of w.decor) if (d.hazard) {
      const sz = this.assets.size(d.tile); const r = { x: d.x - sz.w * d.scale * 0.28, y: d.y - sz.h * d.scale * 0.85, w: sz.w * d.scale * 0.56, h: sz.h * d.scale * 0.85 };
      if (overlap(p, r)) this.hurtPlayer(d.x);
    }
    // --- goal
    const gs = this.goalRect();
    if (overlap(p, gs)) {
      if (this.boss && this.boss.state !== 'dead') { if (this.banner.t <= 0) this.say(this.levelIndex === GRANDE_LIXO_LEVEL ? 'DERROTE O GRANDE LIXO!' : 'DERROTE O MONSTRO DO LIXÃO!', 1.6); }
      else this.startWin();
    }
    // --- camera
    const target = Math.max(0, Math.min(w.width - this.vw, p.x + p.w / 2 - this.vw / 2 + p.facing * 70));
    this.cam += (target - this.cam) * Math.min(1, dt * 6);
  }

  /** Chão sólido mais próximo de x (para reaparecer com segurança depois de cair em um vão). */
  private nearestGround(x: number): WSurface | null {
    let best: WSurface | null = null, bd = Infinity;
    for (const g of this.world.surfaces) { if (g.kind !== 'ground') continue; const d = x < g.x ? g.x - x : x > g.x + g.w ? x - (g.x + g.w) : 0; if (d < bd) { bd = d; best = g; } }
    return best;
  }

  // ---------------------------------------------------------------- vitória
  private get enemySpeed(): number { return DIFFICULTY[getSettings().difficulty].enemySpeed; }

  private startWin(): void {
    const p = this.p; const g = this.world.goal; this.score += p.hp * 100;
    audio.sfx('win'); this.win = { t: 0, phase: 'walk', hop: false, pt: 0, sx: 0, sy: 0, z: 1, glow: 0, armed: false, sparks: [] };
    p.vx = 0; p.climbing = false; this.shake = 0.2;
    this.float(g.x, g.y - 190, `+${p.hp * 100} VIDA`, '#9dffb0');
  }

  private updateWin(dt: number): void {
    const w = this.win!; const p = this.p; const g = this.world.goal; const cx = g.x, cy = g.y - 78;
    w.t += dt; w.pt += dt; this.t += dt; this.shake = Math.max(0, this.shake - dt); this.banner.t = 0;
    p.animT += dt; p.inv = 0; p.hurtT = 0; p.landT = Math.max(0, p.landT - dt); p.shootT += dt; p.shield = Math.max(0, p.shield - dt);
    const held = this.keys.jump || this.keys.shoot; if (!held) w.armed = true;
    if (w.armed && held && w.t > 0.8 && w.phase !== 'iris') { w.phase = 'iris'; w.pt = 0; w.sparks = []; }   // pular/atirar pula a animação
    const ZT = { walk: 1.06, suck: 1.12 + 0.26 * Math.min(1, w.pt / 0.85), burst: 1.44, iris: 1.55 } as const;
    w.z += (ZT[w.phase] - w.z) * Math.min(1, dt * 7);

    if (w.phase === 'walk') {
      const dx = cx - (p.x + p.w / 2);
      if (Math.abs(dx) > 10 && w.pt < 0.9) { p.facing = dx > 0 ? 1 : -1; p.vx = p.facing * 230; } else p.vx = 0;
      p.vy += GRAV * dt; this.move(p, dt);
      w.glow = Math.min(0.35, w.pt * 0.5);
      const arrived = (Math.abs(dx) <= 10 || w.pt >= 0.9) && p.onGround;
      if (arrived && !w.hop) { w.hop = true; p.vy = -430; p.onGround = false; }   // pulinho de comemoração ao chegar no portal
      else if (arrived || w.pt > 3.2) { w.phase = 'suck'; w.pt = 0; w.sx = p.x + p.w / 2; w.sy = p.y + p.h * 0.55; p.vx = 0; this.shake = 0.15; }
    } else if (w.phase === 'suck') {
      const u = Math.min(1, w.pt / 0.85); w.glow = 0.35 + 0.55 * u;
      for (let i = 0; i < 2; i++) w.sparks.push({ a: Math.random() * Math.PI * 2, r: 150 + Math.random() * 110, w: 4 + Math.random() * 3, s: 170 + Math.random() * 150, c: Math.floor(Math.random() * 3) });
      this.shake = Math.max(this.shake, 0.06 + 0.1 * u);
      if (w.pt >= 0.85) {
        w.phase = 'burst'; w.pt = 0; w.sparks = []; this.shake = 0.55;
        this.spawnParts(cx, cy, '#eafff0', 22, 520); this.spawnParts(cx, cy, '#7dffaa', 26, 420); this.spawnParts(cx, cy, '#ffe35b', 16, 360);
      }
    } else if (w.phase === 'burst') {
      w.glow = 1 - 0.6 * Math.min(1, w.pt / 0.7);
      if (w.pt >= 0.7) { w.phase = 'iris'; w.pt = 0; }
    } else {
      w.glow = 0.3;
      if (w.pt >= 0.6 && !this.ended) { this.ended = true; this.cb.onWin(this.resultNow()); }
    }
    this.portalSpin += dt * (0.8 + 9 * w.glow);
    for (const s of w.sparks) { s.a += s.w * dt; s.r -= s.s * dt * (1 + (w.pt / 0.85) * 2.5); }
    w.sparks = w.sparks.filter((s) => s.r > 6);
    for (const q of this.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 700 * dt; q.life -= dt; }
    this.parts = this.parts.filter((q) => q.life > 0);
    for (const q of this.texts) { q.y -= 38 * dt; q.life -= dt; }
    this.texts = this.texts.filter((q) => q.life > 0);
    const target = Math.max(0, Math.min(this.world.width - this.vw, cx - this.vw / 2));
    this.cam += (target - this.cam) * Math.min(1, dt * 4);
  }

  private goalRect(): Rect { const g = this.world.goal; return { x: g.x - 50, y: g.y - 260, w: 100, h: 260 }; }

  private updateEnemies(dt: number): void {
    const p = this.p;
    for (const e of this.enemies) {
      const sp = ENEMIES[e.kind], pr = AI[e.kind]; e.t += dt; e.hurt = Math.max(0, e.hurt - dt);
      if (e.dying > 0) { e.dying -= dt; e.y += (sp.fly ? 90 : 0) * dt; continue; }
      const dx = p.x + p.w / 2 - (e.x + e.w / 2), dy = p.y + p.h / 2 - (e.y + e.h / 2);
      const ctx: TickCtx = {
        dt, speedMul: this.enemySpeed, dx, dy, gap: Math.abs(dx) - e.w / 2 - p.w / 2, playerAlive: p.dieT <= 0,
        inLeash: e.x + e.w / 2 > e.minX - 40 && e.x + e.w / 2 < e.maxX + 40, rand: Math.random,
      };
      if (sp.fly) {
        stepFlyer(e, pr, ctx); const near = e.chasing;
        if (e.state === 'hurt') e.x += e.vx * dt; // atordoado: só o empurrão
        else if (e.kind === 'cloud') { e.x += (near ? Math.sign(dx) : e.dir) * sp.speed * this.enemySpeed * dt; e.y += (near ? Math.sign(dy) * 20 : 0) * dt + Math.sin(e.t * 1.6) * 0.6; }
        else if (near) { e.x += Math.sign(dx) * sp.speed * this.enemySpeed * 0.95 * dt; e.baseY += Math.sign(dy) * 55 * dt; e.y = e.baseY + Math.sin(e.t * 4 + e.id) * 24; }
        else { e.x += e.dir * sp.speed * this.enemySpeed * 0.5 * dt; if (e.x < e.minX) e.dir = 1; if (e.x > e.maxX) e.dir = -1; e.y = e.baseY + Math.sin(e.t * 2 + e.id) * 34; }
        e.baseY = Math.max(90, Math.min(VIEW_H - 190, e.baseY));
        if (e.kind !== 'cloud' && !near) e.dir = e.x < e.minX ? 1 : e.x > e.maxX ? -1 : e.dir;
      } else {
        stepGround(e, sp.speed, pr, ctx); // decide estado e velocidade desejada
        e.vy += GRAV * dt;
        const px = e.x, vx0 = e.vx; this.move(e, dt);
        const away = e.state === 'hurt'; // empurrão de dano: não vira nem muda de estado ao bater
        // bateu num objeto (caixa, parede) ou chegou na borda: o bote para, a patrulha vira (com um instante sem perseguir)
        if (vx0 !== 0 && e.vx === 0) { if (!away) bump(e, e.kind, Math.random); }
        else if (e.onGround && !this.groundAhead(e, away ? ((Math.sign(vx0) || e.dir) as 1 | -1) : e.dir)) { e.x = px; e.vx = 0; if (!away) bump(e, e.kind, Math.random); }
        if (e.x < 0) { e.x = 0; e.dir = 1; }
        e.attacking = e.state === 'windup' || e.state === 'strike' ? 0.1 : 0; // compatibilidade com o desenho
      }
      if (sp.fly) { const y0 = e.y; settle(e, this.world.surfaces, false); if (e.y !== y0) e.baseY += e.y - y0; }
      // contato e golpe: o corpo machuca, exceto na recuperação e no atordoamento (janela para o jogador); o bote tem alcance extra
      if (p.dieT <= 0) {
        const hb = playerHurtbox(p), atk = pr.attack;
        const touching = overlap(hb, e);
        const striking = !!atk && e.state === 'strike' && overlap(hb, strikeBox(e, atk.reach));
        if (touching && p.shield > 0) { if (e.hurt <= 0) this.damageEnemy(e, 2); moveX(e, Math.sign(-dx) * 30, this.world.surfaces, { minX: 0, maxX: this.world.width }); }
        else if (touching && p.vy > 160 && p.y + p.h < e.y + e.h * 0.7 && !p.onGround) { this.damageEnemy(e, 2); p.vy = -560; }
        else if (p.shield <= 0 && (striking || (touching && e.state !== 'recover' && e.state !== 'hurt'))) this.hurtPlayer(e.x + e.w / 2);
      }
    }
    this.enemies = this.enemies.filter((e) => e.dying > -1 && !(e.dying <= 0 && e.hp <= 0));
  }

  private groundAhead(e: Enemy, dir: 1 | -1 = e.dir): boolean {
    const fx = e.x + e.w / 2 + dir * (e.w / 2 + 8); const fy = e.y + e.h + 10;
    return this.world.surfaces.some((s) => fx >= s.x && fx <= s.x + s.w && fy >= s.top && fy <= s.top + Math.max(s.h, 24));
  }

  private updateBoss(dt: number): void {
    const b = this.boss; if (!b) return; const p = this.p;
    if (b.state === 'dead') { b.dying -= dt; return; }
    b.hurt = Math.max(0, b.hurt - dt);
    if (!b.active) { if (p.x > b.x - 780) { b.active = true; audio.sfx('bossRoar'); this.say(this.levelIndex === GRANDE_LIXO_LEVEL ? 'O GRANDE LIXO!' : 'MONSTRO DO LIXÃO!', 2); } else return; }
    const dx = p.x + p.w / 2 - (b.x + b.w / 2);
    this.applyBossEvents(stepBoss(b, { dt, dx, playerAlive: p.dieT <= 0, blocked: this.bossBlocked, rand: Math.random }));
    b.vy += GRAV * dt;
    // a arena vai da borda esquerda do chefão (1500 px antes do fim) até o fim do mapa; parede/limite barram a investida
    const vx0 = b.vx; moveBody(b, dt, this.world.surfaces, { minX: this.world.width - 1500, maxX: this.world.width });
    this.bossBlocked = b.state === 'charge' && vx0 !== 0 && b.vx === 0;
    if (p.dieT <= 0 && overlap(playerHurtbox(p), bossTouch(b))) {
      if (p.shield > 0) { if (b.hurt <= 0 && b.state !== 'phase') { this.damageBoss(1, 'shield'); p.vx = -b.dir * 400; p.shield = Math.max(0, p.shield - 1.5); } }
      else if (p.vy > 160 && p.y + p.h < b.y + 70 && !p.onGround) { this.damageBoss(2, 'stomp'); p.vy = -650; }
      else if (bossHarmful(b.state)) this.hurtPlayer(b.x + b.w / 2); // na recuperação e na transição o toque não machuca
    }
  }

  private updateWorldBits(dt: number): void {
    const p = this.p;
    for (const s of this.shots) {
      const x0 = s.x; s.x += s.vx * dt; s.life -= dt; if (s.life <= 0) continue;
      // varre o trajeto do quadro (não só a posição final) e atinge o alvo mais próximo: nada é atravessado por um tiro rápido
      const sw = sweptBox(x0, s.x, s.y, 20, 10), sws = sweptBox(x0, s.x, s.y, 6, 6);
      const cand: { box: Box; e?: Enemy; boss?: true }[] = [];
      for (const e of this.enemies) if (e.dying <= 0 && overlap(sw, e)) cand.push({ box: e, e });
      const b = this.boss; if (b && b.state !== 'dead' && b.active && overlap(sw, bossBody(b))) cand.push({ box: bossBody(b), boss: true });
      for (const sf of this.world.surfaces) if (sf.solid && overlap(sws, sfRect(sf))) cand.push({ box: sfRect(sf) });
      const hit = nearestAlong(x0, s.x, cand); if (!hit) continue;
      if (hit.e) this.damageEnemy(hit.e, 1); else if (hit.boss) this.damageBoss(1); else this.spawnParts(s.x, s.y, '#8cff8c', 4, 120);
      s.life = 0;
    }
    this.shots = this.shots.filter((s) => s.life > 0);
    for (const s of this.sludge) {
      s.x += s.vx * dt; s.life -= dt;
      if (p.dieT <= 0 && overlap(p, { x: s.x - 22, y: s.y - 26, w: 44, h: 36 })) { this.hurtPlayer(s.x); s.life = 0; }
    }
    this.sludge = this.sludge.filter((s) => s.life > 0);
    for (const q of this.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 700 * dt; q.life -= dt; }
    this.parts = this.parts.filter((q) => q.life > 0);
    for (const t of this.texts) { t.y -= 38 * dt; t.life -= dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const b of this.bins) b.pulse = Math.max(0, b.pulse - dt);
  }

  private updatePickups(): void {
    const p = this.p;
    for (const k of this.pickups) {
      if (k.taken || !overlap(p, { x: k.x - 6, y: k.y - 6, w: k.w + 12, h: k.h + 12 })) continue;
      k.taken = true; this.collectT = 0.45; this.petCollectT = 0.6; const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
      if (k.type === 'coin') { this.runCollectibles.push({ id: k.spawnKey ?? `coin:${k.id}`, type: 'coin' }); audio.sfx('coin'); this.spawnParts(k.x + k.w / 2, k.y + k.h / 2, '#ffe35b', 6, 150); this.coins++; this.cb.onAnnounce?.(`Moeda coletada. Total: ${this.coins}.`); this.score += 10; this.spawnParts(cx, cy, '#ffd84a', 4, 120); }
      else if (k.type === 'waste') { this.runCollectibles.push({ id: k.spawnKey ?? `material:${k.id}`, type: 'material', material: k.value }); audio.sfx('waste'); this.spawnParts(k.x + k.w / 2, k.y + k.h / 2, '#7dff9a', 6, 150); this.materials++; this.sinceBin++; this.cb.onAnnounce?.(`Resíduo recolhido. ${this.materials} de ${this.totalMaterials}.`); const v = WASTE_VALUE[k.value as keyof typeof WASTE_VALUE] ?? 50; this.score += v; this.float(cx, cy - 10, '+' + v, '#9dffb0'); this.spawnParts(cx, cy, '#9dffb0', 6, 150); }
      else {
        this.score += 100; audio.sfx('power');
        if (k.value === 'escudo') { p.shield = 7; this.say('ESCUDO ATIVO!', 1.2); }
        else if (k.value === 'velocidade') { p.speed = 7; this.say('VELOCIDADE!', 1.2); }
        else if (p.hp < p.maxHp) { p.hp++; this.cb.onAnnounce?.(`Vida recuperada. ${p.hp} de ${p.maxHp}.`); this.float(cx, cy, '+1 ♥', '#ff7a8a'); } else this.float(cx, cy, '+100', '#ffe35b');
        this.spawnParts(cx, cy, '#7fe9ff', 10, 180);
      }
    }
    for (const b of this.bins) {
      if (b.used || !overlap(p, b)) continue;
      b.used = true; b.pulse = 0.8; this.interactT = INTERACT_TIME; audio.sfx('bin'); this.safe = { x: b.x + b.w / 2, y: b.y + b.h - PH, t: 0 };
      const bonus = this.sinceBin * 25; this.score += bonus + 50; this.sinceBin = 0;
      if (p.hp < p.maxHp) p.hp++;
      this.cb.onAnnounce?.(`Checkpoint ativado. Vida ${p.hp} de ${p.maxHp}; resíduos reciclados: ${this.materials} de ${this.totalMaterials}.`);
      this.float(b.x + b.w / 2, b.y - 10, bonus ? `♻ RECICLADO +${bonus + 50}` : '♻ CHECKPOINT', '#9dffb0'); this.spawnParts(b.x + b.w / 2, b.y + 20, '#7dff9a', 14, 220);
    }
  }

  // ---------------------------------------------------------------- render helpers
  private band(img: CanvasImageSource, sx: number, sy: number, tw: number, bh: number, dx: number, dy: number, dw: number, dh: number, cap: number, s: number): void {
    const a = this.assets;
    if (dw < cap * 2 * s * 1.1) { a.region(this.ctx, img, sx, sy, tw, bh, dx, dy, dw, dh); return; }
    a.region(this.ctx, img, sx, sy, cap, bh, dx, dy, cap * s + 0.5, dh);
    a.region(this.ctx, img, sx + tw - cap, sy, cap, bh, dx + dw - cap * s, dy, cap * s + 0.5, dh);
    // miolo repetido em espelho (ping-pong) e em quantidade ímpar: toda emenda encontra o mesmo pixel do outro lado
    const mw = tw - cap * 2; const midW = dw - 2 * cap * s; const r = midW / (mw * s);
    let n = Math.max(1, Math.round(r)); if (n % 2 === 0) n += r >= n ? 1 : -1;
    const cw = midW / n;
    for (let i = 0; i < n; i++) a.region(this.ctx, img, sx + cap, sy, mw, bh, dx + cap * s + i * cw, dy, cw + 0.5, dh, i % 2 === 1);
  }

  /** Topo da superfície mais próxima abaixo de (x, y): onde a sombra de contato de um objeto cai. */
  private groundBelow(x: number, y: number): number | null {
    let best: number | null = null;
    for (const s of this.world.surfaces) {
      if (x < s.x + 4 || x > s.x + s.w - 4 || s.top < y - 6) continue;
      if (best === null || s.top < best) best = s.top;
    }
    return best;
  }

  /** Sombra de contato suave (elipse achatada) na cor de sombra do cenário. `air` = altura acima do chão (encolhe e esmaece). */
  private shadow(cx: number, gy: number, rx: number, strength = 1, air = 0): void {
    const ctx = this.ctx; const [r, g, b] = this.assets.look.shadow ?? [14, 24, 34];
    const f = Math.max(0, 1 - air / 260); if (f <= 0.02) return;
    const R = rx * (0.6 + 0.4 * f);
    ctx.save(); ctx.translate(cx, gy + 2); ctx.scale(1, 0.24);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    const a = 0.62 * strength * f;
    gr.addColorStop(0, `rgba(${r | 0},${g | 0},${b | 0},${a})`); gr.addColorStop(0.55, `rgba(${r | 0},${g | 0},${b | 0},${a * 0.55})`); gr.addColorStop(1, `rgba(${r | 0},${g | 0},${b | 0},0)`);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  /** Sombra projetada por plataformas/pontes no cenário atrás delas (assenta a peça no fundo). */
  private underShadow(sf: WSurface): void {
    const ctx = this.ctx; const [r, g, b] = this.assets.look.shadow ?? [14, 24, 34];
    const y0 = sf.top + (sf.kind === 'bridge' ? 4 : 10); const h = 34;
    const gr = ctx.createLinearGradient(0, y0, 0, y0 + h);
    gr.addColorStop(0, `rgba(${r | 0},${g | 0},${b | 0},0.34)`); gr.addColorStop(1, `rgba(${r | 0},${g | 0},${b | 0},0)`);
    ctx.save(); ctx.fillStyle = gr; ctx.fillRect(sf.x + 6, y0, Math.max(0, sf.w - 12), h); ctx.restore();
  }

  /** Grade final por cima do mundo: vinheta e luz suave na cor do cenário, ligando fundo e objetos num só quadro. */
  private drawGrade(): void {
    const ctx = this.ctx; const cw = this.canvas.width, ch = this.canvas.height; const { shadow, light, haze } = this.assets.look;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    // luz de cima, quente/fria conforme o céu da fase
    ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.16;
    const lg = ctx.createLinearGradient(0, 0, 0, ch); lg.addColorStop(0, `rgb(${light.map((v) => v | 0).join(',')})`); lg.addColorStop(0.55, `rgb(${haze.map((v) => v | 0).join(',')})`); lg.addColorStop(1, `rgb(${haze.map((v) => v | 0).join(',')})`);
    ctx.fillStyle = lg; ctx.fillRect(0, 0, cw, ch);
    // vinheta
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    const vg = ctx.createRadialGradient(cw / 2, ch * 0.55, Math.min(cw, ch) * 0.45, cw / 2, ch * 0.55, Math.hypot(cw, ch) * 0.62);
    vg.addColorStop(0, `rgba(${shadow.map((v) => v | 0).join(',')},0)`); vg.addColorStop(1, `rgba(${shadow.map((v) => v | 0).join(',')},0.2)`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch);
    ctx.restore();
  }

  private drawSurface(sf: WSurface): void {
    if (sf.kind === 'plat' || sf.kind === 'bridge') this.underShadow(sf);
    const src = this.assets.src(sf.tile); if (!src) return; const s = this.world.scale;
    const { img, x: sx, y: sy, w: tw, h: th } = src; const cap = Math.max(4, Math.round(tw * 0.2));
    if (sf.kind === 'crates') { const ch = sf.h / sf.rows; for (let r = 0; r < sf.rows; r++) this.assets.region(this.ctx, img, sx, sy, tw, th, sf.x, sf.top + r * ch, sf.w, ch); return; }
    if (sf.kind === 'bridge') { const sc = s * 0.85; const dh = th * sc; this.band(img, sx, sy, tw, th, sf.x, sf.top - dh * 0.38, sf.w, dh, Math.round(tw * 0.18), sc); return; }
    const lip = Math.round(th * (this.assets.lipOf?.(sf.tile) ?? 0.1)) * s;
    if (sf.kind === 'plat') { const topH = Math.round(th * 0.62); this.band(img, sx, sy, tw, topH, sf.x, sf.top - lip, sf.w, topH * s, cap, s); return; }
    const topH = Math.round(th * 0.5);
    // corpo repetido: só as linhas internas (sem a borda irregular de baixo) e espelhado na vertical,
    // assim as emendas se encontram no mesmo pixel e não aparecem listras escuras entre as repetições
    const bodyH = Math.max(4, th - topH - Math.round(th * 0.14));
    this.band(img, sx, sy, tw, topH, sf.x, sf.top - lip, sf.w, topH * s, cap, s);
    const ctx = this.ctx; const dh = bodyH * s;
    let i = 0;
    for (let y = sf.top - lip + topH * s - 0.5; y < VIEW_H + 24; y += dh - 0.5, i++) {
      if (i % 2) { ctx.save(); ctx.translate(0, 2 * y + dh); ctx.scale(1, -1); this.band(img, sx, sy + topH, tw, bodyH, sf.x, y, sf.w, dh, cap, s); ctx.restore(); }
      else this.band(img, sx, sy + topH, tw, bodyH, sf.x, y, sf.w, dh, cap, s);
    }
  }

  private playerFrame(): { name: string; alpha: number; state: string } {
    const p = this.p; const k = this.keys;
    const f = this.anim.update({
      t: p.animT, onGround: p.onGround, vx: p.vx, vy: p.vy, climbing: p.climbing, climbMoving: k.up || k.down || Math.abs(p.vx) > 20,
      dead: p.dieT > 0, dieT: p.dieT, hurtT: p.hurtT, landT: p.landT, collectT: this.collectT, shootT: p.shootT, specialT: p.specialT, interactT: this.interactT,
      victory: !!this.win && this.win.phase === 'walk',
    });
    return { name: f.name, state: f.state, alpha: p.inv > 0 && p.dieT <= 0 && Math.floor(p.inv * 14) % 2 ? 0.45 : 1 };
  }

  private drawPet(ctx: CanvasRenderingContext2D): void {
    const pet=this.appearance.petId; if (!pet) return; const p=this.p;
    const frame=this.assets.petFrame?.(pet,this.petCollectT>0?'collect':Math.abs(p.vx)>35?'follow':'idle',this.t);
    if (!frame) return; const x=p.x+(p.facing>0?-20:46); const y=p.y+54+Math.sin(this.t*4)*3;
    this.assets.draw(ctx,frame,x,y,{scale:0.72,anchor:'center',flip:p.facing<0});
  }

  private enemyFrame(e: Enemy): string {
    const sp = ENEMIES[e.kind];
    if (e.dying > 0 && sp.die) return sp.die;
    if (e.kind === 'rat') { if (e.state === 'strike' && sp.attack) return sp.attack; if (e.state === 'windup' || e.state === 'recover') return sp.frames[1]!; if (e.chasing && sp.chase) return Math.floor(e.t * 10) % 2 ? sp.chase : sp.frames[0]!; return sp.frames[Math.floor(e.t * 4) % 2]!; }
    if (e.kind === 'fly') return e.chasing && Math.floor(e.t * 14) % 2 ? 'fly_2' : sp.frames[Math.floor(e.t * 18) % 2]!;
    return sp.frames[Math.floor(e.t * 6) % sp.frames.length]!;
  }

  /** Pose animada por código para os bichos de bioma (sprites estáticos de um quadro só). `face` = lado para onde olha (1 = direita). */
  private enemyPose(e: Enemy, sp: EnemySpec, face: 1 | -1): { sx: number; sy: number; rot: number; dy: number } {
    const t = e.t, run = e.chasing ? 1.5 : 1;
    let sx = 1, sy = 1, rot = 0, dy = 0;
    switch (sp.motion) {
      case 'swim': { const w = t * 7 * run; rot = Math.sin(w) * 0.1 + (e.chasing ? face * 0.08 : 0); sx = 1 + Math.sin(w * 2) * 0.05; sy = 1 - Math.sin(w * 2) * 0.03; break; }
      case 'stomp': { const w = t * 5 * run, k = Math.abs(Math.sin(w)); rot = Math.sin(w) * 0.06; sy = 0.94 + 0.06 * k; sx = 1.04 - 0.04 * k; break; }
      case 'sway': { const w = t * 3.2 * run; rot = Math.sin(w) * 0.05; sy = 1 + Math.sin(w * 2) * 0.025; sx = 1 - Math.sin(w * 2) * 0.015; break; }
      case 'scuttle': { const w = t * 14 * run; rot = Math.sin(w) * 0.05; sx = 1 + Math.sin(w * 2) * 0.04; dy = -Math.abs(Math.sin(w)) * 2; break; }
      case 'slither': { const w = t * 9 * run; sx = 1 + Math.sin(w) * 0.05; sy = 1 - Math.sin(w) * 0.03; rot = Math.sin(w * 0.5) * 0.035; break; }
      case 'hover': { rot = Math.sin(t * 3) * 0.04 + (e.chasing ? face * 0.14 : 0); dy = Math.sin(t * 5 + e.id) * 3; sx = 1 + Math.sin(t * 34) * 0.025; break; }
      case 'hop': { const k = Math.abs(Math.sin(t * 4 * run)); dy = -k * 9; sy = 1 + (k - 0.5) * 0.14; sx = 1 - (k - 0.5) * 0.1; break; }
    }
    if (e.hurt > 0) { sx *= 1.12; sy *= 0.9; }
    if (e.dying > 0 && !sp.die) { const u = Math.min(1, Math.max(0, 1 - e.dying / 0.6)); rot += u * (sp.fly ? 5 : 1.4) * face; if (!sp.fly) sy *= 1 - 0.35 * u; }
    const ap = this.aiPose(e); sx *= ap.sx; sy *= ap.sy; rot += ap.rot;
    return { sx, sy, rot, dy };
  }

  /** Pose do ataque: encolhe e se inclina para trás na preparação, estica no golpe, afunda na recuperação (só bichos que atacam). */
  private aiPose(e: Enemy): { sx: number; sy: number; rot: number } {
    const atk = AI[e.kind].attack, d = e.dir;
    if (!atk) return { sx: 1, sy: 1, rot: 0 };
    switch (e.state) {
      case 'windup': { const u = Math.min(1, e.stateT / atk.windup); return { sx: 1 + 0.08 * u, sy: 1 - 0.14 * u, rot: -d * 0.2 * u }; }
      case 'strike': return { sx: 1.16, sy: 0.9, rot: d * 0.12 };
      case 'recover': { const u = Math.min(1, e.stateT / atk.recover); return { sx: 1.04 - 0.04 * u, sy: 0.92 + 0.08 * u, rot: d * 0.06 * (1 - u) }; }
      default: return { sx: 1, sy: 1, rot: 0 };
    }
  }

  // ---------------------------------------------------------------- render
  private render(): void {
    const ctx = this.ctx; const cw = this.canvas.width, ch = this.canvas.height; const w = this.world; const a = this.assets;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#04120c'; ctx.fillRect(0, 0, cw, ch);
    const VIEW_W = this.vw; const k = Math.min(cw / VIEW_W, ch / VIEW_H); const ox = (cw - VIEW_W * k) / 2, oy = (ch - VIEW_H * k) / 2;
    ctx.setTransform(k, 0, 0, k, ox, oy); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = getSettings().quality === 'low' ? 'low' : 'high';
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VIEW_W, VIEW_H); ctx.clip();
    const sh = this.shake > 0 && getSettings().screenShake ? (Math.random() - 0.5) * 12 * Math.min(1, this.shake * 3) : 0;
    ctx.translate(sh, sh * 0.6);
    const cam = Math.round(this.cam);
    if (this.win && this.win.z !== 1) { const zx = w.goal.x - cam, zy = w.goal.y - 78, z = this.win.z; ctx.translate(zx, zy); ctx.scale(z, z); ctx.translate(-zx, -zy); }

    // New islands use four cached parallax layers; original eight phases keep their painted backdrops.
    const layers=a.islandLayers?.get(this.levelIndex);
    if (layers) {
      for (const [name,rate] of [['sky',0],['far',0.12],['mid',0.3],['near',0.52]] as const) {
        const img=layers[name]; if (!img) continue; const shift=(cam*rate)%VIEW_W;
        ctx.drawImage(img,-shift,0,VIEW_W,VIEW_H); if (shift>0) ctx.drawImage(img,VIEW_W-shift,0,VIEW_W,VIEW_H);
      }
    } else {
      const scene = a.scenes.get(this.levelIndex + 1);
      if (scene) for (let i = 0; i < w.layout.screens; i++) {
        const x = i * w.screenW - cam; if (x > VIEW_W || x + w.screenW < 0) continue;
        if (i % 2) { ctx.save(); ctx.translate(x + w.screenW, 0); ctx.scale(-1, 1); ctx.drawImage(scene, 0, 0, w.screenW + 1.5, VIEW_H); ctx.restore(); }
        else ctx.drawImage(scene, x - 0.5, 0, w.screenW + 1.5, VIEW_H);
      }
    }
    ctx.translate(-cam, 0);
    const vis = (x: number, wd: number) => x + wd > cam - 80 && x < cam + VIEW_W + 80;

    // ladders
    const esc = a.src('ob_escada');
    if (esc) for (const l of w.ladders) {
      if (!vis(l.x, l.w)) continue; const sc = l.w / esc.w; const seg = esc.h * sc;
      for (let y = l.y + l.h - seg; y > l.y - seg + 1; y -= seg) { const top = Math.max(y, l.y); const part = (y + seg) - top; a.region(ctx, esc.img, esc.x, esc.y + (esc.h - part / sc), esc.w, part / sc, l.x, top, l.w, part); }
    }
    for (const d of w.decor) if (vis(d.x - 80, 160)) {
      if (!d.hazard && !/coin|ring|cloud/i.test(d.tile)) this.shadow(d.x, d.y + 2, Math.min(90, a.size(d.tile).w * d.scale * 0.42), 0.7);
      a.draw(ctx, d.tile, d.x, d.y + 2, { scale: d.scale, anchor: 'feet' });
    }
    for (const sf of w.surfaces) if (vis(sf.x, sf.w)) this.drawSurface(sf);
    for (const b of this.bins) if (vis(b.x, b.w)) {
      if (b.pulse > 0) { ctx.save(); ctx.globalAlpha = b.pulse; ctx.fillStyle = '#7dff9a'; ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 60 + (0.8 - b.pulse) * 90, 0, 7); ctx.fill(); ctx.restore(); }
      this.shadow(b.x + b.w / 2, b.y + b.h, b.w * 0.62, 0.9);
      a.draw(ctx, b.sprite, b.x + b.w / 2, b.y + b.h, { scale: w.scale * 0.95, alpha: b.used ? 0.85 : 1 });
      if (!b.used) { ctx.fillStyle = '#7dff9a'; ctx.font = '700 15px system-ui'; ctx.textAlign = 'center'; ctx.fillText('♻', b.x + b.w / 2, b.y - 8 + Math.sin(this.t * 3) * 3); }
    }
    this.drawGoal();
    for (const q of this.pickups) {
      if (q.taken || !vis(q.x, q.w)) continue; const bob = Math.sin(this.t * 3 + q.phase) * 5;
      const sc = q.type === 'coin' ? 0.62 : q.type === 'waste' ? 0.72 : 0.9;
      if (q.type !== 'coin') { ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = q.type === 'power' ? '#7fe9ff' : '#9dffb0'; ctx.beginPath(); ctx.arc(q.x + q.w / 2, q.y + q.h / 2 + bob, 26, 0, 7); ctx.fill(); ctx.restore(); }
      if (q.type !== 'coin') { const gy = this.groundBelow(q.x + q.w / 2, q.y + q.h); if (gy !== null) this.shadow(q.x + q.w / 2, gy, 17, 0.55, gy - (q.y + q.h + bob)); }
      a.draw(ctx, q.sprite, q.x + q.w / 2, q.y + q.h / 2 + bob, { scale: sc, anchor: 'center' });
    }
    for (const e of this.enemies) {
      if (!vis(e.x, e.w)) continue; const sp = ENEMIES[e.kind]; const name = this.enemyFrame(e);
      const faceDir = e.chasing && sp.fly ? (this.p.x < e.x ? -1 : 1) : e.dir; const flip = sp.noFlip ? false : sp.nativeLeft ? faceDir > 0 : faceDir < 0;
      const bob = sp.fly ? 0 : Math.abs(Math.sin(e.t * 8)) * 2;
      if (e.dying <= 0) { const gy = sp.fly ? this.groundBelow(e.x + e.w / 2, e.y + e.h) : e.y + e.h; if (gy !== null) this.shadow(e.x + e.w / 2, gy, e.w * 0.55, 0.85, sp.fly ? gy - (e.y + e.h) : 0); }
      ctx.save(); if (e.hurt > 0) ctx.filter = 'brightness(2.2)'; else if (e.state === 'windup') ctx.filter = 'brightness(1.4) saturate(1.5)'; /* brilha na preparação do golpe (aviso) */
      if (e.dying > 0) ctx.globalAlpha = Math.max(0, e.dying / 0.6);
      if (sp.motion) {
        // sprite estático: pose (inclinação, squash/stretch, deslocamento) calculada por código
        const pose = this.enemyPose(e, sp, faceDir >= 0 ? 1 : -1);
        ctx.translate(e.x + e.w / 2, (sp.fly ? e.y + e.h / 2 : e.y + e.h + 2 - bob) + pose.dy); ctx.rotate(pose.rot); ctx.scale(pose.sx, pose.sy);
        a.draw(ctx, name, 0, 0, sp.fly ? { scale: sp.scale, flip, anchor: 'center' } : { scale: sp.scale, flip });
      }
      else if (sp.fly) a.draw(ctx, name, e.x + e.w / 2, e.y + e.h / 2, { scale: sp.scale, flip, anchor: 'center' });
      else { const ap = this.aiPose(e); ctx.translate(e.x + e.w / 2, e.y + e.h + 2 - bob); ctx.rotate(ap.rot); ctx.scale(ap.sx, ap.sy); a.draw(ctx, name, 0, 0, { scale: sp.scale, flip }); }
      ctx.restore();
      if (e.dying <= 0 && e.hp < e.maxHp) { ctx.fillStyle = '#0008'; ctx.fillRect(e.x, e.y - 10, e.w, 5); ctx.fillStyle = '#ff6b6b'; ctx.fillRect(e.x, e.y - 10, e.w * Math.max(0, e.hp / e.maxHp), 5); }
    }
    this.drawBoss();
    for (const s of this.sludge) {
      // fase 16: o Grande Lixo arremessa lixeira, garrafa, lata e saco (girando) e bolas de lodo pelo chão
      if (this.levelIndex === GRANDE_LIXO_LEVEL && s.fx !== undefined && this.assets.drawHero) {
        ctx.save(); ctx.translate(s.x, s.y); if (s.fx < 4) ctx.rotate(this.t * 9 * (s.vx >= 0 ? 1 : -1));
        const drawn = this.assets.drawHero(ctx, 'grande_lixo', '', 'proj', s.fx, 0, 0, { anchor: 'center', scale: s.fx === 4 ? 0.5 : 0.36, flip: s.fx === 4 && s.vx < 0 }); ctx.restore(); if (drawn) continue;
      }
      const g = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, 28); g.addColorStop(0, '#d8ff6a'); g.addColorStop(0.6, '#5cc02c'); g.addColorStop(1, '#5cc02c00'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(s.x, s.y, 30, 22, 0, 0, 7); ctx.fill();
    }
    // player
    const p = this.p; const pf = this.playerFrame(); this.lastPF = pf;
    if (p.shield > 0) { ctx.save(); const r = 70 + Math.sin(this.t * 6) * 3; const g = ctx.createRadialGradient(p.x + 20, p.y + 46, 10, p.x + 20, p.y + 46, r); g.addColorStop(0, '#7fffa800'); g.addColorStop(0.8, '#7fffb044'); g.addColorStop(1, '#a8ffd8cc'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x + 20, p.y + 46, r, 0, 7); ctx.fill(); ctx.restore(); }
    const wn = this.win;
    if (!wn || wn.phase === 'walk') {
      const gy = p.onGround ? p.y + p.h : this.groundBelow(p.x + p.w / 2, p.y + p.h); if (gy !== null && p.dieT <= 0) this.shadow(p.x + p.w / 2, gy, 30, 1, p.onGround ? 0 : gy - (p.y + p.h));
      this.drawPet(ctx);
      const hp = heroPose(pf.state as PlayerState, { stateT: this.anim.stateT, hurtT: p.hurtT, landT: p.landT, dieT: p.dieT, vy: p.vy, speed: Math.abs(p.vx) });
      ctx.save();
      if (!(a.drawHero?.(ctx, this.appearance.character, this.appearance.skinId, hp.anim, hp.index, p.x + p.w / 2, p.y + p.h + 3, { scale: HERO_SCALE, flip: p.facing < 0, alpha: pf.alpha }) ?? false)) {
        // sem os sprites novos (arquivo ausente): volta ao atlas original
        if (this.appearance.character === 'crisoman') ctx.filter = legacySkinFilter(this.appearance.skinId);
        a.draw(ctx, pf.name, p.x + p.w / 2, p.y + p.h + 3, { scale: PS, flip: p.facing < 0, alpha: pf.alpha });
      }
      ctx.restore();
    } else if (wn.phase === 'suck') {
      // o herói é puxado em espiral para dentro do portal: arco, giro, encolhendo e apagando
      const u = Math.min(1, wn.pt / 0.85), e = Math.pow(u, 2.2); const gx = this.world.goal.x, gyy = this.world.goal.y - 78;
      const x = wn.sx + (gx - wn.sx) * e, y = wn.sy + (gyy - wn.sy) * e - Math.sin(u * Math.PI) * 46;
      this.drawPet(ctx); ctx.save(); ctx.translate(x, y); ctx.rotate(e * Math.PI * 5);
      const sk = 1 - 0.92 * e; ctx.globalAlpha = 1 - 0.55 * e * e * e;
      if (!(a.drawHero?.(ctx, this.appearance.character, this.appearance.skinId, 'jump', 1, 0, 0, { scale: HERO_SCALE * sk, flip: p.facing < 0, anchor: 'center' }) ?? false)) {
        if (this.appearance.character === 'crisoman') ctx.filter = legacySkinFilter(this.appearance.skinId);
        a.draw(ctx, 'p_jump_3', 0, 0, { scale: PS * sk, flip: p.facing < 0, anchor: 'center', alpha: 1 - 0.55 * e * e * e });
      }
      ctx.restore();
    }
    if (wn) this.drawWinFx(wn);
    if (this.specialFx > 0) { const f = 1 - this.specialFx / 0.7; a.draw(ctx, 'fx_special_ring', p.x + 20, p.y + 50, { scale: 0.8 + f * 3.4, alpha: 1 - f, anchor: 'center' }); a.draw(ctx, 'fx_special_burst', p.x + 20, p.y + 50, { scale: 0.6 + f * 2, alpha: Math.max(0, 1 - f * 1.4), anchor: 'center' }); }
    for (const s of this.shots) a.draw(ctx, 'fx_shot', s.x, s.y, { scale: 0.7, flip: s.vx < 0, anchor: 'center' });
    for (const q of this.parts) { ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.color; ctx.fillRect(q.x, q.y, q.size, q.size); }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.font = '800 18px system-ui';
    for (const t of this.texts) { ctx.globalAlpha = Math.min(1, t.life * 2); ctx.lineWidth = 4; ctx.strokeStyle = '#04200f'; ctx.strokeText(t.text, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y); }
    ctx.globalAlpha = 1;
    if (import.meta.env.DEV && this.debug) drawDebugWorld(ctx, this.debugState());
    ctx.restore();
    if (getSettings().lighting) this.drawGrade();
    const hudA = this.win ? Math.max(0, 1 - this.win.t / 0.35) : 1;
    if (hudA > 0) { ctx.globalAlpha = hudA; this.drawHud(); ctx.globalAlpha = 1; }
    this.drawTransition();
    if (import.meta.env.DEV && this.debug) drawDebugPanel(ctx, this.debugState());
  }

  /** Dados lidos pelo overlay de depuração (somente leitura; nada aqui altera o jogo). */
  private debugState(): DebugState {
    const p = this.p; const b = this.boss;
    return {
      p, world: { surfaces: this.world.surfaces, ladders: this.world.ladders },
      enemies: this.enemies, boss: b && b.active ? b : null, bins: this.bins, shots: this.shots,
      cam: this.cam, vw: this.vw, frame: this.assets.meta[this.lastPF.name], frameName: this.lastPF.name, ps: PS, feetY: 3,
      animState: this.lastPF.state, animT: this.anim.stateT, shotPending: this.shotPending, fps: this.fps,
    };
  }

  /** Efeitos da vitória no mundo: faíscas em espiral, raios de luz e ondas de choque do portal. */
  private drawWinFx(w: NonNullable<Engine['win']>): void {
    const ctx = this.ctx; const g = this.world.goal; const cx = g.x, cy = g.y - 78;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const cols = ['#b6ff6a', '#eafff0', '#7dffaa'];
    for (const s of w.sparks) {
      const x = cx + Math.cos(s.a) * s.r * 0.8, y = cy + Math.sin(s.a) * s.r; const x2 = cx + Math.cos(s.a - 0.22) * s.r * 1.1 * 0.8, y2 = cy + Math.sin(s.a - 0.22) * s.r * 1.1;
      ctx.strokeStyle = cols[s.c]!; ctx.globalAlpha = Math.min(1, s.r / 80); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x, y); ctx.stroke();
    }
    if (w.phase === 'burst' || w.phase === 'iris') {
      const u = w.phase === 'burst' ? Math.min(1, w.pt / 0.7) : 1;
      if (u < 1) {
        for (let i = 0; i < 14; i++) {   // raios giratórios
          const ang = i / 14 * Math.PI * 2 + this.portalSpin * 0.3, len = 260 + 220 * u, wd = 0.05;
          ctx.globalAlpha = (1 - u) * 0.8; const gr = ctx.createLinearGradient(cx, cy, cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
          gr.addColorStop(0, 'rgba(235,255,225,1)'); gr.addColorStop(1, 'rgba(120,255,170,0)'); ctx.fillStyle = gr;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang - wd) * len, cy + Math.sin(ang - wd) * len); ctx.lineTo(cx + Math.cos(ang + wd) * len, cy + Math.sin(ang + wd) * len); ctx.closePath(); ctx.fill();
        }
        for (let k = 0; k < 3; k++) {   // ondas de choque
          const uu = Math.max(0, u - k * 0.16) / (1 - k * 0.16); if (uu <= 0) continue;
          ctx.globalAlpha = (1 - uu) * 0.9; ctx.lineWidth = 10 * (1 - uu) + 2; ctx.strokeStyle = k === 0 ? '#eafff0' : '#7dffaa';
          ctx.beginPath(); ctx.ellipse(cx, cy, 30 + uu * 520, 30 + uu * 430, 0, 0, 7); ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  /** Letterbox, título de vitória, íris de fechamento (vitória) e íris de abertura + cartão de fase (início). */
  private drawTransition(): void {
    const ctx = this.ctx; const cw = this.canvas.width, ch = this.canvas.height; const VIEW_W = this.vw;
    const k = Math.min(cw / VIEW_W, ch / VIEW_H); const ox = (cw - VIEW_W * k) / 2, oy = (ch - VIEW_H * k) / 2;
    const cam = Math.round(this.cam); const g = this.world.goal; const p = this.p;
    const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
    const back = (x: number) => { const c = Math.min(1, Math.max(0, x)) - 1; return 1 + 2.70158 * c * c * c + 1.70158 * c * c; };
    const L = -ox / k - 4, T = -oy / k - 4, FW = cw / k + 8, FH = ch / k + 8;
    const hole = (hx: number, hy: number, R: number, alpha: number) => {
      ctx.beginPath(); ctx.rect(L, T, FW, FH); ctx.arc(hx, hy, Math.max(0, R), 0, Math.PI * 2); ctx.fillStyle = '#03140d'; ctx.globalAlpha = 1; ctx.fill('evenodd');
      if (R > 2) { ctx.beginPath(); ctx.arc(hx, hy, R, 0, Math.PI * 2); ctx.lineWidth = 8; ctx.strokeStyle = `rgba(157,255,176,${alpha})`; ctx.stroke(); }
    };
    ctx.save(); ctx.setTransform(k, 0, 0, k, ox, oy);
    const w = this.win;
    if (w) {
      const bar = 56 * easeOut(w.t / 0.5); ctx.fillStyle = '#02100a'; ctx.fillRect(L, 0, FW, bar); ctx.fillRect(L, VIEW_H - bar, FW, bar);
      if (w.phase === 'burst' || w.phase === 'iris') {
        const base = w.phase === 'burst' ? w.pt : 0.7 + w.pt; const sc = Math.max(0.01, back(base / 0.4)); const fade = w.phase === 'iris' ? Math.max(0, 1 - w.pt / 0.45) : 1;
        ctx.save(); ctx.globalAlpha = fade; ctx.translate(VIEW_W / 2, VIEW_H * 0.4); ctx.scale(sc, sc); ctx.textAlign = 'center';
        ctx.font = '900 62px system-ui'; ctx.lineJoin = 'round'; ctx.lineWidth = 12; ctx.strokeStyle = '#04200f'; ctx.shadowColor = '#7dffaa'; ctx.shadowBlur = 26; ctx.strokeText('FASE CONCLUÍDA!', 0, 0);
        const fg = ctx.createLinearGradient(0, -48, 0, 8); fg.addColorStop(0, '#fffbd0'); fg.addColorStop(1, '#b6ff6a'); ctx.fillStyle = fg; ctx.fillText('FASE CONCLUÍDA!', 0, 0);
        ctx.shadowBlur = 0; ctx.globalAlpha = fade * Math.min(1, Math.max(0, (base - 0.2) / 0.3));
        ctx.font = '800 24px system-ui'; ctx.lineWidth = 6; ctx.strokeText(`♻ ${this.materials}/${this.totalMaterials} resíduos reciclados`, 0, 50); ctx.fillStyle = '#d4ffd9'; ctx.fillText(`♻ ${this.materials}/${this.totalMaterials} resíduos reciclados`, 0, 50);
        ctx.restore();
      }
      if (w.phase === 'iris') { const u = Math.min(1, w.pt / 0.6); hole(g.x - cam, g.y - 78, Math.hypot(VIEW_W, VIEW_H) * (1 - u * u), 1 - u); }
    } else if (this.introT < 2.8) {
      const t = this.introT;
      if (t < 0.9) { const u = easeOut(t / 0.9); hole(p.x + p.w / 2 - cam, p.y + p.h / 2, Math.hypot(VIEW_W, VIEW_H) * u, 1 - t / 0.9); }
      const ain = easeOut((t - 0.45) / 0.4), aout = t > 2.35 ? Math.max(0, 1 - (t - 2.35) / 0.45) : 1, al = ain * aout;
      if (al > 0.01) {
        const cy = VIEW_H * 0.3, hh = 112 * ain;
        const bg = ctx.createLinearGradient(L, 0, L + FW, 0); bg.addColorStop(0, 'rgba(2,34,22,0)'); bg.addColorStop(0.2, 'rgba(2,34,22,.86)'); bg.addColorStop(0.8, 'rgba(2,34,22,.86)'); bg.addColorStop(1, 'rgba(2,34,22,0)');
        ctx.globalAlpha = aout; ctx.fillStyle = bg; ctx.fillRect(L, cy - hh / 2, FW, hh);
        ctx.fillStyle = '#7dff9a'; ctx.fillRect(VIEW_W / 2 - 170 * ain, cy - hh / 2, 340 * ain, 3); ctx.fillRect(VIEW_W / 2 - 170 * ain, cy + hh / 2 - 3, 340 * ain, 3);
        ctx.globalAlpha = al; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
        const slide = (1 - ain) * 90;
        ctx.font = '800 20px system-ui'; ctx.fillStyle = '#7dff9a'; ctx.fillText(`FASE ${this.levelIndex + 1}`, VIEW_W / 2 - slide, cy - 22);
        ctx.font = '900 48px system-ui'; ctx.lineWidth = 9; ctx.strokeStyle = '#04200f'; const nm = this.world.layout.name.toUpperCase();
        ctx.strokeText(nm, VIEW_W / 2 + slide, cy + 26); ctx.fillStyle = '#e4ffb0'; ctx.fillText(nm, VIEW_W / 2 + slide, cy + 26);
      }
    }
    ctx.restore();
  }

  private drawGoal(): void {
    const ctx = this.ctx; const g = this.world.goal; const a = this.assets; const open = !this.boss || this.boss.state === 'dead';
    if (this.world.index === 7) a.draw(ctx, 'f08_pad', g.x, g.y + 6, { scale: this.world.scale * 0.7 });
    const cx = g.x, cy = g.y - 78; const gl = this.win?.glow ?? 0; const pul = Math.sin(this.t * 3) * 6 + gl * 26;
    ctx.save(); ctx.globalAlpha = open ? 1 : 0.35;
    const gr = ctx.createRadialGradient(cx, cy, 6, cx, cy, 78 + pul); gr.addColorStop(0, '#eafff0'); gr.addColorStop(0.35, '#7dffaa'); gr.addColorStop(0.75, '#22c966aa'); gr.addColorStop(1, '#22c96600');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(cx, cy, 52 + pul / 2, 80 + pul, 0, 0, 7); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = '#d9ffe5'; ctx.beginPath(); ctx.ellipse(cx, cy, 44, 72, 0, 0, 7); ctx.stroke();
    ctx.translate(cx, cy); ctx.rotate(this.portalSpin); a.draw(ctx, 'ui_recycle', 0, 0, { scale: 1.5 * (1 + 0.25 * gl), anchor: 'center' });
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (open) for (let i = 0; i < 9; i++) {   // vaga-lumes orbitando o portal
      const ang = this.t * (0.7 + i * 0.09) + i * 0.7, rr = 62 + 12 * Math.sin(this.t * 1.7 + i), px = cx + Math.cos(ang) * rr * 0.75, py = cy + Math.sin(ang) * rr * 1.15;
      const gr = ctx.createRadialGradient(px, py, 0, px, py, 9); gr.addColorStop(0, 'rgba(220,255,200,.95)'); gr.addColorStop(1, 'rgba(120,255,160,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(px, py, 9, 0, 7); ctx.fill();
    }
    if (gl > 0) {
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90 + gl * 110); gr.addColorStop(0, `rgba(255,255,255,${Math.min(1, gl * 0.95)})`); gr.addColorStop(0.45, `rgba(150,255,190,${gl * 0.5})`); gr.addColorStop(1, 'rgba(60,220,120,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, 90 + gl * 110, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  private drawBoss(): void {
    const b = this.boss; if (!b) return; const ctx = this.ctx; const a = this.assets;
    if (b.state === 'dead' && b.dying < -2) return;
    const st = b.state, t = this.t, pr = PHASES[b.phase];
    const name = st === 'dead' ? 'boss_die' : b.hurt > 0 || st === 'phase' ? 'boss_hurt' : st === 'leap' ? 'boss_atk2' : st === 'charge' || st === 'spit' ? 'boss_atk1'
      : st === 'windup' ? (b.atk === 'leap' ? 'boss_idle' : 'boss_atk1') : st === 'recover' ? 'boss_idle' : Math.floor(t * 3) % 2 ? 'boss_idle' : 'boss_atk1';
    const wind = b.atk ? pr.windup[b.atk] * (b.combo ? 0.6 : 1) : 1, cx = b.x + b.w / 2, gy = b.y + b.h;
    // aviso no chão: onde o salto vai cair / por onde a investida passa (some quando o ataque começa)
    if (st === 'windup' && b.atk && b.active) {
      const u = Math.min(1, b.stateT / wind), locked = b.stateT >= wind - AIM_LOCK; ctx.save();
      if (b.atk === 'leap') {
        ctx.globalAlpha = 0.25 + 0.25 * Math.abs(Math.sin(t * 14)); ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.ellipse(b.aimX, gy - 4, 64, 14, 0, 0, 7); ctx.fill();
        ctx.globalAlpha = 0.9; ctx.lineWidth = locked ? 4 : 2; ctx.strokeStyle = locked ? '#ffffff' : '#ff9a8f'; ctx.beginPath(); ctx.ellipse(b.aimX, gy - 4, 64 * (1.2 - 0.2 * u), 14, 0, 0, 7); ctx.stroke();
      } else if (b.atk === 'charge') {
        const dir = b.aimX >= cx ? 1 : -1, len = Math.min(720, pr.chargeSpeed * pr.chargeDur), x0 = cx + dir * 40;
        const g = ctx.createLinearGradient(x0, 0, x0 + dir * len, 0); g.addColorStop(0, '#ff3b30aa'); g.addColorStop(1, '#ff3b3000');
        ctx.fillStyle = g; ctx.globalAlpha = 0.45 + 0.4 * Math.abs(Math.sin(t * 14)); ctx.fillRect(Math.min(x0, x0 + dir * len), gy - 16, len, 14);
      }
      ctx.restore();
    }
    if (st !== 'dead') this.shadow(cx, gy + 4, b.w * 0.7, 1);
    // pose: agacha e treme no aviso, afunda na recuperação, sacode na transição de fase
    let sx = 1, sy = 1, ox = 0;
    if (st === 'windup') { const u = Math.min(1, b.stateT / wind); sy = 1 - 0.1 * u; sx = 1 + 0.06 * u; ox = Math.sin(t * 70) * 2.5 * u; }
    else if (st === 'recover') { const u = Math.min(1, Math.max(0, b.stateT) / 0.5); sy = 0.92 + 0.08 * u; sx = 1.04 - 0.04 * u; }
    else if (st === 'phase') { ox = Math.sin(t * 55) * 4; sx = 1 + 0.05 * Math.sin(t * 20); sy = 1 - 0.05 * Math.sin(t * 20); }
    else if (st === 'charge') { sx = 1.06; sy = 0.96; }
    ctx.save(); if (st === 'dead') ctx.globalAlpha = Math.max(0, 1 + (b.dying < 0 ? b.dying / 2 : 0));
    const f: string[] = []; if (b.hurt > 0) f.push('brightness(2)');
    else if (st === 'windup') f.push('brightness(1.3)');
    if (b.phase === 2) f.push('sepia(0.35) saturate(1.5)'); else if (b.phase === 3) f.push('hue-rotate(-25deg) saturate(1.9) brightness(1.08)');
    if (f.length) ctx.filter = f.join(' ');
    if (b.phase === 3 && st !== 'dead') { ctx.save(); ctx.globalAlpha = 0.18 + 0.1 * Math.sin(t * 8); ctx.fillStyle = '#ff4a2a'; ctx.beginPath(); ctx.ellipse(cx, gy - 80, 110, 130, 0, 0, 7); ctx.fill(); ctx.restore(); } // aura de fúria
    ctx.translate(cx + ox, gy + 6); ctx.scale(sx, sy);
    const gl = this.levelIndex === GRANDE_LIXO_LEVEL ? grandeLixoPose({ state: st, stateT: b.stateT, atk: b.atk, hurt: b.hurt, dying: b.dying, vx: b.vx, t, windup: wind }) : null;
    if (!(gl && (a.drawHero?.(ctx, 'grande_lixo', '', gl.anim, gl.index, 0, 0, { flip: b.dir > 0 ? false : true }) ?? false))) a.draw(ctx, name, 0, 0, { scale: 2.1, flip: b.dir > 0 ? false : true });
    ctx.restore();
  }

  private pill(x: number, y: number, w: number, h: number): void {
    const c = this.ctx; c.beginPath(); c.roundRect(x, y, w, h, h / 2); c.fillStyle = 'rgba(2,34,22,.88)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#3de07a'; c.stroke();
  }

  private drawHud(): void {
    const ctx = this.ctx; const a = this.assets; const p = this.p; const VIEW_W = this.vw; const k = Math.min(this.canvas.width / VIEW_W, this.canvas.height / VIEW_H);
    const ox = (this.canvas.width - VIEW_W * k) / 2, oy = (this.canvas.height - VIEW_H * k) / 2; ctx.setTransform(k, 0, 0, k, ox, oy);
    // portrait + hearts
    this.pill(12, 10, 90 + p.maxHp * 32, 54);
    ctx.beginPath(); ctx.arc(40, 37, 25, 0, 7); ctx.fillStyle = '#0a5c36'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#7dffa0'; ctx.stroke();
    a.draw(ctx, p.hp <= 1 ? 'face_3' : 'face_0', 40, 38, { scale: 0.62, anchor: 'center' });
    for (let i = 0; i < p.maxHp; i++) a.draw(ctx, 'ui_heart', 86 + i * 32, 37, { scale: 0.95, anchor: 'center', alpha: i < p.hp ? 1 : 0.22 });
    // fps (opcional)
    if (getSettings().showFps) { ctx.font = '700 12px system-ui'; ctx.textAlign = 'right'; ctx.fillStyle = this.fps >= 50 ? '#9dffb0' : this.fps >= 30 ? '#ffe35b' : '#ff7a7a'; ctx.fillText(`${this.fps} FPS`, VIEW_W - 14, 84); }
    // level name
    ctx.font = '800 15px system-ui'; const nm = `${this.levelIndex + 1} · ${this.world.layout.name.toUpperCase()}`; const nw = ctx.measureText(nm).width + 40;
    this.pill(VIEW_W / 2 - nw / 2, 10, nw, 34); ctx.fillStyle = '#eaffdf'; ctx.textAlign = 'center'; ctx.fillText(nm, VIEW_W / 2, 32);
    // stats (right)
    this.pill(VIEW_W - 330, 10, 196, 54);
    a.draw(ctx, 'it_moeda', VIEW_W - 304, 37, { scale: 0.62, anchor: 'center' }); ctx.textAlign = 'left'; ctx.font = '800 20px system-ui'; ctx.fillStyle = '#fff'; ctx.fillText(String(this.coins), VIEW_W - 284, 44);
    a.draw(ctx, 'ui_recycle', VIEW_W - 222, 37, { scale: 0.85, anchor: 'center' }); ctx.fillText(`${this.materials}/${this.totalMaterials}`, VIEW_W - 200, 44);
    // score under left
    this.pill(12, 70, 136, 28); ctx.font = '800 14px system-ui'; ctx.fillStyle = '#d9ff9a'; ctx.fillText('PONTOS ' + this.score, 26, 90);
    // special cooldown
    this.pill(158, 70, 104, 28); const rdy = p.specialCd <= 0; ctx.fillStyle = rdy ? '#7dff9a' : '#7ab08a'; ctx.font = '800 12px system-ui'; ctx.fillText(rdy ? 'K ESPECIAL ✓' : `ESPECIAL ${Math.ceil(p.specialCd)}s`, 170, 89);
    // power timers
    let py = 108; ctx.font = '800 12px system-ui';
    if (p.shield > 0) { this.pill(12, py, 118, 24); ctx.fillStyle = '#9fe9ff'; ctx.fillText(`ESCUDO ${p.shield.toFixed(1)}s`, 24, py + 17); py += 30; }
    if (p.speed > 0) { this.pill(12, py, 118, 24); ctx.fillStyle = '#7fe9ff'; ctx.fillText(`VELOC. ${p.speed.toFixed(1)}s`, 24, py + 17); py += 30; }
    // boss bar
    const b = this.boss; if (b && b.active && b.state !== 'dead') {
      ctx.fillStyle = '#0009'; ctx.fillRect(VIEW_W / 2 - 200, 556, 400, 16); ctx.fillStyle = b.phase === 1 ? '#b9ff4a' : b.phase === 2 ? '#ffb84a' : '#ff5a4a'; ctx.fillRect(VIEW_W / 2 - 198, 558, 396 * Math.max(0, b.hp / b.maxHp), 12);
      ctx.fillStyle = '#000a'; for (const m of [0.66, 0.33]) ctx.fillRect(VIEW_W / 2 - 198 + 396 * m - 1, 556, 2, 16);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '800 12px system-ui'; ctx.fillText('MONSTRO DO LIXÃO · FASE ' + b.phase, VIEW_W / 2, 550);
    }
    // banner
    if (this.banner.t > 0) { ctx.globalAlpha = Math.min(1, this.banner.t * 2); ctx.textAlign = 'center'; ctx.font = '900 34px system-ui'; ctx.lineWidth = 7; ctx.strokeStyle = '#04200f'; ctx.strokeText(this.banner.text, VIEW_W / 2, 150); ctx.fillStyle = '#d8ff8c'; ctx.fillText(this.banner.text, VIEW_W / 2, 150); ctx.globalAlpha = 1; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}






