"""Gera os sprites dos dois heróis a partir da folha de poses de referência.

Fonte: tools/sources/hero/sheet_animacoes_referencia.png (8 poses por herói, alfa real).
Saída: public/assets/characters/<pasta>/<animação>/<animação>_NN.png (quadros individuais, RGBA, 320x320,
pés no pivô), spritesheet.png e sprites.json.

As poses idle, walk, run, jump, fall e land vêm direto da arte. Hurt, attack e death são derivadas
das mesmas poses (inclinação, esticar/achatar, flash) para manter a identidade visual idêntica.
"""
import json, math, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools/sources/hero/sheet_animacoes_referencia.png')
OUT = os.path.join(ROOT, 'public/assets/characters')
CELL = 320
PIVOT = (160, 312)          # pés
TARGET_IDLE_H = 100.0       # altura (px de jogo) do idle em tela
# linha da folha -> (pasta pedida, id interno do jogo). Pela aparência: linha 2 = menino (Crisoman), linha 1 = menina (Crisogirl).
ROWS = {1: ('quisogril', 'crisogirl'), 2: ('crisomer', 'crisoman')}
POSES = ['idle', 'walk1', 'walk2', 'run1', 'run2', 'jump', 'fall', 'land']

sheet = Image.open(SRC).convert('RGBA')
a = np.array(sheet)
mask = a[..., 3] > 128
lab, n = ndi.label(ndi.binary_dilation(mask, iterations=3))
comps = []
for i, s in enumerate(ndi.find_objects(lab)):
    h = s[0].stop - s[0].start; w = s[1].stop - s[1].start
    if h > 200:  # descarta os rótulos (pílulas de texto)
        comps.append((s[0].start, s[1].start, s))
rows = {1: sorted([c for c in comps if c[0] < 500], key=lambda c: c[1]), 2: sorted([c for c in comps if c[0] >= 500], key=lambda c: c[1])}

def crop_pose(s, region_label):
    sl = (s[0], s[1])
    sub = sheet.crop((sl[1].start - 4, sl[0].start - 4, sl[1].stop + 4, sl[0].stop + 4))
    arr = np.array(sub)
    # mantém só o maior componente (remove restos de rótulos/vizinhos que entraram na margem)
    m = arr[..., 3] > 20
    lab2, k = ndi.label(ndi.binary_dilation(m, iterations=2))
    if k > 1:
        sizes = ndi.sum(m, lab2, range(1, k + 1)); keep = 1 + int(np.argmax(sizes))
        arr[..., 3] = np.where(ndi.binary_dilation(lab2 == keep, iterations=2), arr[..., 3], 0)
    arr[..., 3] = np.where(arr[..., 3] < 12, 0, arr[..., 3])
    img = Image.fromarray(arr)
    return img.crop(img.getbbox())

def place(img, dx=0.0, dy=0.0):
    """Coloca a imagem na célula: centro do bbox no pivô X, base do bbox no pivô Y (pés)."""
    cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    x = int(round(PIVOT[0] - img.width / 2 + dx)); y = int(round(PIVOT[1] - img.height + dy))
    cell.alpha_composite(img, (max(0, x), max(0, y))) if x >= 0 and y >= 0 else cell.paste(img, (x, y), img)
    return cell

def squash(img, sx=1.0, sy=1.0):
    return img.resize((max(1, round(img.width * sx)), max(1, round(img.height * sy))), Image.LANCZOS)

def rot_about_feet(img, deg, dx=0, dy=0):
    """Gira em torno do ponto dos pés (centro-base do bbox)."""
    pad = max(img.width, img.height)
    big = Image.new('RGBA', (img.width + 2 * pad, img.height + 2 * pad), (0, 0, 0, 0))
    big.paste(img, (pad, pad))
    cx, cy = pad + img.width / 2, pad + img.height
    r = big.rotate(deg, resample=Image.BICUBIC, center=(cx, cy))
    cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    ox = int(round(PIVOT[0] - cx + dx)); oy = int(round(PIVOT[1] - cy + dy))
    # recorta o bbox e garante que o quadro inteiro caiba na célula (sem cortes nas extremidades)
    bb = r.getbbox(); body = r.crop(bb)
    bx = bb[0] + ox; by = bb[1] + oy
    bx = max(4, min(CELL - 4 - body.width, bx)); by = max(4, min(CELL - 4 - body.height, by))
    cell.alpha_composite(body, (bx, by))
    return cell

def flash(cell, strength, color=(255, 70, 60)):
    arr = np.array(cell).astype(float)
    m = arr[..., 3:4] / 255.0
    for k in range(3):
        arr[..., k] = arr[..., k] * (1 - strength) + color[k] * strength
    out = np.array(cell); out[..., :3] = np.clip(arr[..., :3], 0, 255).astype(np.uint8)
    return Image.fromarray(out)

def build(poses):
    P = poses; idle = P['idle']
    f = {}
    f['idle'] = [place(squash(idle, 1.0, s)) for s in (1.0, 1.012, 1.024, 1.012)]
    f['walk'] = [place(P['walk1']), place(P['walk1'], dy=-4), place(P['walk2']), place(P['walk2'], dy=-4)]
    f['run'] = [place(P['run1']), place(P['run1'], dy=-5), place(P['run2']), place(P['run2'], dy=-5)]
    f['jump'] = [place(squash(P['jump'], .97, 1.05)), place(P['jump'])]
    f['fall'] = [place(P['fall']), place(P['fall'], dy=-3)]
    f['land'] = [place(P['land']), place(squash(idle, 1.05, .94))]
    f['hurt'] = [flash(rot_about_feet(idle, 8, dx=-4), .55), flash(rot_about_feet(idle, 13, dx=-8), .25), rot_about_feet(idle, 6, dx=-3)]
    f['attack'] = [rot_about_feet(squash(idle, .98, 1.0), 4, dx=-4), rot_about_feet(squash(idle, 1.1, .97), -9, dx=10), rot_about_feet(idle, -3, dx=3)]
    f['death'] = [flash(rot_about_feet(idle, 10, dx=-4), .5), rot_about_feet(idle, 38, dx=-8), rot_about_feet(idle, 72, dx=-22), rot_about_feet(idle, 90, dx=-40)]
    return f

FPS = {'idle': (5, True), 'walk': (8, True), 'run': (12, True), 'jump': (6, False), 'fall': (8, True), 'land': (10, False), 'hurt': (12, False), 'attack': (14, False), 'death': (7, False)}
ORDER = ['idle', 'walk', 'run', 'jump', 'fall', 'land', 'hurt', 'attack', 'death']

for r, (folder, gid) in ROWS.items():
    comps_row = rows[r]
    assert len(comps_row) == 8, (r, len(comps_row))
    poses = {name: crop_pose(c[2], name) for name, c in zip(POSES, comps_row)}
    scale_k = TARGET_IDLE_H / poses['idle'].height
    frames = build(poses)
    base = os.path.join(OUT, folder)
    meta = {'version': 3, 'character': gid, 'folder': folder, 'image': f'/assets/characters/{folder}/spritesheet.png',
            'cell': {'w': CELL, 'h': CELL}, 'pivot': {'x': PIVOT[0], 'y': PIVOT[1]}, 'displayScale': round(scale_k, 4),
            'animations': {}, 'frames': {}}
    total = sum(len(frames[k]) for k in ORDER); cols = 6; rws = math.ceil(total / cols)
    sheet_out = Image.new('RGBA', (cols * CELL, rws * CELL), (0, 0, 0, 0)); idx = 0
    for anim in ORDER:
        d = os.path.join(base, anim); os.makedirs(d, exist_ok=True)
        names = []
        for i, im in enumerate(frames[anim]):
            name = f'{anim}_{i:02d}'; im.save(os.path.join(d, name + '.png'), optimize=True)
            x, y = (idx % cols) * CELL, (idx // cols) * CELL; sheet_out.alpha_composite(im, (x, y)); idx += 1
            meta['frames'][name] = {'x': x, 'y': y, 'w': CELL, 'h': CELL}; names.append(name)
        meta['animations'][anim] = {'fps': FPS[anim][0], 'loop': FPS[anim][1], 'frames': names}
    sheet_out.save(os.path.join(base, 'spritesheet.png'), optimize=True)
    json.dump(meta, open(os.path.join(base, 'sprites.json'), 'w'), indent=1)
    print(folder, gid, 'idle h', poses['idle'].height, 'scale', round(scale_k, 3), 'frames', total, sheet_out.size)
