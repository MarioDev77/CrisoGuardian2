"""Recorta o chefão da fase 16 ("O Grande Lixo") da folha de referência e gera os quadros do jogo.

Fonte: tools/sources/boss/grande_lixo_sheet.png (alfa real). Saída: public/assets/characters/grande_lixo/
  <animação>/<animação>_NN.png (RGBA, 288x288, pés no pivô), spritesheet.png e sprites.json (mesmo formato dos heróis).
"""
import json, math, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools/sources/boss/grande_lixo_sheet.png')
OUT = os.path.join(ROOT, 'public/assets/characters/grande_lixo')
CELL = 288; PIVOT = (144, 276); TARGET_H = 250.0   # altura do idle em tela (referência de escala da folha)

# (animação, y0, y1, [limites x das células]) — as faixas de y deixam de fora as etiquetas escritas à mão
STRIPS = [
  ('idle',   192, 380, [770, 950, 1122, 1297, 1485]),
  ('walk',   436, 600, [455, 606, 746, 886, 1008, 1140, 1257, 1377, 1525]),
  ('attack', 655, 800, [20, 165, 335, 490, 636, 790, 975]),
  ('hurt',   847, 995, [16, 150, 288, 421, 562, 705]),
  ('death',  848, 995, [722, 862, 985, 1162, 1315, 1530]),
]
FPS = {'idle': (5, True), 'walk': (9, True), 'attack': (12, False), 'hurt': (12, False), 'death': (6, False), 'proj': (10, True)}
sheet = Image.open(SRC).convert('RGBA')

def crop_cell(x0, x1, y0, y1, keep_floating=True):
    arr = np.array(sheet.crop((x0, y0, x1, y1)))
    a = arr[..., 3]; a[a < 14] = 0
    # remove restos de etiquetas/vizinhos: mantém componentes grandes e os pedaços que estão perto deles (detritos voando)
    lab, n = ndi.label(ndi.binary_dilation(a > 40, iterations=7))
    if n > 1:
        sizes = ndi.sum(a > 40, lab, range(1, n + 1)); big = 1 + int(np.argmax(sizes))
        keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 0.04 * sizes.max() or i + 1 == big])
        a[~keep] = 0
    arr[..., 3] = a; im = Image.fromarray(arr); bb = im.getbbox()
    return im.crop(bb), arr

def feet_and_center(im):
    """Base sólida (alfa alto) = pés; centro X = centroide das pernas, estável entre quadros."""
    a = np.array(im)[..., 3]; solid = a > 150; ys, xs = np.nonzero(solid)
    bottom = ys.max(); legs = solid[int(bottom - 0.3 * (bottom - ys.min())):bottom + 1]
    cx = np.nonzero(legs.any(axis=0))[0].mean() if legs.any() else (xs.min() + xs.max()) / 2
    return bottom, cx

def place(im, mode='feet'):
    cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    if mode == 'center': cell.alpha_composite(im, ((CELL - im.width) // 2, (CELL - im.height) // 2)); return cell
    bottom, cx = feet_and_center(im)
    x = int(round(PIVOT[0] - cx)); y = int(round(PIVOT[1] - bottom))
    x = max(2, min(CELL - 2 - im.width, x)); y = max(2, min(CELL - 2 - im.height, y))
    cell.alpha_composite(im, (x, y)); return cell

frames = {}
for name, y0, y1, xs in STRIPS:
    frames[name] = []
    for i in range(len(xs) - 1):
        im, _ = crop_cell(xs[i], xs[i + 1], y0, y1); frames[name].append(place(im, 'center' if name == 'death' and i >= 2 else 'feet'))
# projéteis: lixeira, garrafa, lata, saco e bola de lodo (cada um centralizado)
px0, px1, py0, py1 = 1000, 1505, 686, 792
reg = np.array(sheet.crop((px0, py0, px1, py1))); lab, n = ndi.label(ndi.binary_dilation(reg[..., 3] > 40, iterations=4))
objs = sorted([s for s in ndi.find_objects(lab) if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) > 900], key=lambda s: s[1].start)
frames['proj'] = []
for s in objs:
    r = reg[s].copy(); l2, k = ndi.label(ndi.binary_dilation(r[..., 3] > 40, iterations=2))
    if k > 1: sz = ndi.sum(r[..., 3] > 40, l2, range(1, k + 1)); r[..., 3] = np.where(l2 == 1 + int(np.argmax(sz)), r[..., 3], 0)   # só o objeto principal (sem pontinhos do divisor)
    sub = Image.fromarray(r); sub = sub.crop(sub.getbbox()); frames['proj'].append(place(sub, 'center'))

_ys = np.nonzero(np.array(frames['idle'][0])[..., 3] > 150)[0]; idle_h = max(1, int(_ys.max() - _ys.min()))
scale = TARGET_H / idle_h
meta = {'version': 3, 'character': 'grande_lixo', 'folder': 'grande_lixo', 'image': '/assets/characters/grande_lixo/spritesheet.png', 'cell': {'w': CELL, 'h': CELL},
        'pivot': {'x': PIVOT[0], 'y': PIVOT[1]}, 'displayScale': round(scale, 4), 'animations': {}, 'frames': {}}
total = sum(len(v) for v in frames.values()); cols = 6; rows = math.ceil(total / cols)
out = Image.new('RGBA', (cols * CELL, rows * CELL), (0, 0, 0, 0)); idx = 0
for anim, lst in frames.items():
    d = os.path.join(OUT, anim); os.makedirs(d, exist_ok=True); names = []
    for i, im in enumerate(lst):
        n = f'{anim}_{i:02d}'; im.save(os.path.join(d, n + '.png'), optimize=True)
        x, y = (idx % cols) * CELL, (idx // cols) * CELL; out.alpha_composite(im, (x, y)); idx += 1
        meta['frames'][n] = {'x': x, 'y': y, 'w': CELL, 'h': CELL}; names.append(n)
    meta['animations'][anim] = {'fps': FPS[anim][0], 'loop': FPS[anim][1], 'frames': names}
out.save(os.path.join(OUT, 'spritesheet.png'), optimize=True); json.dump(meta, open(os.path.join(OUT, 'sprites.json'), 'w'), indent=1)
print({k: len(v) for k, v in frames.items()}, 'idle h', idle_h, 'scale', round(scale, 3), out.size)
