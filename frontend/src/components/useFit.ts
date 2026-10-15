import { useEffect, useState } from 'react';

/** `bars` = sobrou faixa nas laterais/em cima e embaixo: quem usa pinta o fundo (ver `.backdrop`). */
export interface FitBox { left: number; top: number; width: number; height: number; bars: boolean }

export interface FitOpts {
  /** Esticada "gratuita" da arte (sem perceber): 1.25 = até 25% mais larga. */
  maxStretch?: number;
  /** Esticada máxima aceita para não cortar a faixa `safe` em telas muito largas e baixas (celular com barra do navegador). */
  cap?: number;
  /** Faixa vertical da arte (0 = topo, 1 = base) que NUNCA pode ser cortada — onde ficam logo e botões. */
  safe?: [number, number];
  /** Fração do corte que sai de cima (o resto sai de baixo), respeitando `safe`. */
  cropTop?: number;
}

/**
 * Encaixa uma arte de proporção fixa (artAspect = largura/altura) na tela inteira, sem faixas e sem desfoque:
 * primeiro estica um pouco (até maxStretch); se a tela for mais larga, corta em cima/embaixo SEM passar pela faixa `safe`,
 * esticando mais (até `cap`) quando preciso. Se nem assim couber, mostra a arte inteira centralizada (`bars`).
 * Tela muito diferente da arte (ex.: celular em pé) cai para o modo "caber" centralizado.
 */
export function fitArt(vw: number, vh: number, artAspect: number, o: FitOpts = {}): FitBox {
  const { maxStretch = 1.25, safe = [0, 1], cropTop = 0.5 } = o; const cap = Math.max(o.cap ?? maxStretch, maxStretch);
  const need = vw / vh / artAspect; // >1: tela mais larga que a arte
  if (need < 1 / maxStretch / 1.1) { // tela estreita demais: arte inteira centralizada
    const h = vw / artAspect; return { left: 0, top: (vh - h) / 2, width: vw, height: h, bars: true };
  }
  if (need >= 1 / maxStretch && need <= maxStretch) return { left: 0, top: 0, width: vw, height: vh, bars: false }; // só estica
  if (need > maxStretch) { // mais larga: estica e corta em cima/embaixo, preservando a faixa segura
    const m = 0.015, fReq = Math.min(1, safe[1] - safe[0] + 0.03); // fração da altura que precisa aparecer
    const s = Math.min(cap, Math.max(maxStretch, fReq * need)); // esticada horizontal escolhida
    if (s >= need) return { left: 0, top: 0, width: vw, height: vh, bars: false }; // esticou o bastante para caber tudo
    const f = s / need; // fração da altura da arte que aparece
    if (f + 1e-6 < fReq) { // nem esticando até `cap` cabe a faixa segura: arte inteira, com faixas nas laterais
      const w = vh * artAspect * cap; return { left: (vw - w) / 2, top: 0, width: w, height: vh, bars: true };
    }
    const lo = safe[1] + m - f, hi = safe[0] - m; // intervalo permitido para o topo da janela visível
    const t = Math.min(1 - f, Math.max(0, Math.min(Math.max(cropTop * (1 - f), lo), Math.max(hi, lo))));
    const h = vh / f; return { left: 0, top: -t * h, width: vw, height: h, bars: false };
  }
  const c = (1 / maxStretch) / need; const w = vw * c; // mais estreita: corta dos lados
  return { left: -(w - vw) / 2, top: 0, width: w, height: vh, bars: false };
}

export function useFit(artAspect: number, opts: FitOpts = {}): FitBox {
  const calc = (): FitBox => {
    const vv = window.visualViewport;
    return fitArt(Math.round(vv?.width ?? window.innerWidth), Math.round(vv?.height ?? window.innerHeight), artAspect, opts);
  };
  const [box, setBox] = useState<FitBox>(calc);
  const { maxStretch, cap, cropTop } = opts; const sa = opts.safe?.[0], sb = opts.safe?.[1];
  useEffect(() => {
    const on = () => setBox(calc());
    on();
    window.addEventListener('resize', on); window.addEventListener('orientationchange', on); window.visualViewport?.addEventListener('resize', on);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); window.visualViewport?.removeEventListener('resize', on); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artAspect, maxStretch, cap, cropTop, sa, sb]);
  return box;
}
