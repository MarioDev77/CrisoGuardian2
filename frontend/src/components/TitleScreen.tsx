import { useCallback, useEffect, useState } from 'react';
import { ExitDialog, Modal, SettingsDialog, TutorialDialog } from './Dialogs';
import s from './Screens.module.css';
import { useFit } from './useFit';
import InstallButton from './InstallButton';

const ART = '/assets/title/crisoguardian-title.webp';
/** Botões pintados na arte (1536x1024): posição e tamanho em pixels da imagem original. */
const W = 1536, H = 1024;
const BTN = {
  play: { x: 577, y: 487, w: 381, h: 83 },
  settings: { x: 577, y: 581, w: 381, h: 80 },
  tutorial: { x: 577, y: 672, w: 381, h: 80 },
  exit: { x: 577, y: 764, w: 381, h: 81 },
} as const;
const box = (b: { x: number; y: number; w: number; h: number }) => ({ left: `${(b.x / W) * 100}%`, top: `${(b.y / H) * 100}%`, width: `${(b.w / W) * 100}%`, height: `${(b.h / H) * 100}%` });

type Panel = null | 'settings' | 'tutorial' | 'exit' | 'bye';
interface Props { onPlay: () => void }

export default function TitleScreen({ onPlay }: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  const [firstVisit, setFirstVisit] = useState(() => { try { return localStorage.getItem('crisoguardian-quickstart-v1') !== 'done'; } catch { return true; } });
  const [quickStart, setQuickStart] = useState(false);
  // faixa segura 7%–86%: do alto do logo até a base do botão SAIR nunca é cortada (celular com barra do navegador)
  const fit = useFit(W / H, { maxStretch: 1.25, cap: 1.6, safe: [0.07, 0.86], cropTop: 0.25 });
  const close = () => setPanel(null);
  const start = useCallback(() => { if (firstVisit) setQuickStart(true); else onPlay(); }, [firstVisit, onPlay]);
  const begin = useCallback(() => { try { localStorage.setItem('crisoguardian-quickstart-v1', 'done'); } catch { /* armazenamento indisponível: a sessão ainda pode começar */ } setFirstVisit(false); setQuickStart(false); onPlay(); }, [onPlay]);

  // Enter inicia o jogo (quando nenhuma janela está aberta e o foco não está em outro botão)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (panel !== null || (e.code !== 'Enter' && e.code !== 'NumpadEnter')) return;
      if (e.target instanceof HTMLButtonElement) return;
      start();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [panel, start]);

  // Navegadores só deixam fechar abas abertas pelo próprio jogo; se não fechar, mostramos a despedida.
  const quit = () => {
    setPanel(null);
    try { window.close(); } catch { /* ignore */ }
    setTimeout(() => setPanel('bye'), 250);
  };

  return (
    <div className={s.title}>
      {fit.bars && <div className={s.backdrop} style={{ backgroundImage: `url('${ART}')` }} aria-hidden="true" />}
      <div className={s.titleStage} style={{ backgroundImage: `url('${ART}')`, left: fit.left, top: fit.top, width: fit.width, height: fit.height }} role="group" aria-label="CrisoGuardian — Protegendo o amanhã">
        <button className={s.tbtn} style={box(BTN.play)} aria-label="Jogar" onClick={start} />
        <button className={s.tbtn} style={box(BTN.settings)} aria-label="Configurações" onClick={() => setPanel('settings')} />
        <button className={s.tbtn} style={box(BTN.tutorial)} aria-label="Tutoriais" onClick={() => setPanel('tutorial')} />
        <button className={s.tbtn} style={box(BTN.exit)} aria-label="Sair" onClick={() => setPanel('exit')} />
      </div>
      <div className={s.rotate}><i className={s.phoneIcon} aria-hidden="true" /> Gire o celular para jogar na horizontal</div>
      <InstallButton />

      {panel === 'settings' && <SettingsDialog onClose={close} />}
      {panel === 'tutorial' && <TutorialDialog onClose={close} />}
      {quickStart && <TutorialDialog onClose={() => setQuickStart(false)} onStart={begin} onSkip={begin} />}
      {panel === 'exit' && <ExitDialog onConfirm={quit} onClose={close} />}
      {panel === 'bye' && (
        <Modal label="Até logo" onClose={close}>
          <div className={`${s.bye}`} style={{ display: 'grid', justifyItems: 'center' }}>
            <div className={s.leaf} aria-hidden="true">🌱</div>
            <h2>Obrigado por jogar!</h2>
            <p>Pequenas ações fazem grandes mudanças. Você já pode fechar esta aba.</p>
            <button onClick={close} autoFocus>Voltar ao início</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
