import { useEffect, useRef, useState } from 'react';
import { Assets } from '../game/assets';
import { Engine, type Control, type LevelResult } from '../game/engine';
import { starsFor } from '../app/progress';
import { actionForCode, getSettings } from '../app/settings';
import { useSettings } from '../hooks/useSettings';
import { audio } from '../game/audio';
import { SettingsDialog } from './Dialogs';
import { layouts } from '../game/levels/layouts';
import s from './Screens.module.css';

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

interface Props { level: number; onExit: () => void; onWin: (level: number, r: LevelResult, stars: number) => void; onNext: (level: number) => void }

export default function GameView({ level, onExit, onWin, onNext }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<{ win: boolean; r: LevelResult; stars: number } | null>(null);
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
        onWin: (r) => { const stars = starsFor(r.materials, r.totalMaterials); setResult({ win: true, r, stars }); onWin(level, r, stars); },
        onLose: (r) => setResult({ win: false, r, stars: 0 }),
      });
      engine.current = eng; eng.start(); setLoading(false);
    });
    return () => { dead = true; eng?.destroy(); engine.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, run]);

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
  const restart = () => { setSettingsOpen(false); setRun((n) => n + 1); };
  const hold = (c: Control) => ({
    onPointerDown: (ev: React.PointerEvent) => { ev.preventDefault(); (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId); engine.current?.setControl(c, true); },
    onPointerUp: () => engine.current?.setControl(c, false), onPointerCancel: () => engine.current?.setControl(c, false), onPointerLeave: () => engine.current?.setControl(c, false),
  });
  const name = layouts[level]?.name ?? '';
  return (
    <div className={s.game}>
      <canvas ref={canvas} className={s.canvas} />
      <div className={s.rotateGame}>↻ Gire o celular para jogar em tela cheia</div>
      {loading && <div className={s.loading}>Carregando {name}…</div>}
      {!loading && !result && <button className={s.pauseBtn} onClick={toggle} aria-label="Pausar">{paused ? '▶' : '❚❚'}</button>}
      <div className={s.mobile} data-touch={st.touchMode} data-size={st.touchSize}>
        <div className={s.pad}><button {...hold('left')}>◀</button><button {...hold('right')}>▶</button><button {...hold('up')}>▲</button><button {...hold('down')}>▼</button></div>
        <div className={s.pad}><button {...hold('special')}>★</button><button {...hold('shoot')}>●</button><button className={s.jump} {...hold('jump')}>⤒</button></div>
      </div>
      {paused && !result && (
        <div className={s.overlay}><div className={s.dialog}><h2>Pausado</h2>
          <button onClick={toggle}>Continuar</button><button className={s.secondary} onClick={restart}>Reiniciar fase</button><button className={s.secondary} onClick={() => setSettingsOpen(true)}>Configurações</button><button className={s.ghost} onClick={onExit}>Voltar ao mapa</button></div></div>
      )}
      {paused && !result && settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} inGame={{ onRestart: restart, onExit }} />}
      {result && (
        <div className={`${s.overlay} ${result.win ? s.overlayWin : ''}`}>
          {result.win && <Confetti />}
          <div className={`${s.dialog} ${s.pop}`}>
            {result.win && <p className={s.kicker}>Fase {level + 1} · {name}</p>}
            <h2 className={result.win ? s.winTitle : undefined}>{result.win ? 'Fase concluída!' : 'Você foi derrotado'}</h2>
            {result.win && <div className={s.stars}>{[0, 1, 2].map((k) => <span key={k} className={k < result.stars ? `${s.starOn} ${s.starPop}` : s.starOff} style={k < result.stars ? { animationDelay: `${0.45 + k * 0.4}s` } : undefined}>★</span>)}</div>}
            <div className={s.results}>
              <span className={s.rowIn} style={{ animationDelay: '.25s' }}>Pontos <b><Count to={result.r.score} delay={250} /></b></span>
              <span className={s.rowIn} style={{ animationDelay: '.4s' }}>Moedas <b><Count to={result.r.coins} delay={400} /></b></span>
              <span className={s.rowIn} style={{ animationDelay: '.55s' }}>Resíduos reciclados <b><Count to={result.r.materials} delay={550} />/{result.r.totalMaterials}</b></span>
              <span className={s.rowIn} style={{ animationDelay: '.7s' }}>Tempo <b><Count to={Math.round(result.r.time)} delay={700} />s</b></span>
            </div>
            {result.win && level < layouts.length - 1 && <button className={s.nextBtn} onClick={() => onNext(level + 1)} autoFocus>Próxima fase ▶</button>}
            {result.win && level === layouts.length - 1 && <p>Você salvou o Planeta Crisoverde! 🌍</p>}
            <button className={s.secondary} onClick={() => setRun((n) => n + 1)}>{result.win ? 'Jogar de novo' : 'Tentar de novo'}</button>
            <button className={s.ghost} onClick={onExit}>Voltar ao mapa</button>
          </div>
        </div>
      )}
    </div>
  );
}
