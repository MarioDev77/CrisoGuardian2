#!/usr/bin/env python3
"""
Gera os sprites finais das 8 fases a partir do pacote de PNGs recortados.

Uso:  python3 tools/build_phase_assets.py <pasta_do_pacote> [<pasta_public>]

O pacote tem nomes de arquivo que NÃO correspondem ao conteúdo e vários arquivos com 2+ objetos.
Por isso o mapeamento abaixo foi feito olhando cada PNG (não pela ordem/nome):
  ROLE -> (arquivo, índice do componente da esquerda p/ direita | None = maior componente)

Saída:
  public/assets/phases/phase-NN-slug/{terrain,props,collectibles,enemies}/<papel>.png
  public/assets/phases/catalog.json   (nome, caminho, tamanho, hitbox, origem, avisos)
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = sys.argv[1]
PUB = sys.argv[2] if len(sys.argv) > 2 else 'public'
OUT = os.path.join(PUB, 'assets', 'phases')

PHASES = [
    (1, 'floresta-viva', 'fase_01_floresta_viva'), (2, 'rio-limpo', 'fase_02_rio_limpo'),
    (3, 'cidade-verde', 'fase_03_cidade_verde'), (4, 'montanha', 'fase_04_montanha'),
    (5, 'praia-limpa', 'fase_05_praia_limpa'), (6, 'deserto', 'fase_06_deserto'),
    (7, 'metropole-sustentavel', 'fase_07_metropole_sustentavel'), (8, 'planeta-crisoverde', 'fase_08_planeta_crisoverde'),
]

# categoria, papel -> (arquivo.png, componente|None)
M = {
 1: dict(
  terrain=dict(ground=('platform_long', None), ledge=('platform_medium', None), bridge=('ladder', None), block=('wooden_bridge', None), wall=('stone_wall', 1)),
  props=dict(crate=('barrel', None), barrel=('metal_pipe', None), ladder=('crate', None), pipe=('stone_wall', 0), bin=('recycle_bin', None)),
  collectibles=dict(coin=('leaf_coin', None), shield=('banana', 0), paper=('paper_scrap', 0), bottle=('paper_scrap', 1), banana=('water_bottle', None)),
  enemies=dict(rat=('forest_mouse', 1))),
 2: dict(
  terrain=dict(ground=('river_platform_long', None), ledge=('river_platform_medium', None), bridge=('barrel', None), block=('river_bridge', None)),
  props=dict(barrel=('blue_drum', None), rock=('ladder', 0), pipe=('recycle_bin', 0), bin=('recycle_bin', 1)),
  collectibles=dict(bag=('trash_bag', None), bottle=('trash_paper', None), paper=('fish_enemy', 0)),
  enemies=dict(fish=('fish_enemy', 1))),
 3: dict(
  terrain=dict(ground=('city_platform_long', None), ledge=('city_platform_medium', None), bridge=('traffic_cone', None), block=('bench', None), wall=('brick_wall', 1)),
  props=dict(crate=('barrel', None), barrel=('pipe', None), cone=('crate', None), pipe=('brick_wall', 0)),
  collectibles=dict(coin=('paper', None), wrapper=('food_wrapper', 0), bottle=('bottle', 1)),
  enemies=dict(robot=('robot_enemy', 1))),
 4: dict(
  terrain=dict(ground=('snow_platform_long', None), ledge=('snow_platform_small', None), bridge=('ladder', None), block=('snow_bridge', None), rock=('ice_crystal', None), wall=('snow_wall', 1)),
  props=dict(crate=('barrel', None), barrel=('pipe', None), ladder=('crate', None), pipe=('snow_wall', 0), snowball=('snowball', None)),
  collectibles=dict(coin=('leaf_coin', None), bottle=('bottle', None)),
  enemies=dict(yeti=('yeti_enemy', None))),
 5: dict(
  terrain=dict(ground=('sand_platform_small', None), ledge=('sand_platform_small', None), bridge=('palm_tree', None), block=('star_block', None), wall=('stone_wall', 1)),
  props=dict(crate=('barrel', None), palm=('crate', None), bin=('recycle_bin', None), ring=('crab_enemy', 1)),
  collectibles=dict(coin=('leaf_coin', None), fishbone=('bottle', None), bottle=('shell', 1)),
  enemies=dict(crab=('crab_enemy', 0))),
 6: dict(
  terrain=dict(ground=('desert_platform_small', None), ledge=('desert_platform_small', None), bridge=('ladder', None), block=('cactus', None), wall=('sandstone_wall', None)),
  props=dict(crate=('barrel', None), ladder=('crate', None), cactus=('desert_bridge', None), bin=('red_bin', None)),
  collectibles=dict(coin=('leaf_coin', None), paper=('paper', None)),
  enemies=dict(lizard=('lizard_enemy', None))),
 7: dict(
  terrain=dict(ground=('tech_platform_long', None), ledge=('tech_platform_medium', None), bridge=('tech_ladder', None), block=('energy_bridge', None), hazard=('hazard_block', None)),
  props=dict(crate=('tech_barrel', None), ladder=('tech_crate', None)),
  collectibles=dict(shield=('drone', 0), battery=('battery', None), circuit=('circuit', None)),
  enemies=dict(drone=('drone', 1))),
 8: dict(
  terrain=dict(ground=('alien_platform_long', None), ledge=('alien_platform_medium', None), bridge=('energy_ladder', None), block=('purple_wall', None), float=('crystal', None)),
  props=dict(crate=('tech_barrel', None), ladder=('tech_crate', None), crystal=('energy_bridge', None), pipe=('energy_pipe', 1)),
  collectibles=dict(shield=('alien_enemy', 0), capsule=('capsule', None), banana=('energy_bottle', None)),
  enemies=dict(alien=('alien_enemy', 1))),
}

# Peças que o pacote não trouxe utilizáveis: reaproveita as do projeto (mesma fase) e sinaliza no catálogo.
FALLBACK = {
 'p01': {}, 'p02': {'coin': 'f02_coin'}, 'p03': {'bin': 'f03_bin'}, 'p04': {'bin': 'f04_bin2'},
 'p05': {}, 'p06': {}, 'p07': {'coin': 'f07_coin', 'bin': 'f07_bin'}, 'p08': {'coin': 'f08_coin', 'bin': 'f08_bin'},
}


# Recortes do pacote que vieram quebrados e foram trocados por um PNG limpo guardado em tools/sources/.
# p02_bin: 'recycle_bin.png #1' era um barril azul fatiado, não uma lixeira.
OVERRIDE_SRC = {('p02', 'bin'): 'tools/sources/p02_bin_source.png'}


def load(phase_dir, name):
    return np.array(Image.open(os.path.join(SRC, phase_dir, name + '.png')).convert('RGBA'))


def components(a, dil=3, min_frac=0.04):
    m = a[..., 3] > 16
    lab, k = ndi.label(ndi.binary_dilation(m, iterations=dil))
    items = []
    for i in range(1, k + 1):
        mk = (lab == i) & m
        n = int(mk.sum())
        if n == 0: continue
        ys, xs = np.where(mk)
        items.append(dict(mask=mk, n=n, x0=int(xs.min())))
    if not items: return []
    mx = max(c['n'] for c in items)
    items = [c for c in items if c['n'] >= mx * min_frac]
    items.sort(key=lambda c: c['x0'])
    return items


def pick(a, idx, dil=3):
    cs = components(a, dil)
    if idx is None:
        c = max(cs, key=lambda c: c['n'])
    else:
        c = cs[idx]
    out = a.copy()
    out[~c['mask']] = 0
    ys, xs = np.where(out[..., 3] > 0)
    out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return out, len(cs)


def remove_glow(a):
    """O 'banana' da fase 1 vem com um halo azul-acinzentado opaco ao redor: tira tudo que não é amarelo/marrom."""
    import colorsys
    rgb = a[..., :3].astype(float) / 255
    h = np.zeros(a.shape[:2]); s = np.zeros(a.shape[:2])
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            hh, ss, vv = colorsys.rgb_to_hsv(*rgb[y, x]); h[y, x] = hh * 360; s[y, x] = ss
    bad = (h > 120) & (h < 280) & (a[..., 3] > 0)
    a = a.copy(); a[bad] = 0
    lab, k = ndi.label(a[..., 3] > 0)
    if k > 1:
        sizes = ndi.sum(a[..., 3] > 0, lab, range(1, k + 1)); keep = int(np.argmax(sizes)) + 1
        a[lab != keep] = 0
    ys, xs = np.where(a[..., 3] > 0)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def edge_quality(a, side):
    """Fração de pixels opacos na faixa lateral (abaixo do topo irregular): 1.0 = borda limpa, sem mordidas."""
    h, w = a.shape[:2]; cap = max(6, int(w * 0.2))
    strip = a[int(h * 0.35):int(h * 0.85), :cap, 3] if side == 'L' else a[int(h * 0.35):int(h * 0.85), w - cap:, 3]
    return float((strip > 200).mean())


def modular(a):
    """
    Terreno modular compatível com Engine.band(): cap = 20% da largura; miolo repetido em espelho.
    Pega a borda MAIS LIMPA do sprite, espelha para o outro lado e monta [borda | miolo | borda espelhada].
    Resultado: simétrico, sem mordidas, sem emendas e sem halos.
    """
    if edge_quality(a, 'R') > edge_quality(a, 'L'):
        a = a[:, ::-1].copy()
    h, w = a.shape[:2]; capw = max(8, int(round(w * 0.2)))
    mid_w = capw * 3
    # a borda direita é descartada (a esquerda é espelhada), então o miolo pode vir de qualquer janela livre de mordidas
    best, start = -1.0, capw
    for st in range(capw, max(capw, w - mid_w) + 1):
        win = a[int(h * 0.3):int(h * 0.9), st:st + mid_w, 3] > 200
        sc = float(win.mean()) - 0.012 * abs(st - capw)
        if sc > best: best, start = sc, st
    left = a[:, :capw]; mid = a[:, start:start + mid_w]
    if mid.shape[1] < mid_w:
        mid = np.concatenate([mid, a[:, capw:capw + (mid_w - mid.shape[1])]], axis=1)
    tile = np.concatenate([left, mid, left[:, ::-1]], axis=1)
    # remove rebarbas soltas na base (brilhos, pedaços): linhas com menos de 35% de cobertura
    cov = (tile[..., 3] > 16).mean(axis=1)
    last = len(cov) - 1
    while last > 0 and cov[last] < 0.35: last -= 1
    tile = tile[:last + 1]
    ys, xs = np.where(tile[..., 3] > 16)
    tile = tile[ys.min():ys.max() + 1]
    return tile, capw


def surface_inset(tile):
    """Linha em que o topo da plataforma já está 'sólido' (≥70% das colunas opacas), em fração da altura."""
    cov = (tile[..., 3] > 200).mean(axis=1)
    rows = np.where(cov >= 0.7)[0]
    return float(rows[0] / tile.shape[0]) if len(rows) else 0.1


TARGET_H = dict(ground=50, ledge=36, bridge=28, bin=54, cone=24, cactus=61, ring=44, crate=40, block=40)


def fit(arr, role, modular_tile=False):
    """Reduz com LANCZOS à escala do jogo (sprites do pacote são ~2x maiores que a arte atual)."""
    th = TARGET_H.get(role)
    if not th: return arr
    h, w = arr.shape[:2]; f = th / h
    nw = max(5, int(round(w * f / 5)) * 5) if modular_tile else max(1, int(round(w * f)))
    im = Image.fromarray(arr).resize((nw, th), Image.LANCZOS)
    a = np.array(im); a[..., 3] = np.where(a[..., 3] < 90, 0, 255)  # alfa binário: sem halo escuro nas bordas
    if modular_tile:  # buracos transparentes DENTRO do corpo (furos do recorte original) viram terra sólida
        solid = a[..., 3] > 0; holes = ndi.binary_fill_holes(solid) & ~solid
        if holes.any():
            idx = ndi.distance_transform_edt(~solid, return_indices=True)[1]
            a[holes, :3] = a[idx[0][holes], idx[1][holes], :3]; a[holes, 3] = 255
    # cor dos pixels transparentes = vizinho opaco (evita franja escura no filtro bilinear do canvas)
    op = a[..., 3] > 0
    if op.any() and (~op).any():
        idx = ndi.distance_transform_edt(~op, return_indices=True)[1]
        a[~op, :3] = a[idx[0][~op], idx[1][~op], :3]
    return a


def save(arr, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(arr).save(path, optimize=True)


def main():
    catalog = []
    for n, slug, src_dir in PHASES:
        pid = f'p{n:02d}'; pdir = f'phase-{n:02d}-{slug}'
        for cat, roles in M[n].items():
            for role, (fname, comp) in roles.items():
                issues = []
                ovr = OVERRIDE_SRC.get((pid, role))
                if ovr:
                    sp = np.array(Image.open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ovr)).convert('RGBA'))
                    fname, comp = None, None; issues.append('recorte do pacote substituído por PNG limpo (tools/sources)')
                else:
                    a = load(src_dir, fname)
                    dil = 3 if cat == 'terrain' else 2
                    try:
                        sp, ncomp = pick(a, comp, dil)
                    except (IndexError, ValueError):
                        print(f'  !! {pid} {role}: componente {comp} não existe em {fname}'); continue
                    if comp is not None and ncomp < 2: issues.append(f'esperava 2+ objetos em {fname}, achou {ncomp}')
                if pid == 'p03' and role == 'block':
                    cv = (sp[int(sp.shape[0]*.5):int(sp.shape[0]*.9), :, 3] > 200).mean(axis=0); st = int(np.argmax(cv > 0.6)); sp = sp[:, st:]; issues.append('mancha verde translúcida à esquerda cortada')
                if pid == 'p01' and role == 'banana': sp = remove_glow(sp); issues.append('halo azul opaco removido por cor')
                extra = {}
                if cat == 'terrain' and role in ('ground', 'ledge', 'bridge'):
                    sp, capw = modular(sp)
                    sp = fit(sp, role, True)
                    extra = dict(modular=True, capPx=round(sp.shape[1] * 0.2), surfaceInset=round(surface_inset(sp), 3), lip=0.06)
                elif role in TARGET_H:
                    sp = fit(sp, role)
                rel = f'{pdir}/{cat}/{role}.png'
                save(sp, os.path.join(OUT, rel))
                h, w = sp.shape[:2]
                hb = dict(x=round(w * 0.06), y=round(h * 0.04), w=round(w * 0.88), h=round(h * 0.94))
                catalog.append(dict(name=f'{pid}_{role}', phase=n, category=cat, role=role, src=f'/assets/phases/{rel}',
                                    w=w, h=h, hitbox=hb, source=dict(file=(OVERRIDE_SRC[(pid, role)] if ovr else f'{src_dir}/{fname}.png'), component=comp),
                                    issues=issues, **extra))
        for role, tile in FALLBACK[pid].items():
            cat = 'collectibles' if role == 'coin' else 'props'
            catalog.append(dict(name=f'{pid}_{role}', phase=n, category=cat, role=role, src=f'/assets/game/tiles/{tile}.png',
                                w=0, h=0, hitbox=None, source=dict(file='projeto: ' + tile, component=None),
                                issues=['peça ausente/quebrada no pacote; reaproveitada do projeto']))
    # coin das fases 2,7,8 vem das tiles do projeto; coin da fase 1 (dourada, limpa) fica como referência
    json.dump(catalog, open(os.path.join(OUT, 'catalog.json'), 'w'), indent=1, ensure_ascii=False)
    print(f'{len(catalog)} entradas -> {OUT}/catalog.json')


if __name__ == '__main__':
    main()
