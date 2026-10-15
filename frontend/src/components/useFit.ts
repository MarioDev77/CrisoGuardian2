import { useEffect, useState } from 'react';

export interface FitBox { left: number; top: number; width: number; height: number }

/**
 * Encaixa uma arte de proporção fixa (artAspect = largura/altura) na tela inteira, sem faixas e sem desfoque:
 * primeiro estica um pouco (até maxStretch), e só se ainda sobrar diferença corta o excesso.
 * `cropTop` = fração do corte que sai de cima (o resto sai de baixo) — 0.5 corta igual dos dois lados.
 * Se a tela for muito diferente da arte (ex.: celular em pé), cai para o modo "caber" centralizado.
 */
export function useFit(artAspect: number, maxStretch = 1.25, cropTop = 0.5): FitBox {
  const calc = (): FitBox => {
    const vv = window.visualViewport;
    const vw = Math.round(vv?.width ?? window.innerWidth), vh = Math.round(vv?.height ?? window.innerHeight);
    const need = vw / vh / artAspect; // >1: tela mais larga que a arte
    if (need < 1 / maxStretch / 1.1) { // tela estreita demais: arte inteira centralizada
      const h = vw / artAspect; return { left: 0, top: (vh - h) / 2, width: vw, height: h };
    }
    if (need >= 1 / maxStretch && need <= maxStretch) return { left: 0, top: 0, width: vw, height: vh }; // só estica
    if (need > maxStretch) { // mais larga: estica ao máximo e corta em cima/embaixo
      const c = need / maxStretch; const h = vh * c; return { left: 0, top: -(h - vh) * cropTop, width: vw, height: h };
    }
    const c = (1 / maxStretch) / need; const w = vw * c; // mais estreita: corta dos lados
    return { left: -(w - vw) / 2, top: 0, width: w, height: vh };
  };
  const [box, setBox] = useState<FitBox>(calc);
  useEffect(() => {
    const on = () => setBox(calc());
    on();
    window.addEventListener('resize', on); window.visualViewport?.addEventListener('resize', on);
    return () => { window.removeEventListener('resize', on); window.visualViewport?.removeEventListener('resize', on); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artAspect, maxStretch, cropTop]);
  return box;
}
