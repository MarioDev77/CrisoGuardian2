import json,sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
src,meta,out=sys.argv[1:4]
a=json.load(open(meta));im=np.array(Image.open(src).convert('RGBA'))
res=np.zeros_like(im)
PAD=2
stats=dict(frames=0,specks=0,semi=0)
for n,f in a.items():
    x,y,w,h=f['x'],f['y'],f['w'],f['h']
    s=im[y:y+h,x:x+w].copy()
    if not n.startswith('fx_'):
        al=s[...,3].astype(int)
        al[al<16]=0; al[al>240]=255
        s[...,3]=al
        # strip light, desaturated outline remnants of the old background (not on gun frames)
        if n.startswith('p_') and not n.startswith(('p_shoot','p_special','p_reload')):
            rgb=s[...,:3].astype(int); mx=rgb.max(-1); mn=rgb.min(-1); lum=rgb.mean(-1)
            greyish=((mx-mn)<45)&(lum>150)&(al>0)
            edge=ndi.binary_dilation(al==0,structure=np.ones((3,3)),iterations=2)&(al>0)
            rm=greyish&edge
            s[rm]=0; al[rm]=0; stats['grey']=stats.get('grey',0)+int(rm.sum())
        # remove tiny detached specks (keep the largest blobs)
        lab,k=ndi.label(ndi.binary_dilation(al>0,structure=np.ones((3,3))),structure=np.ones((3,3)))
        if k>1:
            sizes=ndi.sum(al>0,lab,range(1,k+1))
            for i,sz in enumerate(sizes,1):
                if sz<=6 and sz<0.02*sizes.max():
                    s[(lab==i)&(al>0)]=0; stats['specks']+=1
            al=s[...,3].astype(int)
        # decontaminate: semi-transparent px take colour of nearest opaque px
        op=al==255; semi=(al>0)&(al<255)
        if op.any() and semi.any():
            idx=ndi.distance_transform_edt(~op,return_indices=True)[1]
            near=s[idx[0],idx[1],:3]
            s[semi,:3]=near[semi]; stats['semi']+=int(semi.sum())
    stats['frames']+=1
    # extrude PAD px of edge into the gap
    big=np.pad(s,((PAD,PAD),(PAD,PAD),(0,0)),mode='edge')
    H,W=res.shape[:2]
    y0,x0=y-PAD,x-PAD
    ys0,xs0=max(y0,0),max(x0,0); ye,xe=min(y0+h+2*PAD,H),min(x0+w+2*PAD,W)
    # only write into pixels not belonging to another frame's rect
    region=res[ys0:ye,xs0:xe]
    sub=big[ys0-y0:ye-y0,xs0-x0:xe-x0]
    mask=(region[...,3]==0)&(region[...,:3].sum(-1)==0)
    region[mask]=sub[mask]
    res[y:y+h,x:x+w]=s  # frame body always wins
Image.fromarray(res).save(out,optimize=True)
print(stats)
