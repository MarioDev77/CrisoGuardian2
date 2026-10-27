#!/usr/bin/env python3
"""Remove resíduos de recorte nas bordas dos quadros do atlas (public/assets/game/atlas.png).

Problema: alguns quadros trazem pedaços do sprite vizinho (linhas de 1–4 px ou fragmentos de lixo cortados)
encostados na borda do retângulo. Regra (conservadora): em quadros da lista, apaga componentes conectados
que (1) tocam a borda do quadro, (2) NÃO são o maior componente e (3) são finos (menor lado <= 4 px) ou
pequenos (< 8 % do maior). O corpo principal nunca é tocado. Idempotente: rodar de novo não muda nada.

Uso:  python3 tools/fix_atlas_edges.py            (altera o atlas.png e imprime o relatório)
      python3 tools/fix_atlas_edges.py --check    (só lista; sai com código 1 se achar resíduos)
O original fica em tools/backup/atlas.before-edge-fix.png.
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PNG = os.path.join(ROOT, 'public/assets/game/atlas.png'); META = os.path.join(ROOT, 'public/assets/game/atlas.json')
FRAMES = ['boss_atk1', 'boss_atk2', 'boss_die', 'boss_hurt', 'boss_idle', 'fx_special_ring', 'fx_special_burst', 'p_special_0']
A_MIN = 8   # alfa mínimo para contar como pixel visível

def run(check: bool) -> int:
    meta = json.load(open(META)); im = np.array(Image.open(PNG).convert('RGBA')); found = []
    for n in FRAMES:
        f = meta[n]; x, y, w, h = f['x'], f['y'], f['w'], f['h']; s = im[y:y + h, x:x + w]
        vis = s[..., 3] > A_MIN; lab, k = ndi.label(vis, structure=np.ones((3, 3)))
        if k < 2: continue
        sizes = np.bincount(lab.ravel())[1:]; main = int(np.argmax(sizes)) + 1
        for i in range(1, k + 1):
            if i == main: continue
            ys, xs = np.where(lab == i)
            touches = ys.min() == 0 or xs.min() == 0 or ys.max() == h - 1 or xs.max() == w - 1
            thin = min(xs.max() - xs.min() + 1, ys.max() - ys.min() + 1) <= 4
            if touches and (thin or len(ys) < 0.08 * sizes[main - 1]):
                found.append((n, int(len(ys)), (int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1))))
                if not check:
                    m = ndi.binary_dilation(lab == i, structure=np.ones((3, 3))) & (lab != main) & ~ndi.binary_dilation(lab == main, structure=np.ones((3, 3)))
                    s[m] = 0
    for n, px, bb in found: print(f'{"achado" if check else "removido"}: {n}  {px}px  caixa {bb}')
    print(f'{len(found)} resíduo(s)')
    if not check and found: Image.fromarray(im).save(PNG, optimize=True)
    return 1 if (check and found) else 0

if __name__ == '__main__': sys.exit(run('--check' in sys.argv))
