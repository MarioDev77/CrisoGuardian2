#!/usr/bin/env python3
"""
Monta as fases 9–16 (Mapa 2) a partir da ARTE ENVIADA:
  tools/sources/islands/maps/NN_*.jpg      -> arte de cada mapa (já recortada da moldura 16:9)
  tools/sources/islands/sprites/<bioma>/*  -> sprites recortados por bioma (floresta, gelo, lava, submarino, sci_fi, deserto)

Gera em public/assets/islands/<slug>/ : background/{sky,far,mid,near}.png, tiles/{ground,ledge,bridge,block,crate}.png,
deco/<chave>.png e thumbnail.jpg; atualiza public/assets/islands/catalog.json, public/assets/phases/catalog.json
(entradas p09_*..p16_*) e a lista `decor` das partes em src/game/levels/islandLayouts.ts (as superfícies não mudam).
Uso (dentro de frontend/):  python3 tools/build_island_art.py
"""
import json, os, re, random, math
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from scipy import ndimage as ndi

SRC = 'tools/sources/islands'
PUB = 'public/assets/islands'
S_WORLD = 600 / 238          # escala cena -> tela (VIEW_H / sceneH)

# ---------------------------------------------------------------- especificação por ilha
# (chave, bioma, nº do sprite, altura-alvo na tela em px)
ISL = [
 dict(n=9, slug='manguezal', id='manguezal-09', p='p09', mapf='09_Manguezal_Vivo',
  ground=('floresta', 25), ledge=('floresta', 5), bridge=('floresta', 19), crate=('floresta', 13), block=('floresta', 54),
  mid=[('floresta', 1, 360), ('floresta', 4, 380), ('floresta', 43, 320), ('floresta', 2, 350)],
  near=[('floresta', 21, 150), ('floresta', 24, 150)],
  big=[('arv1', 'floresta', 1, 300), ('arv2', 'floresta', 4, 280), ('arv3', 'floresta', 43, 250), ('poco', 'floresta', 48, 210)],
  med=[('arbusto1', 'floresta', 3, 105), ('arbusto2', 'floresta', 7, 100), ('pedra', 'floresta', 47, 115), ('tronco', 'floresta', 14, 80), ('placa', 'floresta', 33, 110), ('toco', 'floresta', 35, 95), ('cerca', 'floresta', 36, 85), ('lagoa', 'floresta', 58, 90)],
  small=[('cogumelo', 'floresta', 10, 60), ('flores', 'floresta', 34, 40), ('flores2', 'floresta', 38, 44), ('grama', 'floresta', 51, 55), ('planta', 'floresta', 64, 50), ('arbusto3', 'floresta', 9, 55)],
  hazard=[('espinhos', 'floresta', 32, 58), ('estacas', 'floresta', 55, 66)]),
 dict(n=10, slug='geleira', id='geleira-10', p='p10', mapf='10_Geleira_Azul',
  ground=('gelo', 16), ledge=('gelo', 4), bridge=('gelo', 14), crate=('gelo', 21), block=('gelo', 17),
  mid=[('gelo', 1, 360), ('gelo', 2, 250), ('gelo', 1, 330), ('gelo', 15, 200), ('gelo', 12, 230)],
  near=[('gelo', 11, 170), ('gelo', 8, 60)],
  big=[('pinheiros', 'gelo', 1, 270), ('pilar', 'gelo', 17, 200), ('cristal1', 'gelo', 2, 200)],
  med=[('boneco', 'gelo', 7, 140), ('cristal2', 'gelo', 12, 120), ('monte', 'gelo', 5, 90), ('placa', 'gelo', 24, 105), ('cerca', 'gelo', 22, 85), ('monte2', 'gelo', 15, 95), ('bola', 'gelo', 3, 75)],
  small=[('gelinho', 'gelo', 9, 55), ('gota', 'gelo', 13, 70), ('neve', 'gelo', 20, 50), ('neve2', 'gelo', 35, 45)],
  hazard=[('espinhos', 'gelo', 34, 56)]),
 dict(n=11, slug='vulcao', id='vulcao-11', p='p11', mapf='11_Vulcao_Verde',
  ground=('lava', 14), ledge=('lava', 8), bridge=('lava', 5), crate=('lava', 9), block=('lava', 12),
  mid=[('lava', 1, 380), ('lava', 2, 300), ('lava', 3, 280), ('lava', 7, 270), ('lava', 1, 340)],
  near=[],
  big=[('vulcao', 'lava', 1, 280), ('espiral', 'lava', 2, 230), ('pilar', 'lava', 3, 220), ('bloco', 'lava', 7, 220)],
  med=[('pedras', 'lava', 26, 120), ('pedras2', 'lava', 28, 105), ('rocha', 'lava', 30, 100), ('costelas', 'lava', 24, 120), ('cerca', 'lava', 25, 140), ('barril', 'lava', 29, 90), ('fogueira', 'lava', 27, 120)],
  small=[('galho', 'lava', 23, 70), ('rocha2', 'lava', 22, 60), ('rocha3', 'lava', 31, 55)],
  hazard=[('fogo', 'lava', 16, 80), ('brasa', 'lava', 6, 70)]),
 dict(n=12, slug='fabrica', id='fabrica-12', p='p12', mapf='12_Fabrica_da_Reciclagem',
  ground=('sci_fi', 29), ledge=('sci_fi', 10), bridge=('sci_fi', 13), crate=('sci_fi', 8), block=('sci_fi', 22),
  mid=[('sci_fi', 14, 340), ('sci_fi', 18, 320), ('sci_fi', 3, 280), ('sci_fi', 5, 250), ('sci_fi', 14, 300)],
  near=[],
  big=[('torre', 'sci_fi', 14, 240), ('tubo', 'sci_fi', 18, 230), ('cabine', 'sci_fi', 3, 210), ('antena', 'sci_fi', 5, 190)],
  med=[('maquina', 'sci_fi', 17, 170), ('cilindro', 'sci_fi', 6, 130), ('cupula', 'sci_fi', 25, 110), ('lata', 'sci_fi', 8, 95), ('caixa', 'sci_fi', 22, 80)],
  small=[('cristal', 'sci_fi', 23, 70), ('pedra', 'sci_fi', 9, 40), ('pedra2', 'sci_fi', 7, 40)],
  hazard=[('espinhos', 'sci_fi', 31, 55)]),
 dict(n=13, slug='copas', id='copas-13', p='p13', mapf='13_Floresta_das_Copas',
  ground=('floresta', 54), ledge=('floresta', 25), bridge=('floresta', 19), crate=('floresta', 14), block=('floresta', 5),
  mid=[('floresta', 43, 360), ('floresta', 1, 380), ('floresta', 4, 360), ('floresta', 2, 340)],
  near=[('floresta', 24, 170), ('floresta', 21, 160)],
  big=[('arv1', 'floresta', 43, 310), ('arv2', 'floresta', 1, 290), ('arv3', 'floresta', 2, 280), ('arv4', 'floresta', 4, 270)],
  med=[('arbusto1', 'floresta', 37, 105), ('arbusto2', 'floresta', 49, 90), ('tronco', 'floresta', 27, 95), ('tronco2', 'floresta', 14, 80), ('pedra', 'floresta', 12, 90), ('trepadeira', 'floresta', 50, 120), ('placa', 'floresta', 33, 110)],
  small=[('cogumelo', 'floresta', 44, 60), ('cogumelo2', 'floresta', 10, 55), ('flores', 'floresta', 22, 60), ('flores2', 'floresta', 23, 65), ('planta', 'floresta', 57, 100), ('folhas', 'floresta', 60, 50)],
  hazard=[('estacas', 'floresta', 62, 62), ('espinhos', 'floresta', 56, 66)]),
 dict(n=14, slug='oceano', id='oceano-14', p='p14', mapf='14_Oceano_Cristalino',
  ground=('submarino', 26), ledge=('submarino', 17), bridge=('submarino', 10), crate=('submarino', 12), block=('submarino', 17),
  mid=[('submarino', 2, 340), ('submarino', 5, 280), ('submarino', 24, 300), ('submarino', 23, 260), ('submarino', 6, 330)],
  near=[('submarino', 4, 34), ('submarino', 7, 34)],
  big=[('algas1', 'submarino', 1, 250), ('algas2', 'submarino', 14, 240), ('recife', 'submarino', 2, 240), ('navio', 'submarino', 23, 200)],
  med=[('coral1', 'submarino', 5, 150), ('coral2', 'submarino', 9, 105), ('coral3', 'submarino', 19, 115), ('coral4', 'submarino', 8, 85), ('algas3', 'submarino', 3, 110), ('bau', 'submarino', 18, 140), ('agua-viva', 'submarino', 22, 130)],
  small=[('estrela', 'submarino', 11, 45), ('peixe', 'submarino', 21, 50), ('bolha', 'submarino', 4, 32), ('alga4', 'submarino', 25, 120)],
  hazard=[]),
 dict(n=15, slug='cidade', id='cidade-15', p='p15', mapf='15_Cidade_do_Futuro',
  ground=('sci_fi', 21), ledge=('sci_fi', 16), bridge=('sci_fi', 10), crate=('sci_fi', 22), block=('sci_fi', 22),
  mid=[('sci_fi', 2, 340), ('sci_fi', 14, 320), ('sci_fi', 18, 300), ('sci_fi', 19, 220), ('sci_fi', 25, 200)],
  near=[],
  big=[('foguete', 'sci_fi', 2, 260), ('torre', 'sci_fi', 14, 230), ('antena', 'sci_fi', 5, 200), ('tubo', 'sci_fi', 18, 220)],
  med=[('satelite', 'sci_fi', 19, 120), ('cupula', 'sci_fi', 25, 120), ('maquina', 'sci_fi', 17, 160), ('cilindro', 'sci_fi', 6, 130), ('lata', 'sci_fi', 8, 95)],
  small=[('cristal', 'sci_fi', 23, 75), ('meteoro', 'sci_fi', 12, 45), ('meteoro2', 'sci_fi', 20, 50)],
  hazard=[('espinhos', 'sci_fi', 31, 55)]),
 dict(n=16, slug='guardiao', id='guardiao-16', p='p16', mapf='16_Guardiao_do_Planeta',
  ground=('floresta', 54), ledge=('sci_fi', 10), bridge=('sci_fi', 13), crate=('sci_fi', 8), block=('sci_fi', 22),
  mid=[('sci_fi', 14, 340), ('sci_fi', 18, 320), ('sci_fi', 17, 300), ('sci_fi', 23, 240), ('floresta', 43, 300)],
  near=[],
  big=[('pilar1', 'sci_fi', 14, 250), ('pilar2', 'sci_fi', 18, 240), ('maquina', 'sci_fi', 17, 200), ('arvore', 'floresta', 43, 240)],
  med=[('cupula', 'sci_fi', 25, 120), ('cilindro', 'sci_fi', 6, 130), ('arbusto1', 'floresta', 37, 100), ('pedra', 'floresta', 47, 110), ('placa', 'floresta', 33, 100)],
  small=[('cristal', 'sci_fi', 23, 80), ('planta', 'floresta', 57, 90), ('grama', 'floresta', 51, 55), ('flores', 'floresta', 34, 40)],
  hazard=[('espinhos', 'sci_fi', 31, 55)]),
]


# ---------------------------------------------------------------- utilidades de imagem
_cache = {}
def sprite(folder, num):
    key = (folder, num)
    if key in _cache: return _cache[key]
    im = Image.open(f'{SRC}/sprites/{folder}/{folder}_{num:03d}.png').convert('RGBA')
    a = np.array(im); m = a[..., 3] > 24
    lab, n = ndi.label(ndi.binary_dilation(m, iterations=2))
    if n > 1:   # descarta fragmentos soltos da segmentação automática (mantém só o(s) objeto(s) principal(is))
        areas = ndi.sum(m, lab, range(1, n + 1)); keep = [i + 1 for i, v in enumerate(areas) if v >= 0.12 * areas.max()]
        a[..., 3] = np.where(np.isin(lab, keep), a[..., 3], 0)
    ys, xs = np.where(a[..., 3] > 24)
    out = Image.fromarray(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    _cache[key] = out; return out

def resize(im, w=None, h=None):
    if w is None: w = max(1, round(im.width * h / im.height))
    if h is None: h = max(1, round(im.height * w / im.width))
    return im.resize((max(1, w), max(1, h)), Image.LANCZOS)

def make_tile(im, W, H):
    """Peça modular: topo (borda com a vegetação/gelo/metal) + corpo repetível por espelhamento, W x H."""
    sh = round(im.height * W / im.width); t = resize(im, w=W, h=sh)
    if sh >= H:
        t = resize(im, w=W, h=H) if sh <= H * 1.3 else t.crop((0, 0, W, H))
        return t
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0)); out.paste(t, (0, 0))
    r0, r1 = int(sh * 0.50), int(sh * 0.86)
    band = t.crop((0, r0, W, max(r0 + 2, r1))); y = sh - int(sh * 0.10); flip = False
    out.paste(Image.new('RGBA', (W, 1), (0, 0, 0, 0)), (0, 0))
    while y < H:
        b = band.transpose(Image.FLIP_TOP_BOTTOM) if flip else band
        out.alpha_composite(b, (0, y)); y += b.height; flip = not flip
    return out

def tint(im, color, amt, bright=1.0, alpha=1.0):
    a = np.array(im).astype(float); c = np.array(color, float)
    a[..., :3] = a[..., :3] * (1 - amt) + c * amt; a[..., :3] *= bright; a[..., 3] *= alpha
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


# ---------------------------------------------------------------- fundos
def build_background(I, art):
    d = f"{PUB}/{I['slug']}/background"; os.makedirs(d, exist_ok=True)
    W, H = 960, 600
    scene = art.crop((0, 205, art.width, 735))                      # abaixo da faixa de título, sem o chão pintado
    # céu: a própria arte desfocada (cores do mapa), parado
    sky = art.crop((0, 205, art.width, art.height)).resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(26))
    sky = ImageEnhance.Brightness(sky).enhance(0.96); sky.convert('RGB').save(f'{d}/sky.webp', quality=88)
    avg = tuple(int(v) for v in np.array(sky.resize((1, 1), Image.BOX))[0, 0][:3])
    # far: arte espelhada (emenda sem corte), altura = tela inteira, base esmaecida para o céu
    k = H / scene.height; sw = round(scene.width * k); s = scene.resize((sw, H), Image.LANCZOS)
    far = Image.new('RGBA', (sw * 2, H)); far.paste(s, (0, 0)); far.paste(s.transpose(Image.FLIP_LEFT_RIGHT), (sw, 0))
    fa = np.array(far); fade = np.clip((H - np.arange(H)) / (H * 0.22), 0, 1)[:, None]; fa[..., 3] = (fa[..., 3] * fade).astype(np.uint8)
    Image.fromarray(fa).save(f'{d}/far.webp', quality=88, method=6)
    # mid: sprites do bioma ao longe (esmaecidos na cor do céu), 1920 px de largura
    def strip(items, y_base, amt, alpha, seed):
        R = random.Random(seed); out = Image.new('RGBA', (1920, H), (0, 0, 0, 0))
        if not items: return out
        n = len(items); slot = 1920 / max(n, 1)
        for i, (fo, num, th) in enumerate(items):
            sp = resize(sprite(fo, num), h=th); sp = tint(sp, avg, amt, 1.0, alpha)
            x = int(i * slot + (slot - sp.width) / 2 + R.uniform(-slot * 0.12, slot * 0.12)); x = max(0, min(1920 - sp.width, x))
            out.alpha_composite(sp, (x, int(y_base - sp.height + R.uniform(-6, 18))))
        return out
    strip(I['mid'], 596, 0.5, 0.55, I['n'] * 5).save(f'{d}/mid.png', optimize=True)
    # near: elementos pendurados no topo / bolhas, passam mais rápido
    near = Image.new('RGBA', (1920, H), (0, 0, 0, 0)); R = random.Random(I['n'] * 9)
    items = I['near']
    if items:
        if I['slug'] == 'oceano':
            for i in range(26):
                fo, num, th = items[i % len(items)]; sp = resize(sprite(fo, num), h=th + R.randint(-8, 14)); sp = tint(sp, (255, 255, 255), 0.0, 1.0, 0.55)
                near.alpha_composite(sp, (R.randint(0, 1880), R.randint(60, 520)))
        else:
            n = 6; slot = 1920 / n
            for i in range(n):
                fo, num, th = items[i % len(items)]; sp = resize(sprite(fo, num), h=th); sp = tint(sp, avg, 0.1, 0.92, 0.95)
                x = int(i * slot + R.uniform(0, slot - sp.width)); x = max(0, min(1920 - sp.width, x)); near.alpha_composite(sp, (x, -int(sp.height * 0.18)))
    near.save(f'{d}/near.png', optimize=True)

def build_tiles(I):
    d = f"{PUB}/{I['slug']}/tiles"; os.makedirs(d, exist_ok=True); info = {}
    def put(name, im): im.save(f'{d}/{name}.png', optimize=True); info[name] = im.size
    put('ground', make_tile(sprite(*I['ground']), 150, 104)); put('ledge', make_tile(sprite(*I['ledge']), 128, 62))
    put('bridge', make_tile(sprite(*I['bridge']), 128, 40))
    for nm in ('block', 'crate'):
        sp = sprite(*I[nm]); k = 64 / max(sp.size); put(nm, resize(sp, w=round(sp.width * k), h=round(sp.height * k)))
    return info

def build_deco(I):
    d = f"{PUB}/{I['slug']}/deco"; os.makedirs(d, exist_ok=True); ent = {}
    for kind in ('big', 'med', 'small', 'hazard'):
        for key, fo, num, th in I[kind]:
            sp = sprite(fo, num); sp.save(f'{d}/{key}.png', optimize=True); ent[key] = dict(w=sp.width, h=sp.height, th=round(th * (0.8 if kind == 'big' else 1.0)), kind=kind)
    return ent


# ---------------------------------------------------------------- catálogo e layouts
def update_catalogs(specs):
    pc = 'public/assets/phases/catalog.json'; cat = json.load(open(pc))
    cat = [e for e in cat if not re.match(r'^p(09|1[0-6])_(ground|ledge|bridge|block|crate|prop\d?|animal|d_.*)$', e['name'])]
    for I, tiles, deco in specs:
        base = f"/assets/islands/{I['slug']}"
        def add(name, role, category, src, w, h, **extra):
            cat.append(dict(name=f"{I['p']}_{name}", phase=I['n'], category=category, role=role, src=src, w=w, h=h, hitbox=dict(x=0, y=0, w=w, h=h), issues=[], modular=False, capPx=0, surfaceInset=0, lip=0, **extra))
        add('ground', 'ground', 'terrain', f'{base}/tiles/ground.png', *tiles['ground'], modular=True) if False else None
        for nm, role in (('ground', 'ground'), ('ledge', 'ledge'), ('bridge', 'bridge')):
            w, h = tiles[nm]; cat.append(dict(name=f"{I['p']}_{nm}", phase=I['n'], category='terrain', role=role, src=f'{base}/tiles/{nm}.png', w=w, h=h, hitbox=dict(x=0, y=0, w=w, h=h), issues=[], modular=True, capPx=round(w * 0.2), surfaceInset=0, lip=0.08))
        for nm, cat_, role in (('block', 'terrain', 'block'), ('crate', 'props', 'crate')):
            w, h = tiles[nm]; add(nm, role, cat_, f'{base}/tiles/{nm}.png', w, h)
        for key, e in deco.items(): add(f'd_{key}', 'decoration', 'props', f'{base}/deco/{key}.png', e['w'], e['h'])
        k0, e0 = next((k, e) for k, e in deco.items() if e['kind'] == 'big'); add('prop', 'decoration', 'props', f'{base}/deco/{k0}.png', e0['w'], e0['h'])   # elemento principal do bioma
    json.dump(cat, open(pc, 'w'), indent=2, ensure_ascii=False)
    ic = f'{PUB}/catalog.json'; isl = json.load(open(ic))
    for it in isl:
        sl = it['slug']; it['layers'] = {x: f'/assets/islands/{sl}/background/{x}.' + ('webp' if x in ('sky', 'far') else 'png') for x in ('sky', 'far', 'mid', 'near')}
        it['tiles'] = {x: f'/assets/islands/{sl}/tiles/{x}.png' for x in ('ground', 'ledge', 'bridge', 'block', 'crate')}
        it['props'] = []; it.pop('animal', None); it['thumbnail'] = f'/assets/islands/{sl}/thumbnail.jpg'
    json.dump(isl, open(ic, 'w'), indent=2, ensure_ascii=False)

def place_decor(I, deco, parts):
    R = random.Random(I['n'] * 313); out = []
    def dw(key):  # largura aproximada em unidades de cena
        e = deco[key]; return e['th'] * e['w'] / e['h'] / S_WORLD
    def item(key, x, hazard=False):
        e = deco[key]; sc = round(e['th'] / (e['h'] * S_WORLD), 3)
        d = dict(x=int(x), y=220, tile=f"{I['p']}_d_{key}", scale=sc)
        if hazard: d['hazard'] = True
        return d
    for pi, part in enumerate(parts):
        gr = sorted([s for s in part['surfaces'] if s['kind'] == 'ground'], key=lambda s: s['x'])
        crates = [(s['x'] - 4, s['x'] + s['w'] + 4) for s in part['surfaces'] if s['kind'] == 'crates']
        segs = [(g['x'] + 14, g['x'] + g['w'] - 14) for g in gr if g['w'] > 40]
        placed = []   # (x, largura)
        def free(x, w, pad=0.35):
            if not any(a <= x - w * 0.3 and x + w * 0.3 <= b for a, b in segs): return False
            return all(abs(x - px) > (w + pw) * pad for px, pw in placed)
        def try_place(key, tries=40, avoid=None):
            w = dw(key)
            for _ in range(tries):
                a, b = R.choice(segs); x = R.uniform(a, b)
                if avoid and any(lo <= x <= hi for lo, hi in avoid): continue
                if any(lo - w * 0.2 <= x <= hi + w * 0.2 for lo, hi in crates): continue
                if free(x, w): placed.append((x, w)); return x
            return None
        res = []
        order = [('big', 1), ('med', 2), ('small', 3)] if pi != 0 else [('big', 1), ('med', 2), ('small', 2)]
        for kind, cnt in order:
            pool = [k for k, _, _, _ in I[kind]]; R.shuffle(pool)
            for key in pool[:cnt]:
                x = try_place(key)
                if x is not None: res.append(item(key, x))
        haz = [k for k, _, _, _ in I['hazard']]
        if haz and pi in (1, 2, 3):
            key = R.choice(haz); w = dw(key); wide = [(a, b) for a, b in segs if b - a > 110]
            for _ in range(40):
                if not wide: break
                a, b = R.choice(wide); x = R.uniform(a + 40, b - 40)
                if 120 <= x <= 235 or x < 70 or x > 300: continue   # lixeira/checkpoint no meio da tela e emendas entre partes
                if any(lo - 20 <= x <= hi + 20 for lo, hi in crates): continue
                if all(abs(x - px) > 28 for px, _ in placed): placed.append((x, w)); res.append(item(key, x, True)); break
        order_k = {'big': 0, 'med': 1, 'small': 2, 'hazard': 3}; kinds = {f"{I['p']}_d_{k}": order_k[kk] for kk in order_k for k, _, _, _ in I[kk]}
        res.sort(key=lambda d: kinds[d['tile']]); out.append(res)
    return out

def rewrite_layouts(specs_deco):
    path = 'src/game/levels/islandLayouts.ts'; txt = open(path, encoding='utf8').read()
    for I, deco in specs_deco:
        m = re.search(r"(id: '%s'.*?parts: )(\[.*?\])(,\n)" % re.escape(I['id']), txt, re.S)
        parts = json.loads(m.group(2)); decs = place_decor(I, deco, parts)
        for part, dd in zip(parts, decs): part['decor'] = dd
        txt = txt[:m.start(2)] + json.dumps(parts, ensure_ascii=False, separators=(',', ':')) + txt[m.end(2):]
    txt = txt.replace('// GERADO por tools/build_island_kits.mjs — não edite à mão.', '// Superfícies: tools/build_island_kits.mjs · Decoração (sprites enviados): tools/build_island_art.py — não edite à mão.', 1)
    open(path, 'w', encoding='utf8').write(txt)

def main():
    specs = []; sd = []
    for I in ISL:
        art = Image.open(f"{SRC}/maps/{I['mapf']}.jpg").convert('RGB')
        build_background(I, art); tiles = build_tiles(I); deco = build_deco(I)
        art.resize((320, 427), Image.LANCZOS).crop((0, 20, 320, 200)).save(f"{PUB}/{I['slug']}/thumbnail.jpg", quality=88)
        for old in ('props.svg', 'prop2.svg', 'prop3.svg', 'animal.svg', 'thumbnail.svg'):
            p = f"{PUB}/{I['slug']}/{old}"
            if os.path.exists(p): os.remove(p)
        for old in ('sky', 'far', 'mid', 'near'):
            p = f"{PUB}/{I['slug']}/background/{old}.svg"
            if os.path.exists(p): os.remove(p)
        for old in ('ground', 'ledge', 'bridge', 'block', 'crate'):
            p = f"{PUB}/{I['slug']}/tiles/{old}.svg"
            if os.path.exists(p): os.remove(p)
        specs.append((I, tiles, deco)); sd.append((I, deco)); print('ok', I['slug'], tiles['ground'], len(deco), 'decorações')
    update_catalogs(specs); rewrite_layouts(sd)

if __name__ == '__main__':
    main()
