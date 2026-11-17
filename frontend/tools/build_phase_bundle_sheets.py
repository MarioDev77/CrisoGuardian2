#!/usr/bin/env python3
"""Builds per-biome transparent sprite atlases from crisoverde_assets_pack.zip.
Run from frontend/: python tools/build_phase_bundle_sheets.py /path/to/crisoverde_assets_pack.zip
The PNGs are preserved individually for the game; phase sheets + JSON manifests are the editable atlas source.
"""
from pathlib import Path
from PIL import Image
import json, math, sys, zipfile

if len(sys.argv) != 2:
    raise SystemExit('Uso: python tools/build_phase_bundle_sheets.py /caminho/crisoverde_assets_pack.zip')
SRC = Path(sys.argv[1])
PUB = Path('public/assets/islands')
SLUG = {9:'manguezal',10:'geleira',11:'vulcao',12:'fabrica',13:'copas',14:'oceano',15:'cidade',16:'guardiao'}
CREATURES = {
 9:{'walker':[207,212],'flyer':[182,183,184]}, 10:{'walker':[200,201,202],'flyer':[220,230]},
 11:{'walker':[209,210],'flyer':[220,230]}, 12:{'walker':[216,217,219],'flyer':[179,181]},
 13:{'walker':[175,185,190,192],'flyer':[182,183,184]}, 14:{'walker':[193,194],'flyer':[205,211,212]},
 15:{'walker':[216,217,219],'flyer':[179,181]}, 16:{'walker':[216,217,219,225],'flyer':[228,229]},
}
PROPS = {9:[1,2,3,4,14],10:[63,64,66,67,68],11:[57,58,71,73,85],12:[87,88,89,97,99],
         13:[1,2,12,14,37],14:[165,166,167,168,169],15:[91,92,93,94,95],16:[90,94,95,141,142]}

def clean(im):
    im=im.convert('RGBA'); im.putalpha(im.getchannel('A').point(lambda a:0 if a<6 else a))
    b=im.getbbox(); return im.crop(b) if b else im

with zipfile.ZipFile(SRC) as z:
    croot=PUB/'creatures'; croot.mkdir(parents=True,exist_ok=True)
    for phase,roles in CREATURES.items():
        cw,ch=160,144; sheet=Image.new('RGBA',(cw*4,ch*2),(0,0,0,0)); manifest={'phase':phase,'image':f'/assets/islands/creatures/phase_{phase:02d}.png','cell':{'w':cw,'h':ch},'animations':{}}
        for row,role in enumerate(('walker','flyer')):
            frames=[]
            for i,sid in enumerate(roles[role]):
                im=clean(Image.open(z.open(f'sprites/criaturas/sprite_{sid:03d}.png'))); im.thumbnail((cw-18,ch-18),Image.Resampling.LANCZOS)
                px=i*cw+(cw-im.width)//2; py=row*ch+(ch-12-im.height) if role=='walker' else row*ch+(ch-im.height)//2
                sheet.alpha_composite(im,(px,py)); name=f'p{phase:02d}_{role}_{i}'; im.save(croot/f'{name}.png',optimize=True)
                frames.append({'name':name,'sourceSprite':sid,'frameX':px,'frameY':py,'frameW':im.width,'frameH':im.height,'pivotX':im.width/2,'pivotY':im.height if role=='walker' else im.height/2,'image':f'/assets/islands/creatures/{name}.png'})
            manifest['animations'][role]=frames
        sheet.save(croot/f'phase_{phase:02d}.png',optimize=True)
        (croot/f'phase_{phase:02d}.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    (croot/'catalog.json').write_text(json.dumps({'version':1,'source':'crisoverde_assets_pack.zip / sprites/criaturas','phases':{str(k):f'/assets/islands/creatures/phase_{k:02d}.json' for k in CREATURES}},ensure_ascii=False,indent=2)+'\n')
    for phase,ids in PROPS.items():
        folder=PUB/SLUG[phase]/'deco'/'pack'; folder.mkdir(parents=True,exist_ok=True)
        cell,cols=192,3; rows=math.ceil(len(ids)/cols); sheet=Image.new('RGBA',(cols*cell,rows*cell),(0,0,0,0)); items=[]
        for i,sid in enumerate(ids):
            im=clean(Image.open(z.open(f'sprites/ambiente/sprite_{sid:03d}.png'))); name=f'p{phase:02d}_pack_{sid:03d}'; im.save(folder/f'{name}.png',optimize=True)
            thumb=im.copy(); thumb.thumbnail((cell-24,cell-24),Image.Resampling.LANCZOS)
            fx=(i%cols)*cell+(cell-thumb.width)//2; fy=(i//cols)*cell+(cell-thumb.height)//2; sheet.alpha_composite(thumb,(fx,fy))
            items.append({'name':name,'sourceSprite':sid,'src':f'/assets/islands/{SLUG[phase]}/deco/pack/{name}.png','sourceWidth':im.width,'sourceHeight':im.height,'frameX':fx,'frameY':fy,'frameW':thumb.width,'frameH':thumb.height})
        sheet.save(folder/'phase_props_sheet.png',optimize=True)
        (folder/'phase_props_sheet.json').write_text(json.dumps({'phase':phase,'image':f'/assets/islands/{SLUG[phase]}/deco/pack/phase_props_sheet.png','cell':cell,'columns':cols,'rows':rows,'items':items},ensure_ascii=False,indent=2)+'\n')
print('Atlas de criaturas e objetos das fases 9–16 reconstruídos.')
