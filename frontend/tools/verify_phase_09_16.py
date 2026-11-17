#!/usr/bin/env python3
"""Static asset/map validation for CrisoGuardian2 phases 09–16."""
from pathlib import Path
from PIL import Image
import json, re, sys
ROOT=Path(__file__).resolve().parents[1]
PUB=ROOT/'public'
cat=json.loads((PUB/'assets/phases/catalog.json').read_text())
by_name={e['name']:e for e in cat}
errors=[]
for e in cat:
    p=PUB/e['src'].lstrip('/')
    if not p.is_file(): errors.append(f"catalog missing: {e['name']} -> {e['src']}")
    elif p.suffix.lower()=='.png':
        try:
            with Image.open(p) as im: im.verify()
        except Exception as ex: errors.append(f"corrupt PNG: {e['name']}: {ex}")
# Background layers, recycling bins, portals and dedicated boss art.
islands=json.loads((PUB/'assets/islands/catalog.json').read_text())
if len(islands)!=8: errors.append(f'expected 8 island records, got {len(islands)}')
for island in islands:
    slug=island['slug']
    for required in ('bin_custom.png','portal_custom.png'):
        f=PUB/f'assets/islands/{slug}/{required}'
        if not f.is_file(): errors.append(f'phase {island["index"]+1} missing {required}')
        else:
            with Image.open(f) as im:
                if im.mode!='RGBA': errors.append(f'phase {island["index"]+1} {required} has no alpha')
    if slug in ('vulcao','guardiao') and not (PUB/f'assets/islands/{slug}/boss_custom.png').is_file(): errors.append(f'{slug} missing boss_custom.png')
    for layer in ('sky','far','mid','near'):
        src=island['layers'].get(layer)
        if not src or not (PUB/src.lstrip('/')).is_file(): errors.append(f"phase {island['index']+1} missing background {layer}: {src}")
# Creature atlas manifests, frame bounds, RGBA and catalog bindings
creature_root=PUB/'assets/islands/creatures'
idx=json.loads((creature_root/'catalog.json').read_text())
for phase in range(9,17):
    mp=creature_root/f'phase_{phase:02d}.json'
    if not mp.is_file(): errors.append(f'missing creature manifest {phase}'); continue
    m=json.loads(mp.read_text()); sheetp=PUB/m['image'].lstrip('/')
    if not sheetp.is_file(): errors.append(f'missing creature sheet {phase}'); continue
    with Image.open(sheetp) as sheet:
        if sheet.mode!='RGBA': errors.append(f'creature sheet {phase} is not RGBA')
        for role,frames in m['animations'].items():
            if not frames: errors.append(f'phase {phase} has no {role} frames')
            for f in frames:
                x,y,w,h=(f[k] for k in ('frameX','frameY','frameW','frameH'))
                if x<0 or y<0 or w<=0 or h<=0 or x+w>sheet.width or y+h>sheet.height: errors.append(f'frame outside sheet: {f["name"]}')
                if not (PUB/f['image'].lstrip('/')).is_file(): errors.append(f'individual frame missing: {f["name"]}')
                else:
                    with Image.open(PUB/f['image'].lstrip('/')) as frame_im:
                        if frame_im.mode!='RGBA' or frame_im.getchannel('A').getbbox() is None: errors.append(f'frame has no usable alpha: {f["name"]}')
# Object sheets and individual sprites
for phase,slug in enumerate(['manguezal','geleira','vulcao','fabrica','copas','oceano','cidade','guardiao'],9):
    folder=PUB/f'assets/islands/{slug}/deco/pack'
    mp=folder/'phase_props_sheet.json'
    if not mp.is_file(): errors.append(f'missing prop manifest phase {phase}'); continue
    m=json.loads(mp.read_text()); sheetp=PUB/m['image'].lstrip('/')
    if not sheetp.is_file(): errors.append(f'missing prop sheet phase {phase}'); continue
    with Image.open(sheetp) as sheet:
        if sheet.mode!='RGBA': errors.append(f'prop sheet phase {phase} is not RGBA')
        if len(m['items'])!=5: errors.append(f'phase {phase} should have 5 prop frames, got {len(m["items"])}')
        for f in m['items']:
            if f['frameX']+f['frameW']>sheet.width or f['frameY']+f['frameH']>sheet.height: errors.append(f'prop frame outside sheet: {f["name"]}')
            if f['name'] not in by_name: errors.append(f'prop missing from catalog: {f["name"]}')
            if not (PUB/f['src'].lstrip('/')).is_file(): errors.append(f'prop PNG missing: {f["name"]}')
            else:
                with Image.open(PUB/f['src'].lstrip('/')) as prop_im:
                    if prop_im.mode!='RGBA' or prop_im.getchannel('A').getbbox() is None: errors.append(f'prop has no usable alpha: {f["name"]}')
# Parse parts arrays from islandLayouts.ts and validate every referenced tile.
layout_text=(ROOT/'src/game/levels/islandLayouts.ts').read_text()
refs=[]
for match in re.finditer(r'parts:\s*(\[)',layout_text):
    start=match.start(1); depth=0; quoted=False; escape=False; quote=''; end=None
    for i in range(start,len(layout_text)):
        c=layout_text[i]
        if quoted:
            if escape: escape=False
            elif c=='\\': escape=True
            elif c==quote: quoted=False
            continue
        if c in "'\"": quoted=True; quote=c; continue
        if c=='[': depth+=1
        elif c==']':
            depth-=1
            if depth==0: end=i+1; break
    if end is None: errors.append('unclosed parts array'); continue
    try: parts=json.loads(layout_text[start:end])
    except Exception as ex: errors.append(f'cannot parse parts array: {ex}'); continue
    for part in parts:
        refs += [x['tile'] for x in part.get('surfaces',[])]
        refs += [x['tile'] for x in part.get('decor',[])]
for name in sorted(set(refs)):
    if name not in by_name: errors.append(f'layout tile missing from catalog: {name}')
# Enemy frame references in entities.ts
entity_text=(ROOT/'src/game/entities.ts').read_text()
for name in re.findall(r"'((?:p(?:09|10|11|12|13|14|15|16)_(?:walker|flyer)_\d+))'",entity_text):
    if not (creature_root/f'{name}.png').is_file(): errors.append(f'enemy frame file missing: {name}')
print(f'catalog={len(cat)} | layout tile refs={len(refs)} unique={len(set(refs))} | creature sheets=8 | creature frames={sum(len(fr) for p in range(9,17) for fr in json.loads((creature_root/f"phase_{p:02d}.json").read_text())["animations"].values())} | props=40')
if errors:
    print('FAIL:')
    for e in errors: print(' -',e)
    sys.exit(1)
print('PASS: no missing assets, broken manifests, out-of-bounds frames or missing map references.')
