/**
 * Configurações do jogo — fonte única da verdade.
 * O motor, o áudio e a interface leem daqui; mudanças valem na hora e ficam salvas neste aparelho.
 */
export type Difficulty = 'easy' | 'normal' | 'hard';
export type Quality = 'high' | 'medium' | 'low';
export type TouchMode = 'auto' | 'on' | 'off';
export type TouchSize = 'sm' | 'md' | 'lg';
export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'shoot' | 'special' | 'pause';
export type KeyPair = [string, string];
export type KeyMap = Record<Action, KeyPair>;

export interface Settings {
  // jogo
  difficulty: Difficulty;
  autoFire: boolean;
  introAnim: boolean;
  pauseOnBlur: boolean;
  // áudio
  muted: boolean;
  master: number; music: number; sfx: number;
  // controles
  keys: KeyMap;
  touchMode: TouchMode;
  touchSize: TouchSize;
  // tela
  quality: Quality;
  screenShake: boolean;
  lighting: boolean;
  showFps: boolean;
}

export const ACTIONS: Action[] = ['left', 'right', 'up', 'down', 'jump', 'shoot', 'special', 'pause'];
export const ACTION_LABEL: Record<Action, string> = {
  left: 'Mover à esquerda', right: 'Mover à direita', up: 'Subir escada', down: 'Descer / atravessar', jump: 'Pular', shoot: 'Atirar', special: 'Ataque especial', pause: 'Pausar',
};

export const DEFAULT_KEYS: KeyMap = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'KeyZ'], shoot: ['KeyJ', 'KeyX'], special: ['KeyK', 'KeyC'], pause: ['KeyP', ''],
};

/** O que cada dificuldade muda no motor. */
export interface DifficultySpec { hp: number; enemyHp: number; enemySpeed: number; bossHp: number; specialCd: number; invuln: number; label: string; hint: string }
export const DIFFICULTY: Record<Difficulty, DifficultySpec> = {
  easy: { hp: 6, enemyHp: 0.5, enemySpeed: 0.85, bossHp: 0.6, specialCd: 6, invuln: 1.8, label: 'Fácil', hint: '6 corações · inimigos mais fracos e lentos · especial recarrega em 6 s' },
  normal: { hp: 5, enemyHp: 1, enemySpeed: 1, bossHp: 1, specialCd: 8, invuln: 1.4, label: 'Normal', hint: '5 corações · experiência original · especial recarrega em 8 s' },
  hard: { hp: 3, enemyHp: 1.5, enemySpeed: 1.2, bossHp: 1.4, specialCd: 11, invuln: 1.0, label: 'Difícil', hint: '3 corações · inimigos mais resistentes e rápidos · especial recarrega em 11 s' },
};

/** Fator de resolução do canvas por qualidade (multiplica o devicePixelRatio, com teto). */
export const QUALITY: Record<Quality, { cap: number; label: string }> = {
  high: { cap: 2, label: 'Alta' }, medium: { cap: 1, label: 'Média' }, low: { cap: 0.6, label: 'Baixa' },
};

const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const cloneKeys = (k: KeyMap): KeyMap => Object.fromEntries(ACTIONS.map((a) => [a, [...k[a]] as KeyPair])) as KeyMap;

export const defaultSettings = (): Settings => ({
  difficulty: 'normal', autoFire: false, introAnim: true, pauseOnBlur: true,
  muted: false, master: 0.8, music: 0.5, sfx: 0.8,
  keys: cloneKeys(DEFAULT_KEYS), touchMode: 'auto', touchSize: 'md',
  quality: 'high', screenShake: !prefersReducedMotion(), lighting: true, showFps: false,
});

// ------------------------------------------------------------------ teclas
/** Teclas reservadas: Esc sempre pausa/volta; Tab e F1–F12 pertencem ao navegador; Meta/OS atrapalham o sistema. */
export const isReservedKey = (code: string): boolean => code === 'Escape' || code === 'Tab' || /^F\d{1,2}$/.test(code) || /^(Meta|OS)/.test(code) || code === 'ContextMenu';

export function keyLabel(code: string): string {
  if (!code) return '—';
  const fixed: Record<string, string> = {
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'Espaço', Enter: 'Enter', NumpadEnter: 'Enter (num.)', Backspace: '⌫',
    ShiftLeft: 'Shift esq.', ShiftRight: 'Shift dir.', ControlLeft: 'Ctrl esq.', ControlRight: 'Ctrl dir.', AltLeft: 'Alt esq.', AltRight: 'Alt dir.',
    Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`',
  };
  if (fixed[code]) return fixed[code]!;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return 'Num ' + code.slice(6);
  return code;
}

/** Qual ação usa esta tecla? (null se nenhuma) */
export function actionForCode(code: string, keys: KeyMap): Action | null {
  for (const a of ACTIONS) if (keys[a][0] === code || keys[a][1] === code) return a;
  return null;
}

/** Garante que toda ação tenha pelo menos uma tecla (a principal nunca fica vazia). */
function normalizeKeys(keys: KeyMap): KeyMap {
  const out = cloneKeys(keys);
  for (const a of ACTIONS) {
    if (!out[a][0] && out[a][1]) { out[a] = [out[a][1], '']; }
    if (!out[a][0]) out[a] = [...DEFAULT_KEYS[a]] as KeyPair;
    if (out[a][0] === out[a][1]) out[a][1] = '';
  }
  return out;
}

export interface RebindResult { keys: KeyMap; ok: boolean; reason?: string; swapped?: Action }
/**
 * Atribui `code` ao espaço `slot` (0 principal, 1 alternativa) de `action`.
 * Se a tecla já era de outra ação, as duas trocam (a outra ação recebe a tecla que esta tinha).
 */
export function rebind(keys: KeyMap, action: Action, slot: 0 | 1, code: string): RebindResult {
  if (isReservedKey(code)) return { keys, ok: false, reason: code === 'Escape' ? 'Esc é reservada para pausar/voltar.' : 'Esta tecla é reservada pelo navegador.' };
  const next = cloneKeys(keys); const old = next[action][slot];
  let swapped: Action | undefined;
  for (const a of ACTIONS) for (const sl of [0, 1] as const) {
    if (next[a][sl] === code && !(a === action && sl === slot)) {
      if (a === action) { next[a][sl] = old; } // mesma ação, outro espaço: troca de lugar
      else { next[a][sl] = old; swapped = a; }
    }
  }
  next[action][slot] = code;
  return { keys: normalizeKeys(next), ok: true, swapped };
}

/** Limpa a tecla alternativa de uma ação (a principal não pode ser removida). */
export function clearAlt(keys: KeyMap, action: Action): KeyMap { const n = cloneKeys(keys); n[action][1] = ''; return normalizeKeys(n); }

// ------------------------------------------------------------------ persistência
const KEY = 'crisoguardian-settings-v1';
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list as readonly unknown[]).includes(v) ? (v as T) : d;
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const vol = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
const codeOk = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9]{1,24}$/.test(v) && !isReservedKey(v);

/** Aceita qualquer coisa vinda do disco e devolve configurações válidas (campos ruins voltam ao padrão). */
export function sanitize(raw: unknown): Settings {
  const d = defaultSettings(); if (!raw || typeof raw !== 'object') return d; const r = raw as Record<string, unknown>;
  const keys = cloneKeys(DEFAULT_KEYS);
  if (r.keys && typeof r.keys === 'object') {
    for (const a of ACTIONS) {
      const pair = (r.keys as Record<string, unknown>)[a];
      if (Array.isArray(pair)) keys[a] = [codeOk(pair[0]) ? pair[0] : '', codeOk(pair[1]) ? pair[1] : ''];
    }
  }
  // se alguma tecla aparece em duas ações, volta tudo ao padrão (arquivo adulterado/corrompido)
  const seen = new Set<string>(); let clash = false;
  for (const a of ACTIONS) for (const c of keys[a]) if (c) { if (seen.has(c)) clash = true; seen.add(c); }
  return {
    difficulty: oneOf(r.difficulty, ['easy', 'normal', 'hard'] as const, d.difficulty), autoFire: bool(r.autoFire, d.autoFire), introAnim: bool(r.introAnim, d.introAnim), pauseOnBlur: bool(r.pauseOnBlur, d.pauseOnBlur),
    muted: bool(r.muted, d.muted), master: vol(r.master, d.master), music: vol(r.music, d.music), sfx: vol(r.sfx, d.sfx),
    keys: clash ? cloneKeys(DEFAULT_KEYS) : normalizeKeys(keys),
    touchMode: oneOf(r.touchMode, ['auto', 'on', 'off'] as const, d.touchMode), touchSize: oneOf(r.touchSize, ['sm', 'md', 'lg'] as const, d.touchSize),
    quality: oneOf(r.quality, ['high', 'medium', 'low'] as const, d.quality), screenShake: bool(r.screenShake, d.screenShake), lighting: bool(r.lighting, d.lighting), showFps: bool(r.showFps, d.showFps),
  };
}

function load(): Settings { try { const raw = localStorage.getItem(KEY); return raw ? sanitize(JSON.parse(raw)) : defaultSettings(); } catch { return defaultSettings(); } }
function save(s: Settings): void { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }

// ------------------------------------------------------------------ store
let state: Settings = load();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const getSettings = (): Settings => state;
export function subscribeSettings(fn: () => void): () => void { subs.add(fn); return () => { subs.delete(fn); }; }
export function updateSettings(patch: Partial<Settings>): Settings { state = sanitize({ ...state, ...patch }); save(state); emit(); return state; }
export function resetSettings(): Settings { state = defaultSettings(); save(state); emit(); return state; }
/** Só para testes: relê o armazenamento. */
export function reloadSettings(): Settings { state = load(); emit(); return state; }
