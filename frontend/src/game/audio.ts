import { getSettings, subscribeSettings } from '../app/settings';

/**
 * Áudio 100% sintetizado (Web Audio): sem arquivos de som.
 * Respeita volume geral / música / efeitos / mudo das configurações, ao vivo.
 * Sem AudioContext (testes, navegadores antigos) tudo vira no-op.
 */
export type Sfx = 'jump' | 'shoot' | 'coin' | 'waste' | 'hurt' | 'hit' | 'enemyDie' | 'special' | 'bin' | 'power' | 'win' | 'lose' | 'bossHit' | 'bossRoar' | 'slam' | 'land' | 'click' | 'achievement';
export type Track = 'menu' | number;

type Ctx = AudioContext;
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** Personalidade musical das ilhas 9–16 (tom, andamento, harmonia e timbre). */
interface Biome { root: number; bpm: number; prog: number[]; chord: number[]; lead: OscillatorType; bass: OscillatorType; leadVol: number; hat: 0 | 1 | 2; bell?: boolean; pulse?: boolean }
const BIOMES: Biome[] = [
  { root: 62, bpm: 92, prog: [0, -2, -5, -7], chord: [0, 3, 7, 10, 7, 3], lead: 'triangle', bass: 'sine', leadVol: 0.15, hat: 2 },                          // 9 manguezal: suave, orgânico
  { root: 69, bpm: 80, prog: [0, 5, 3, 7], chord: [0, 4, 7, 11, 14, 11], lead: 'sine', bass: 'sine', leadVol: 0.16, hat: 0, bell: true },                // 10 geleira: sinos cristalinos
  { root: 64, bpm: 128, prog: [0, 1, 0, -2], chord: [0, 3, 7, 12, 7, 3], lead: 'sawtooth', bass: 'sawtooth', leadVol: 0.085, hat: 1 },                  // 11 vulcão: grave e pesado (frígio)
  { root: 67, bpm: 116, prog: [0, 0, -5, -2], chord: [0, 7, 0, 12, 7, 0], lead: 'square', bass: 'square', leadVol: 0.075, hat: 1, pulse: true },         // 12 fábrica: mecânico
  { root: 60, bpm: 106, prog: [0, 4, 5, 7], chord: [0, 4, 7, 11, 7, 4], lead: 'triangle', bass: 'triangle', leadVol: 0.16, hat: 2 },                    // 13 copas: leve e saltitante
  { root: 66, bpm: 74, prog: [0, -3, -7, -5], chord: [0, 7, 12, 16, 12, 7], lead: 'sine', bass: 'sine', leadVol: 0.17, hat: 0 },                        // 14 oceano: calmo e amplo
  { root: 71, bpm: 124, prog: [0, -4, -7, -2], chord: [0, 3, 7, 10, 12, 10], lead: 'sawtooth', bass: 'square', leadVol: 0.07, hat: 1, pulse: true },    // 15 cidade: synthwave
  { root: 62, bpm: 136, prog: [0, -4, -2, -7], chord: [0, 3, 7, 12, 15, 12], lead: 'sawtooth', bass: 'sawtooth', leadVol: 0.095, hat: 1, pulse: true }, // 16 final: épico
];

class AudioManager {
  private ctx: Ctx | null = null;
  private master!: GainNode; private musicBus!: GainNode; private sfxBus!: GainNode; private noiseBuf: AudioBuffer | null = null;
  private track: Track | null = null; private playing: Track | null = null;
  private timer: ReturnType<typeof setInterval> | null = null; private nextT = 0; private step = 0;
  private ducked = false; private lastSfx: Partial<Record<Sfx, number>> = {};

  constructor() { subscribeSettings(() => this.applyVolumes()); }

  private get supported(): boolean { return typeof window !== 'undefined' && (typeof AudioContext !== 'undefined' || 'webkitAudioContext' in window); }

  /** Navegadores só liberam áudio depois de um toque/tecla do jogador: chamar em qualquer gesto. */
  unlock(): void {
    if (!this.supported) return;
    if (!this.ctx) {
      try {
        const AC = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.musicBus = this.ctx.createGain(); this.sfxBus = this.ctx.createGain();
        const comp = this.ctx.createDynamicsCompressor(); this.musicBus.connect(this.master); this.sfxBus.connect(this.master); this.master.connect(comp); comp.connect(this.ctx.destination);
        this.applyVolumes();
      } catch { this.ctx = null; return; }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    this.syncMusic();
  }

  private applyVolumes(): void {
    if (!this.ctx) return; const s = getSettings(); const t = this.ctx.currentTime;
    const m = s.muted ? 0 : s.master; const duck = this.ducked ? 0.3 : 1;
    this.master.gain.setTargetAtTime(m * m, t, 0.03);          // curva quadrática: o controle soa mais natural
    this.musicBus.gain.setTargetAtTime(s.music * s.music * 0.5 * duck, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfx * s.sfx, t, 0.03);
  }

  /** Abaixa a música (menu de pausa, fim de fase). */
  duck(on: boolean): void { this.ducked = on; this.applyVolumes(); }

  // ------------------------------------------------------------ efeitos
  private noise(): AudioBuffer {
    if (this.noiseBuf) return this.noiseBuf; const c = this.ctx!; const b = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return (this.noiseBuf = b);
  }
  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, at = 0, bus: GainNode = this.sfxBus): void {
    const c = this.ctx!; const t = c.currentTime + at; const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
  }
  private hiss(dur: number, vol: number, f: number, at = 0, q = 1): void {
    const c = this.ctx!; const t = c.currentTime + at; const s = c.createBufferSource(); s.buffer = this.noise(); const flt = c.createBiquadFilter(); const g = c.createGain();
    flt.type = 'bandpass'; flt.frequency.value = f; flt.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(flt); flt.connect(g); g.connect(this.sfxBus); s.start(t); s.stop(t + dur + 0.02);
  }

  sfx(name: Sfx): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const s = getSettings(); if (s.muted || s.master <= 0 || s.sfx <= 0) return;
    // evita empilhar o mesmo som em rajada (ex.: tiro automático, várias moedas no mesmo quadro)
    const now = this.ctx.currentTime; const gap = name === 'shoot' ? 0.08 : name === 'coin' ? 0.04 : 0.02;
    if (now - (this.lastSfx[name] ?? -1) < gap) return; this.lastSfx[name] = now;
    switch (name) {
      case 'jump': this.tone('square', 260, 560, 0.16, 0.16); break;
      case 'land': this.hiss(0.07, 0.25, 300, 0, 0.8); break;
      case 'shoot': this.tone('sawtooth', 900, 260, 0.11, 0.13); this.hiss(0.06, 0.12, 2500); break;
      case 'coin': this.tone('square', 988, 988, 0.06, 0.11); this.tone('square', 1319, 1319, 0.14, 0.11, 0.06); break;
      case 'waste': this.tone('triangle', 523, 523, 0.07, 0.2); this.tone('triangle', 659, 659, 0.07, 0.2, 0.06); this.tone('triangle', 784, 784, 0.16, 0.2, 0.12); break;
      case 'hurt': this.tone('sawtooth', 320, 90, 0.32, 0.22); this.hiss(0.18, 0.2, 700); break;
      case 'hit': this.tone('square', 220, 120, 0.08, 0.14); this.hiss(0.05, 0.15, 1800); break;
      case 'enemyDie': this.tone('square', 480, 90, 0.26, 0.17); this.hiss(0.14, 0.14, 1200); break;
      case 'special': this.tone('sawtooth', 120, 880, 0.5, 0.16); this.tone('triangle', 240, 1760, 0.5, 0.12); this.hiss(0.45, 0.2, 900, 0.05, 0.5); break;
      case 'bin': [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.14, 0.2, i * 0.07)); break;
      case 'power': [392, 523, 659, 784, 1047].forEach((f, i) => this.tone('square', f, f, 0.1, 0.12, i * 0.05)); break;
      case 'win': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone('triangle', f, f, i === 6 ? 0.55 : 0.14, 0.22, i * 0.11)); break;
      case 'lose': [392, 349, 311, 262].forEach((f, i) => this.tone('sawtooth', f, f * 0.97, 0.32, 0.16, i * 0.2)); break;
      case 'bossHit': this.tone('sawtooth', 160, 70, 0.14, 0.2); this.hiss(0.08, 0.22, 600); break;
      case 'bossRoar': this.tone('sawtooth', 90, 45, 0.9, 0.28); this.tone('square', 130, 60, 0.8, 0.12); this.hiss(0.7, 0.2, 300, 0, 0.6); break;
      case 'slam': this.tone('sine', 110, 38, 0.4, 0.4); this.hiss(0.3, 0.3, 200, 0, 0.5); break;
      case 'click': this.tone('square', 700, 700, 0.04, 0.09); break;
      case 'achievement': [659, 784, 988, 1319].forEach((f, i) => this.tone('triangle', f, f, i === 3 ? 0.5 : 0.12, 0.22, i * 0.1)); this.tone('sine', 1976, 1976, 0.6, 0.08, 0.4); break;
    }
  }

  // ------------------------------------------------------------ música
  /** Define a trilha desejada; toca assim que o áudio estiver liberado. */
  setTrack(t: Track | null): void { this.track = t; this.syncMusic(); }

  private syncMusic(): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (this.playing === this.track && this.timer) return;
    this.stopMusic(); this.playing = this.track; if (this.track === null) return;
    this.step = 0; this.nextT = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 90); this.schedule();
  }
  private stopMusic(): void { if (this.timer) clearInterval(this.timer); this.timer = null; this.playing = null; }

  /** Agenda notas com antecedência (arpejo + baixo + pulso), para não depender do tempo do JavaScript. */
  private schedule(): void {
    const c = this.ctx; if (!c || this.playing === null) return; const s = getSettings(); if (s.muted || s.music <= 0) { this.nextT = c.currentTime + 0.1; return; }
    const lvl = this.playing === 'menu' ? -1 : this.playing;
    const biome = lvl >= 8 ? BIOMES[(lvl - 8) % BIOMES.length]! : null;                 // ilhas 9–16 têm identidade musical própria
    const roots = [57, 55, 52, 50, 53, 56, 54, 52]; const root = biome ? biome.root : lvl < 0 ? 57 : roots[lvl % roots.length]!;
    const bpm = biome ? biome.bpm : lvl < 0 ? 84 : 100 + lvl * 6; const sp = 60 / bpm / 2;               // colcheias
    const prog = biome ? biome.prog : [0, -4, -7, -5];                                 // graus em semitons
    const chord = biome ? biome.chord : [0, 3, 7, 12, 7, 3];
    const leadWave: OscillatorType = biome ? biome.lead : lvl < 0 ? 'sine' : 'triangle'; const leadVol = biome ? biome.leadVol : lvl < 0 ? 0.2 : 0.16;
    const hat = biome ? biome.hat : lvl >= 0 ? 2 : 0;                                   // 0 sem chimbal, 1 a cada passo, 2 a cada 2
    const lookahead = 0.4;
    while (this.nextT < c.currentTime + lookahead) {
      const bar = Math.floor(this.step / 12) % prog.length; const i = this.step % 12; const base = root + prog[bar]! - (biome ? 12 : 0); const at = Math.max(0, this.nextT - c.currentTime);
      const note = base + chord[i % chord.length]! + (i % 12 >= 6 && lvl >= 0 ? 12 : 0) + (biome?.bell ? 12 : 0);
      this.tone(leadWave, midi(note + 12), midi(note + 12), sp * (biome?.bell ? 2.8 : 1.6), leadVol, at, this.musicBus);
      if (i % 3 === 0) this.tone(biome ? biome.bass : 'sine', midi(base - 12), midi(base - 12), sp * 2.6, biome && biome.bass !== 'sine' ? 0.2 : 0.32, at, this.musicBus);
      if (biome?.pulse && i % 6 === 3) this.tone('square', midi(base), midi(base), sp * 0.8, 0.06, at, this.musicBus);          // pulso extra (fábrica/cidade/final)
      if (hat && lvl >= 0 && i % hat === 0) { // chimbal leve
        const src = c.createBufferSource(); src.buffer = this.noise(); const f = c.createBiquadFilter(); const g = c.createGain(); f.type = 'highpass'; f.frequency.value = 7000;
        const t = this.nextT; g.gain.setValueAtTime(i % 6 === 0 ? 0.1 : 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); src.connect(f); f.connect(g); g.connect(this.musicBus); src.start(t); src.stop(t + 0.06);
      }
      this.nextT += sp; this.step++;
    }
  }
}

export const audio = new AudioManager();
