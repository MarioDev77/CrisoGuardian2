#!/usr/bin/env python3
"""
Prepara os sprites do Crisoman a partir do atlas oficial (public/assets/game/atlas.png + atlas.json).

Para cada quadro p_<familia>_<n>:
  1. recorta o retângulo exato do atlas (sem pranchas inteiras);
  2. remove resíduos: componentes isolados minúsculos e cor "escondida" em pixels de alfa 0
     (a cor extrudida do padding sangrava ao ampliar/tingir o sprite);
  3. apara a margem transparente e recalcula o ponto de origem: x = âncora horizontal do atlas,
     y = linha exata dos pés (última linha opaca);
  4. coloca o quadro numa célula de tamanho único, com a origem sempre na MESMA posição da célula.

Saídas (public/assets/sprites/crisoman/):
  frames/<animacao>/<animacao>_NN.png   quadros individuais, todos do mesmo tamanho
  sheets/<animacao>.png                 uma linha de quadros por animação
  crisoman.png + crisoman.json          spritesheet de execução e metadados lidos pelo jogo
Nenhum quadro é inventado nem duplicado: se uma ação não tem arte própria, o JSON marca "pending".
Uso: python3 tools/build_crisoman_sprites.py
"""
import json, os, shutil
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(__file__), '..')
ATLAS = os.path.join(ROOT, 'public/assets/game/atlas.png')
META = os.path.join(ROOT, 'public/assets/game/atlas.json')
OUT = os.path.join(ROOT, 'public/assets/sprites/crisoman')
FAMILIES = ['idle', 'walk', 'run', 'jump', 'fall', 'land', 'shoot', 'reload', 'hurt', 'die', 'special']
MIN_BLOB = 30      # componentes menores que isso (px) são resíduo
PAD = 2            # margem transparente mínima em volta de cada quadro

# Estados de animação do jogo -> quadros. status: original = arte própria; shared = compartilha
# pose de outra família; borrowed = não existe arte dedicada (pendência documentada).
STATES = {
  'idle':           dict(frames=['p_idle_0','p_idle_1','p_idle_2','p_idle_3'], loop=True, fps=4, status='original'),
  'walk':           dict(frames=['p_walk_%d' % i for i in range(5)], loop=True, fps='7-12 (segue a velocidade)', status='original'),
  'run':            dict(frames=['p_run_%d' % i for i in range(4)], loop=True, fps='10-16 (segue a velocidade)', status='original'),
  'jumpStart':      dict(frames=['p_jump_0'], loop=False, fps=None, status='shared', note='pose de agachar/impulso é o 1º quadro da família jump'),
  'jumpRise':       dict(frames=['p_jump_1','p_jump_2'], loop=False, fps=None, status='original'),
  'jumpApex':       dict(frames=['p_jump_3','p_jump_4'], loop=False, fps=None, status='original'),
  'fall':           dict(frames=['p_fall_0','p_fall_1','p_fall_2','p_fall_3'], loop=True, fps=8, status='original'),
  'landing':        dict(frames=['p_land_0','p_land_1','p_land_2'], loop=False, fps=None, status='original'),
  'attackStart':    dict(frames=['p_shoot_0'], loop=False, fps=None, status='original'),
  'attack':         dict(frames=['p_shoot_1'], loop=False, fps=None, status='original'),
  'attackRecovery': dict(frames=['p_shoot_2'], loop=False, fps=None, status='original'),
  'hurt':           dict(frames=['p_hurt_%d' % i for i in range(4)], loop=False, fps=None, status='original'),
  'death':          dict(frames=['p_die_0','p_die_1','p_die_2'], loop=False, fps=None, status='original'),
  'victory':        dict(frames=['p_jump_1','p_jump_3','p_jump_4','p_fall_0'], loop=False, fps=None, status='borrowed', pending=True,
                         note='sem arte dedicada de comemoração; reaproveita poses de salto'),
  'interact':       dict(frames=['p_reload_0','p_reload_1','p_reload_2','p_reload_3'], loop=False, fps=None, status='borrowed', pending=True,
                         note='usa a pose de recarga como gesto de interação; falta arte dedicada'),
  'special':        dict(frames=['p_special_0'], loop=False, fps=None, status='original'),
  'climb':          dict(frames=['p_walk_%d' % i for i in range(5)], loop=True, fps=8, status='borrowed', pending=True,
                         note='sem arte de escalada; reaproveita o ciclo de caminhada'),
}

atlas = Image.open(ATLAS).convert('RGBA')
meta = json.load(open(META))
frames = {}
report = dict(specks_removed=0, hidden_rgb_cleared=0)
for fam in FAMILIES:
    i = 0
    while f'p_{fam}_{i}' in meta:
        n = f'p_{fam}_{i}'; f = meta[n]
        im = np.array(atlas.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h'])))
        a = im[..., 3]
        lab, k = ndi.label(a > 0, structure=np.ones((3, 3)))
        for j in range(1, k + 1):
            m = lab == j
            if m.sum() < MIN_BLOB: im[m] = 0; report['specks_removed'] += 1
        a = im[..., 3]
        hidden = (a == 0) & (im[..., :3].sum(-1) > 0); report['hidden_rgb_cleared'] += int(hidden.sum()); im[a == 0] = 0
        ys, xs = np.where(a > 0); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        frames[n] = dict(fam=fam, idx=i, img=im[y0:y1, x0:x1].copy(), ox=int(f['ax'] - x0), src=dict(x=f['x'], y=f['y'], w=f['w'], h=f['h'], ax=f['ax'], ay=f['ay']))
        i += 1

half = max(max(fr['ox'], fr['img'].shape[1] - fr['ox']) for fr in frames.values())
up = max(fr['img'].shape[0] for fr in frames.values())
OX = half + PAD; CW = 2 * OX; OY = up + PAD; CH = OY + PAD

def cell(fr):
    c = np.zeros((CH, CW, 4), np.uint8); h, w = fr['img'].shape[:2]
    c[OY - h:OY, OX - fr['ox']:OX - fr['ox'] + w] = fr['img']; return c

if os.path.isdir(OUT): shutil.rmtree(OUT)
for d in ['frames', 'sheets']: os.makedirs(os.path.join(OUT, d))
maxn = max(sum(1 for fr in frames.values() if fr['fam'] == fam) for fam in FAMILIES)
runtime = np.zeros((len(FAMILIES) * CH, maxn * CW, 4), np.uint8)
out_frames, anims = {}, {}
for row, fam in enumerate(FAMILIES):
    names = sorted([n for n, fr in frames.items() if fr['fam'] == fam], key=lambda n: frames[n]['idx'])
    os.makedirs(os.path.join(OUT, 'frames', fam))
    sheet = np.zeros((CH, len(names) * CW, 4), np.uint8)
    for col, n in enumerate(names):
        c = cell(frames[n])
        Image.fromarray(c).save(os.path.join(OUT, 'frames', fam, f'{fam}_{col:02d}.png'))
        sheet[:, col * CW:(col + 1) * CW] = c; runtime[row * CH:(row + 1) * CH, col * CW:(col + 1) * CW] = c
        h, w = frames[n]['img'].shape[:2]
        out_frames[n] = dict(x=col * CW, y=row * CH, w=CW, h=CH, ax=OX, ay=OY, anim=fam, index=col,
                             file=f'frames/{fam}/{fam}_{col:02d}.png', body=dict(w=int(w), h=int(h)), source=frames[n]['src'])
    Image.fromarray(sheet).save(os.path.join(OUT, 'sheets', f'{fam}.png'))
    anims[fam] = dict(sheet=f'sheets/{fam}.png', frames=names, count=len(names))
Image.fromarray(runtime).save(os.path.join(OUT, 'crisoman.png'))
json.dump(dict(
    version=1, image='crisoman.png', source='public/assets/game/atlas.png (retângulos exatos de atlas.json)',
    cell=dict(w=CW, h=CH), origin=dict(x=OX, y=OY),
    origin_note='(origin.x, origin.y) é o ponto dos pés, idêntico em todos os quadros; desenhe o quadro com este ponto sobre a posição dos pés.',
    frames=out_frames, animations=anims, states=STATES,
    pending=[dict(state=s, note=v['note']) for s, v in STATES.items() if v.get('pending')],
    cleanup=report), open(os.path.join(OUT, 'crisoman.json'), 'w'), indent=1, ensure_ascii=False)
print('cell', CW, CH, 'origin', OX, OY, 'frames', len(out_frames), report)
