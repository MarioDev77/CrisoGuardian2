export interface Frame { x: number; y: number; w: number; h: number; ax: number; ay: number }
export interface Src { img: CanvasImageSource; x: number; y: number; w: number; h: number }
/** Entrada de public/assets/phases/catalog.json (gerada por tools/build_phase_assets.py). */
export interface CatalogEntry { name: string; src: string; w: number; h: number; lip?: number; modular?: boolean; category: string; role: string; phase: number }
export interface DrawOpts { scale?: number; flip?: boolean; alpha?: number; rot?: number; anchor?: 'feet' | 'center' }

const BASE = '/assets/game/';

type RGB = [number, number, number];
/** Paleta extraída do cenário da fase: usada para integrar sprites, sombras e iluminação ao fundo. */
export interface Look { ambient: RGB; haze: RGB; shadow: RGB; light: RGB }
const DEFAULT_LOOK: Look = { ambient: [1, 1, 1], haze: [200, 220, 235], shadow: [14, 24, 34], light: [255, 244, 214] };

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Lê a paleta do cenário: cor média do chão (ambiente), do horizonte (névoa), das sombras e do céu iluminado (luz). */
function lookFromScene(img: HTMLImageElement): Look {
  if (typeof document === 'undefined') return DEFAULT_LOOK;
  const w = img.width, h = img.height; const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); if (!g) return DEFAULT_LOOK;
  g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, w, h).data;
  const avg = (y0: number, y1: number): RGB => {
    let r = 0, gg = 0, b = 0, n = 0;
    for (let y = Math.floor(h * y0); y < Math.floor(h * y1); y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; r += d[i]!; gg += d[i + 1]!; b += d[i + 2]!; n++; }
    return [r / n, gg / n, b / n];
  };
  const ground = avg(0.5, 1), sky = avg(0.08, 0.4);
  // sombra: média dos 12% pixels mais escuros da metade de baixo
  const lows: number[] = [];
  for (let y = Math.floor(h * 0.5); y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; lows.push(lum(d[i]!, d[i + 1]!, d[i + 2]!) * 4096 + (i / 4) % 4096); }
  lows.sort((a, b) => a - b);
  let sr = 0, sg = 0, sb = 0; const cnt = Math.max(1, Math.floor(lows.length * 0.12));
  for (let k = 0; k < cnt; k++) { const idx = ((lows[k]! % 4096) | 0); const i = ((Math.floor(h * 0.5) * w) + idx) * 4; sr += d[i] ?? 0; sg += d[i + 1] ?? 0; sb += d[i + 2] ?? 0; }
  const L = lum(...ground) || 1;
  const ambient: RGB = [clamp(ground[0] / L, 0.82, 1.18), clamp(ground[1] / L, 0.82, 1.18), clamp(ground[2] / L, 0.82, 1.18)];
  const sh: RGB = [sr / cnt * 0.55, sg / cnt * 0.55, sb / cnt * 0.62];
  const sl = lum(...sky) || 1; const light: RGB = [clamp(255 * (sky[0] / sl) * 0.5 + 150, 190, 255), clamp(255 * (sky[1] / sl) * 0.5 + 150, 190, 255), clamp(255 * (sky[2] / sl) * 0.5 + 150, 190, 255)];
  return { ambient, haze: sky, shadow: sh, light };
}

/** Desfoque de caixa separável (2 passadas ≈ gaussiano), só RGB. */
function boxBlur(src: Uint8ClampedArray, w: number, h: number, r: number): Uint8ClampedArray {
  const tmp = new Uint8ClampedArray(src.length), out = new Uint8ClampedArray(src.length); const n = r * 2 + 1;
  for (let ch = 0; ch < 3; ch++) {
    for (let y = 0; y < h; y++) {
      let s = 0; const row = y * w;
      for (let x = -r; x <= r; x++) s += src[(row + clamp(x, 0, w - 1)) * 4 + ch]!;
      for (let x = 0; x < w; x++) { tmp[(row + x) * 4 + ch] = s / n; s += src[(row + clamp(x + r + 1, 0, w - 1)) * 4 + ch]! - src[(row + clamp(x - r, 0, w - 1)) * 4 + ch]!; }
    }
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += tmp[(clamp(y, 0, h - 1) * w + x) * 4 + ch]!;
      for (let y = 0; y < h; y++) { out[(y * w + x) * 4 + ch] = s / n; s += tmp[(clamp(y + r + 1, 0, h - 1) * w + x) * 4 + ch]! - tmp[(clamp(y - r, 0, h - 1) * w + x) * 4 + ch]!; }
    }
  }
  return out;
}

/**
 * Cenário em arte de baixa resolução, ampliado ~2,4x na tela: ampliamos 3x uma única vez (suave) e aplicamos
 * máscara de nitidez, o que define cachoeiras, pedras e folhagem sem criar serrilhado nem halos.
 */
function sharpenScene(img: HTMLImageElement): CanvasImageSource {
  if (typeof document === 'undefined') return img;
  const F = 3, w = img.width * F, h = img.height * F;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (!g) return img;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, h);
  const im = g.getImageData(0, 0, w, h); const d = im.data;
  let b = boxBlur(d, w, h, 2); b = boxBlur(b, w, h, 2);
  const amt = 0.75;
  for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) {
    const diff = d[i + k]! - b[i + k]!; if (diff > -2 && diff < 2) continue; d[i + k] = clamp(d[i + k]! + diff * amt, 0, 255);
  }
  g.putImageData(im, 0, 0); return c;
}

/** Cópia do atlas "assentada" no cenário: tinge pela luz ambiente, dessatura um pouco e puxa para a névoa do horizonte. */
function gradeAtlas(atlas: HTMLImageElement, look: Look, k: number, haze: number, desat: number): HTMLCanvasElement | HTMLImageElement {
  if (typeof document === 'undefined') return atlas;
  const c = document.createElement('canvas'); c.width = atlas.width; c.height = atlas.height;
  const g = c.getContext('2d'); if (!g) return atlas;
  g.drawImage(atlas, 0, 0); const im = g.getImageData(0, 0, c.width, c.height); const d = im.data;
  const [mr, mg, mb] = look.ambient.map((m) => 1 + (m - 1) * k) as RGB; const [hr, hg, hb] = look.haze;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    let r = d[i]! * mr, gg = d[i + 1]! * mg, b = d[i + 2]! * mb;
    const l = lum(r, gg, b); r = l + (r - l) * (1 - desat); gg = l + (gg - l) * (1 - desat); b = l + (b - l) * (1 - desat);
    d[i] = clamp(r + (hr - r) * haze, 0, 255); d[i + 1] = clamp(gg + (hg - gg) * haze, 0, 255); d[i + 2] = clamp(b + (hb - b) * haze, 0, 255);
  }
  g.putImageData(im, 0, 0); return c;
}

/**
 * Sprites (atlas) são arte de baixa resolução ampliada por um fator não inteiro.
 * `false` mantém a suavização (visual macio); `true` desenha em vizinho-mais-próximo, só quando ampliado
 * (visual "pixel art" nítido, porém com pixels de largura irregular). O sangramento entre frames já é
 * coberto pelo padding extrudido de 2px do atlas, então não depende desta chave.
 */
const CRISP_SPRITES = false;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    img.src = src;
  });
}

/** Holds the sprite atlas, per-phase tile pieces and the 8 scene backdrops cut from the official sprites. */
export class Assets {
  atlas!: HTMLImageElement;
  meta: Record<string, Frame> = {};
  tiles = new Map<string, HTMLImageElement>();
  /** Recuo (fração da altura do tile) entre o topo da imagem e a linha onde o personagem pisa; vem do catálogo de sprites. */
  private lips = new Map<string, number>();
  scenes = new Map<number, CanvasImageSource>();
  /** Cenários originais (a paleta é lida deles; `scenes` passa a guardar a versão nítida da fase atual). */
  private rawScenes = new Map<number, HTMLImageElement>();
  private static shared: Promise<Assets> | null = null;
  /** Paleta do cenário atual e atlas já integrados a ela (objetos do mundo / atores). */
  look: Look = DEFAULT_LOOK;
  private worldAtlas: CanvasImageSource | null = null; private actorAtlas: CanvasImageSource | null = null;
  private graded = new Map<number, { look: Look; world: CanvasImageSource; actor: CanvasImageSource }>();

  /** Prepara a integração visual (cor, névoa, sombras) de uma fase. Resultado fica em cache. */
  setLevel(index: number): void {
    let g = this.graded.get(index);
    if (!g) {
      const n = index + 1; const raw = this.rawScenes.get(n) ?? (this.scenes.get(n) as HTMLImageElement | undefined);
      if (raw && !this.rawScenes.has(n)) { this.rawScenes.set(n, raw); this.scenes.set(n, sharpenScene(raw)); }
      const look = raw ? lookFromScene(raw) : DEFAULT_LOOK;
      g = { look, world: gradeAtlas(this.atlas, look, 0.35, 0.05, 0.0), actor: gradeAtlas(this.atlas, look, 0.2, 0.02, 0.0) };
      this.graded.set(index, g);
    }
    this.look = g.look; this.worldAtlas = g.world; this.actorAtlas = g.actor;
  }

  /** Qual cópia do atlas usar: heroi = leve, inimigos/boss/objetos = completa, efeitos/itens/UI = original. */
  private atlasFor(name: string): CanvasImageSource {
    if (name.startsWith('p_')) return this.actorAtlas ?? this.atlas;
    if (/^(rat|roach|spider|fly|cloud|boss|ob)_/.test(name) && !name.startsWith('boss_portrait')) return this.worldAtlas ?? this.atlas;
    return this.atlas;
  }

  static get(): Promise<Assets> {
    if (!Assets.shared) {
      const a = new Assets();
      Assets.shared = a.load().then(() => a);
    }
    return Assets.shared;
  }

  private async load(): Promise<void> {
    const [atlas, meta, tileNames] = await Promise.all([
      loadImage(BASE + 'atlas.png'),
      fetch(BASE + 'atlas.json').then((r) => r.json() as Promise<Record<string, Frame>>),
      fetch(BASE + 'tiles.json').then((r) => r.json() as Promise<string[]>),
    ]);
    this.atlas = atlas;
    this.meta = meta;
    // catálogo de sprites por fase (terreno modular, caixas, lixeiras, decoração): public/assets/phases/catalog.json
    const catalog = await fetch('/assets/phases/catalog.json').then((r) => r.json() as Promise<CatalogEntry[]>).catch(() => [] as CatalogEntry[]);
    await Promise.all(catalog.map(async (e) => {
      try { this.tiles.set(e.name, await loadImage(e.src)); if (e.lip !== undefined) this.lips.set(e.name, e.lip); }
      catch { /* sprite ausente: o jogo segue sem ele */ }
    }));
    await Promise.all([
      ...tileNames.map(async (n) => this.tiles.set(n, await loadImage(`${BASE}tiles/${n}.png`))),
      ...Array.from({ length: 8 }, (_, i) => i + 1).map(async (i) =>
        this.scenes.set(i, await loadImage(`${BASE}scenes/f${String(i).padStart(2, '0')}.png`))),
    ]);
  }

  /** Source rectangle of an atlas frame or tile piece, for custom slicing. */
  src(name: string): Src | null {
    const f = this.meta[name];
    if (f) return { img: this.atlasFor(name), x: f.x, y: f.y, w: f.w, h: f.h };
    const t = this.tiles.get(name);
    return t ? { img: t, x: 0, y: 0, w: t.width, h: t.height } : null;
  }

  /** Recuo do topo do terreno (fração da altura) definido no catálogo; undefined = usar o padrão do motor. */
  lipOf(name: string): number | undefined { return this.lips.get(name); }

  has(name: string): boolean { return name in this.meta || this.tiles.has(name); }

  /** Size in source pixels of an atlas frame or tile piece. */
  size(name: string): { w: number; h: number } {
    const f = this.meta[name];
    if (f) return { w: f.w, h: f.h };
    const t = this.tiles.get(name);
    return t ? { w: t.width, h: t.height } : { w: 0, h: 0 };
  }

  /** Draws a frame with its anchor (feet / center) at world position x,y. */
  draw(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, o: DrawOpts = {}): void {
    const s = o.scale ?? 1;
    const f = this.meta[name];
    if (!f) {
      const t = this.tiles.get(name);
      if (!t) return;
      this.blit(ctx, t, 0, 0, t.width, t.height, x, y, t.width, t.height, s, o, o.anchor === 'center' ? t.width / 2 : t.width / 2, o.anchor === 'center' ? t.height / 2 : t.height);
      return;
    }
    const ax = o.anchor === 'center' ? f.w / 2 : f.ax;
    const ay = o.anchor === 'center' ? f.h / 2 : f.ay;
    this.blit(ctx, this.atlasFor(name), f.x, f.y, f.w, f.h, x, y, f.w, f.h, s, o, ax, ay);
  }

  private blit(ctx: CanvasRenderingContext2D, img: CanvasImageSource, sx: number, sy: number, sw: number, sh: number,
    x: number, y: number, w: number, h: number, s: number, o: DrawOpts, ax: number, ay: number): void {
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (CRISP_SPRITES && s * ctx.getTransform().a >= 1) ctx.imageSmoothingEnabled = false;
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.flip) ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, sw, sh, -ax * s, -ay * s, w * s, h * s);
    ctx.restore();
  }

  /** Draws any image region stretched into dest rect. A pequena folga na origem evita puxar pixels vizinhos (riscos nas emendas). */
  region(ctx: CanvasRenderingContext2D, img: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, flip = false): void {
    if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return;
    const e = sw > 3 && sh > 3 ? 0.3 : 0;
    if (!flip) { ctx.drawImage(img, sx + e, sy + e, sw - 2 * e, sh - 2 * e, dx, dy, dw, dh); return; }
    ctx.save(); ctx.translate(dx + dw, 0); ctx.scale(-1, 1);
    ctx.drawImage(img, sx + e, sy + e, sw - 2 * e, sh - 2 * e, 0, dy, dw, dh);
    ctx.restore();
  }
}
