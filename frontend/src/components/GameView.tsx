import { useEffect, useRef, useState } from 'react';
import { Assets } from '../game/assets';
import { Engine, type Control, type LevelResult } from '../game/engine';
import { starsFor } from '../app/progress';
import { actionForCode, getSettings } from '../app/settings';
import { useSettings } from '../hooks/useSettings';
import { audio } from '../game/audio';
import { fullscreenSupported, toggleFullscreen } from '../app/pwa';
import { SettingsDialog } from './Dialogs';
import { layouts } from '../game/levels/layouts';
import s from './Screens.module.css';

/** Celular em pé: os controles de toque e a visão do jogo só fazem sentido na horizontal. */
const PORTRAIT = '(orientation: portrait) and (max-width: 900px)';
const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Número que sobe até o valor final (some a animação se o sistema pede movimento reduzido). */
function Count({ to, delay = 0, ms = 900 }: { to: number; delay?: number; ms?: number }) {
  const [v, setV] = useState(reduceMotion() ? to : 0);
  useEffect(() => {
    if (reduceMotion()) { setV(to); return; }
    let raf = 0; const t0 = performance.now() + delay;
    const f = (n: number) => { const u = Math.min(1, Math.max(0, (n - t0) / ms)); setV(Math.round(to * (1 - Math.pow(1 - u, 3)))); if (u < 1) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf);
  }, [to, delay, ms]);
  return <>{v}</>;
}

/** Confete em CSS puro para a tela de vitória (posições determinísticas). */
function Confetti() {
  const cols = ['#b6ff6a', '#ffe35b', '#7dffaa', '#eafff0', '#5ad76b'];
  return (
    <div className={s.confetti} aria-hidden="true">
      {Array.from({ length: 30 }, (_, i) => {
        const r = (n: number) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
        return <i key={i} style={{ left: `${r(1) * 100}%`, background: cols[i % cols.length], width: 6 + r(2) * 7, height: 10 + r(3) * 10, animationDelay: `${r(4) * 1.4}s`, animationDuration: `${2.2 + r(5) * 1.8}s` }} />;
      })}
    </div>
  );
}

interface Props { level: number; runId: string; character: 'crisoman'|'crisogirl'; skinId: string; petId: string|null; skills: {jump:number;speed:number;defense:number;magnet:number}; petLevel:number; onExit: () => void; onWin: (level: number, r: LevelResult, stars: number, runId: string) => Promise<{ coins: number; materials: number; discarded?: number }>; onNext: (level: number) => void }

export default function GameView({ level, runId, character, skinId, petId, skills, petLevel, onExit, onWin, onNext }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const announcements = useRef<HTMLDivElement>(null);
  const announceFrame = useRef<number | null>(null);
  const engine = useRef<Engine | null>(null);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<{ win: boolean; r: LevelResult; stars: number; payout?: { coins: number; materials: number; discarded?: number }; settleError?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const st = useSettings();
  const settingsRef = useRef(false); settingsRef.current = settingsOpen;
  const resultRef = useRef(result); resultRef.current = result;

  useEffect(() => {
    let dead = false; let eng: Engine | null = null;
    setResult(null); setPaused(false); setSettingsOpen(false); setLoading(true); audio.duck(false);
    Assets.get().then((a) => {
      if (dead || !canvas.current) return;
      eng = new Engine(canvas.current, a, level, {
        onWin: (r) => { const stars = starsFor(r.materials, r.totalMaterials); void onWin(level, r, stars, runId).then((payout) => setResult({ win: true, r, stars, payout })).catch(() => setResult({ win: true, r, stars, payout: { coins: 0, materials: 0 }, settleError: true })); },
        onLose: (r) => setResult({ win: false, r, stars: 0 }),
        onAnnounce: (message) => {
          const region = announcements.current; if (!region) return;
          region.textContent = '';
          if (announceFrame.current !== null) cancelAnimationFrame(announceFrame.current);
          announceFrame.current = requestAnimationFrame(() => { if (announcements.current) announcements.current.textContent = message; });
        },
      }, { character, skinId, petId, skills, petLevel });
      engine.current = eng; eng.start(); setLoading(false);
      if (announcements.current) announcements.current.textContent = `Fase ${level + 1}: ${name}. ${layouts[level]?.objective ?? ''} Consulte o tutorial ou as configurações para ver os comandos.`;
      if (window.matchMedia?.(PORTRAIT).matches) setPause(true);
    });
    return () => { dead = true; eng?.destroy(); engine.current = null; if (announceFrame.current !== null) cancelAnimationFrame(announceFrame.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, run, runId, character, skinId, petId, skills.jump, skills.speed, skills.defense, skills.magnet]);

  // pausa: Esc (fixo) ou a tecla "Pausar" configurada; ignorada com a janela de configurações aberta (Esc fecha a janela)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.repeat || settingsRef.current) return;
      if (e.code === 'Escape' || actionForCode(e.code, getSettings().keys) === 'pause') toggle();
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  const setPause = (v: boolean) => { const e = engine.current; if (!e || resultRef.current || e.paused === v) return; if (v) e.releaseAll(); e.paused = v; setPaused(v); audio.duck(v); };
  const toggle = () => { const e = engine.current; if (e) setPause(!e.paused); };
  // opção "Pausar ao sair da aba"
  useEffect(() => {
    const off = () => { if (getSettings().pauseOnBlur) setPause(true); };
    const vis = () => { if (document.hidden) off(); };
    window.addEventListener('blur', off); document.addEventListener('visibilitychange', vis);
    return () => { window.removeEventListener('blur', off); document.removeEventListener('visibilitychange', vis); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => audio.duck(false), []);
  const [portrait, setPortrait] = useState(() => !!window.matchMedia?.(PORTRAIT).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(PORTRAIT); if (!mq) return;
    const on = () => { setPortrait(mq.matches); if (mq.matches) setPause(true); };
    mq.addEventListener?.('change', on); return () => mq.removeEventListener?.('change', on);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const restart = () => { setSettingsOpen(false); setRun((n) => n + 1); };
  const hold = (c: Control) => ({
    onPointerDown: (ev: React.PointerEvent) => { ev.preventDefault(); (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId); engine.current?.setControl(c, true); },
    onPointerUp: () => engine.current?.setControl(c, false), onPointerCancel: () => engine.current?.setControl(c, false), onPointerLeave: () => engine.current?.setControl(c, false),
  });
  const name = layouts[level]?.name ?? '';
  return (
    <div className={s.game}>
      <canvas ref={canvas} className={s.canvas} role="img" aria-label={`Jogo CrisoGuardian: fase ${level + 1}, ${name}. Use os controles do teclado ou os botões de toque. Abra as configurações para consultar os comandos.`} />
      <div ref={announcements} className={s.srOnly} role="status" aria-live="polite" aria-atomic="true" />
      {portrait && (
        <div className={s.rotateGame} role="alert">
          <i className={s.phoneIcon} aria-hidden="true" />
          <b>Gire o celular</b>
          <span>O CrisoGuardian é jogado na horizontal.</span>
        </div>
      )}
      {loading && <div className={s.loading}>Carregando {name}…</div>}
      {!loading && !result && <button className={s.pauseBtn} onClick={toggle} aria-label="Pausar">{paused ? '▶' : '❚❚'}</button>}
      <div className={s.mobile} data-touch={st.touchMode} data-size={st.touchSize}>
        <div className={s.pad}><button aria-label="Mover à esquerda" {...hold('left')}>◀</button><button aria-label="Mover à direita" {...hold('right')}>▶</button><button aria-label="Subir escada" {...hold('up')}>▲</button><button aria-label="Descer escada" {...hold('down')}>▼</button></div>
        <div className={s.pad}><button aria-label="Ativar ataque especial" {...hold('special')}>★</button><button aria-label="Atirar" {...hold('shoot')}>●</button><button className={s.jump} aria-label="Pular" {...hold('jump')}>⤒</button></div>
      </div>
      {paused && !result && (
        <div className={s.overlay}><div className={`${s.dialog} ${s.dlgPause}`} role="dialog" aria-modal="true" aria-labelledby="pause-title"><h2 id="pause-title">Pausado</h2>
          <button onClick={toggle} autoFocus>Continuar</button><button className={s.secondary} onClick={restart}>Reiniciar fase</button><button className={s.secondary} onClick={() => setSettingsOpen(true)}>Configurações</button>
          {fullscreenSupported() && <button className={s.secondary} onClick={() => { void toggleFullscreen(); }}>Tela cheia</button>}
          <button className={s.ghost} onClick={onExit}>Voltar ao mapa</button></div></div>
      )}
      {paused && !result && settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} inGame={{ onRestart: restart, onExit }} />}
      {result && (
        <div className={`${s.overlay} ${result.win ? s.overlayWin : ''}`}>
          {result.win && <Confetti />}
          <div className={`${s.dialog} ${s.pop} ${s.dlgSplit}`} role="dialog" aria-modal="true" aria-labelledby="result-title">
            <div className={s.dlgHead}>
              {result.win && <p className={s.kicker}>Fase {level + 1} · {name}</p>}
              <h2 id="result-title" className={result.win ? s.winTitle : undefined}>{result.win ? 'Fase concluída!' : 'Você foi derrotado'}</h2>
              {result.win && <div className={s.stars}>{[0, 1, 2].map((k) => <span key={k} className={k < result.stars ? `${s.starOn} ${s.starPop}` : s.starOff} style={k < result.stars ? { animationDelay: `${0.45 + k * 0.4}s` } : undefined}>★</span>)}</div>}
            </div>
            <div className={s.dlgBody}>
              <div className={s.results}>
                <span className={s.rowIn} style={{ animationDelay: '.25s' }}>Pontos <b><Count to={result.r.score} delay={250} /></b></span>
                <span className={s.rowIn} style={{ animationDelay: '.4s' }}>Moedas validadas <b><Count to={result.payout?.coins ?? 0} delay={400} /></b></span>
                <span className={s.rowIn} style={{ animationDelay: '.55s' }}>Materiais no inventário <b><Count to={result.payout?.materials ?? 0} delay={550} /></b></span>
                <span className={s.rowIn} style={{ animationDelay: '.65s' }}>Resíduos recuperados <b><Count to={result.r.materials} delay={650} />/{result.r.totalMaterials}</b></span>
                {result.settleError && <p role={'alert'}>A vitória não foi registrada no servidor. Verifique a conexão antes de continuar.</p>}
                <span className={s.rowIn} style={{ animationDelay: '.7s' }}>Tempo <b><Count to={Math.round(result.r.time)} delay={700} />s</b></span>
              </div>
              {result.win && !result.settleError && level < layouts.length - 1 && <button className={s.nextBtn} onClick={() => onNext(level + 1)} autoFocus>Próxima fase ▶</button>}
              {result.win && level === layouts.length - 1 && <p>Você salvou o Planeta Crisoverde! 🌍</p>}
              <button className={s.secondary} autoFocus={!result.win} onClick={() => setRun((n) => n + 1)}>{result.win ? 'Jogar de novo' : 'Tentar de novo'}</button>
              <button className={s.ghost} onClick={onExit}>Voltar ao mapa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





