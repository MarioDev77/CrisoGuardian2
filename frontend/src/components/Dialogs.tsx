import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ACTION_LABEL, ACTIONS, clearAlt, defaultSettings, DIFFICULTY, getSettings, keyLabel, QUALITY, rebind, resetSettings, updateSettings,
  type Action, type Difficulty, type Quality,
} from '../app/settings';
import { useSettings } from '../hooks/useSettings';
import { audio } from '../game/audio';
import s from './Screens.module.css';

/** Janela modal: fecha com Esc ou clicando fora. */
export function Modal({ label, onClose, wide, children }: { label: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  // o botão com foco automático fica no rodapé: em tela baixa isso rolava a janela até o fim; abre sempre no topo
  useEffect(() => { if (box.current) box.current.scrollTop = 0; }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.code === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className={s.overlay} onClick={onClose}>
      <div ref={box} className={`${s.dialog} ${wide ? s.dialogWide : ''}`} role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ controles reutilizáveis */
function Row({ name, hint, children }: { name: string; hint?: string; children: ReactNode }) {
  return <div className={s.setRow}><div><div className={s.setName}>{name}</div>{hint && <div className={s.setHint}>{hint}</div>}</div><div className={s.setCtl}>{children}</div></div>;
}
function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className={s.seg} role="group" aria-label={label}>
      {options.map((o) => <button key={o.v} type="button" aria-pressed={o.v === value} onClick={() => onChange(o.v)}>{o.label}</button>)}
    </div>
  );
}
function Switch({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={value} aria-label={label} className={`${s.switch} ${value ? s.switchOn : ''}`} onClick={() => onChange(!value)}><i /></button>;
}
function Slider({ label, value, onChange, onCommit }: { label: string; value: number; onChange: (v: number) => void; onCommit?: () => void }) {
  return (
    <div className={s.range}>
      <input type="range" min={0} max={100} step={1} value={Math.round(value * 100)} aria-label={label}
        onChange={(e) => onChange(Number(e.target.value) / 100)} onPointerUp={onCommit} onKeyUp={onCommit} />
      <output>{Math.round(value * 100)}%</output>
    </div>
  );
}

type Tab = 'jogo' | 'audio' | 'controles' | 'tela';
const TABS: { id: Tab; label: string }[] = [{ id: 'jogo', label: 'Jogo' }, { id: 'audio', label: 'Áudio' }, { id: 'controles', label: 'Controles' }, { id: 'tela', label: 'Tela' }];

/** Mostra uma frase de teste do volume (efeito sonoro) quando o jogador solta o controle. */
const preview = () => { audio.unlock(); audio.sfx('coin'); };

function GamePanel({ inGame }: { inGame?: InGame }) {
  const st = useSettings();
  return (
    <div className={s.panel}>
      <Row name="Dificuldade" hint={DIFFICULTY[st.difficulty].hint + (inGame ? ' · vale ao reiniciar a fase' : '')}>
        <Seg label="Dificuldade" value={st.difficulty} onChange={(difficulty) => updateSettings({ difficulty })} options={(Object.keys(DIFFICULTY) as Difficulty[]).map((v) => ({ v, label: DIFFICULTY[v].label }))} />
      </Row>
      <Row name="Tiro automático" hint="Atira sozinho, sem precisar segurar o botão."><Switch label="Tiro automático" value={st.autoFire} onChange={(autoFire) => updateSettings({ autoFire })} /></Row>
      <Row name="Abertura da fase" hint="Animação com o nome da fase ao começar."><Switch label="Abertura da fase" value={st.introAnim} onChange={(introAnim) => updateSettings({ introAnim })} /></Row>
      <Row name="Pausar ao sair da aba" hint="Pausa sozinho se você trocar de janela."><Switch label="Pausar ao sair da aba" value={st.pauseOnBlur} onChange={(pauseOnBlur) => updateSettings({ pauseOnBlur })} /></Row>
      {inGame && (
        <>
          <h3 className={s.secTitle}>Fase atual</h3>
          <button onClick={inGame.onRestart}>Reiniciar fase</button>
          <button className={s.secondary} onClick={inGame.onExit}>Voltar ao mapa</button>
        </>
      )}
    </div>
  );
}

function AudioPanel() {
  const st = useSettings();
  return (
    <div className={s.panel}>
      <Row name="Som" hint="Desligue para silenciar tudo."><Switch label="Som ligado" value={!st.muted} onChange={(on) => { updateSettings({ muted: !on }); if (on) preview(); }} /></Row>
      <Row name="Volume geral"><Slider label="Volume geral" value={st.master} onChange={(master) => updateSettings({ master })} onCommit={preview} /></Row>
      <Row name="Música"><Slider label="Volume da música" value={st.music} onChange={(music) => updateSettings({ music })} /></Row>
      <Row name="Efeitos sonoros"><Slider label="Volume dos efeitos" value={st.sfx} onChange={(sfx) => updateSettings({ sfx })} onCommit={preview} /></Row>
      {st.muted && <p className={s.setHint}>O som está desligado: os volumes abaixo só voltam a valer quando você ligar o som.</p>}
    </div>
  );
}

function ControlsPanel() {
  const st = useSettings(); const [listen, setListen] = useState<{ a: Action; slot: 0 | 1 } | null>(null); const [msg, setMsg] = useState('');
  // enquanto espera uma tecla, captura antes de qualquer outro atalho (Esc cancela em vez de fechar a janela)
  useEffect(() => {
    if (!listen) return;
    const k = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (e.repeat) return;
      if (e.code === 'Escape') { setListen(null); setMsg('Cancelado.'); return; }
      const r = rebind(getSettings().keys, listen.a, listen.slot, e.code);
      if (!r.ok) { setMsg(r.reason ?? 'Tecla não permitida.'); return; }
      updateSettings({ keys: r.keys }); setListen(null);
      setMsg(r.swapped ? `${keyLabel(e.code)} agora é “${ACTION_LABEL[listen.a]}”. “${ACTION_LABEL[r.swapped]}” ficou com ${keyLabel(r.keys[r.swapped][0])}.` : `${ACTION_LABEL[listen.a]}: ${keyLabel(e.code)} ✓`);
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [listen]);
  const slotBtn = (a: Action, slot: 0 | 1) => {
    const on = listen?.a === a && listen.slot === slot;
    return (
      <button type="button" className={`${s.keyBtn} ${on ? s.keyListen : ''}`} aria-label={`${ACTION_LABEL[a]} — tecla ${slot ? 'alternativa' : 'principal'}: ${on ? 'aguardando' : keyLabel(st.keys[a][slot])}`}
        onClick={() => { setMsg(''); setListen(on ? null : { a, slot }); }}>{on ? 'Pressione…' : keyLabel(st.keys[a][slot])}</button>
    );
  };
  return (
    <div className={s.panel}>
      <p className={s.setHint}>Clique numa tecla e pressione a nova. Cada ação tem uma tecla principal e uma alternativa. <kbd>Esc</kbd> sempre pausa/volta.</p>
      <div className={s.keyTable} role="table" aria-label="Teclas">
        {ACTIONS.map((a) => (
          <div key={a} className={s.keyRow} role="row">
            <span role="cell">{ACTION_LABEL[a]}</span>
            <span role="cell" className={s.keyCells}>{slotBtn(a, 0)}{slotBtn(a, 1)}
              <button type="button" className={s.keyClear} aria-label={`Limpar tecla alternativa de ${ACTION_LABEL[a]}`} disabled={!st.keys[a][1]} onClick={() => updateSettings({ keys: clearAlt(st.keys, a) })}>×</button>
            </span>
          </div>
        ))}
      </div>
      <p className={s.note} role="status">{msg}</p>
      <button className={s.secondary} onClick={() => { setListen(null); updateSettings({ keys: defaultSettings().keys }); setMsg('Teclas restauradas ✓'); }}>Restaurar teclas padrão</button>
      <h3 className={s.secTitle}>Toque (celular)</h3>
      <Row name="Botões na tela" hint="Automático mostra só em telas de toque."><Seg label="Botões na tela" value={st.touchMode} onChange={(touchMode) => updateSettings({ touchMode })} options={[{ v: 'auto', label: 'Auto' }, { v: 'on', label: 'Sempre' }, { v: 'off', label: 'Nunca' }]} /></Row>
      <Row name="Tamanho dos botões"><Seg label="Tamanho dos botões" value={st.touchSize} onChange={(touchSize) => updateSettings({ touchSize })} options={[{ v: 'sm', label: 'P' }, { v: 'md', label: 'M' }, { v: 'lg', label: 'G' }]} /></Row>
    </div>
  );
}

function ScreenPanel() {
  const st = useSettings(); const [fs, setFs] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  useEffect(() => { const f = () => setFs(!!document.fullscreenElement); document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f); }, []);
  const can = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen && document.fullscreenEnabled !== false;
  const toggleFs = () => { try { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen(); } catch { /* ignore */ } };
  return (
    <div className={s.panel}>
      <Row name="Qualidade gráfica" hint="Menos qualidade = mais fluidez em aparelhos fracos.">
        <Seg label="Qualidade gráfica" value={st.quality} onChange={(quality) => updateSettings({ quality })} options={(Object.keys(QUALITY) as Quality[]).map((v) => ({ v, label: QUALITY[v].label }))} />
      </Row>
      <Row name="Tela cheia" hint={can ? undefined : 'Este navegador não permite tela cheia.'}>
        <button type="button" className={s.btnSmall} disabled={!can} onClick={toggleFs}>{fs ? 'Sair da tela cheia' : 'Entrar em tela cheia'}</button>
      </Row>
      <Row name="Tremor de tela" hint="Sacudidas em golpes e explosões. Desligue se incomodar."><Switch label="Tremor de tela" value={st.screenShake} onChange={(screenShake) => updateSettings({ screenShake })} /></Row>
      <Row name="Luz e vinheta" hint="Efeito de iluminação sobre a fase."><Switch label="Luz e vinheta" value={st.lighting} onChange={(lighting) => updateSettings({ lighting })} /></Row>
      <Row name="Mostrar FPS" hint="Contador de quadros por segundo durante a fase."><Switch label="Mostrar FPS" value={st.showFps} onChange={(showFps) => updateSettings({ showFps })} /></Row>
    </div>
  );
}

export interface InGame { onRestart: () => void; onExit: () => void }

/** Configurações — usada na tela de título, no mapa e no menu de pausa (mesmas opções nos três lugares). */
export function SettingsDialog({ onClose, inGame }: { onClose: () => void; inGame?: InGame }) {
  const [tab, setTab] = useState<Tab>('jogo'); const [msg, setMsg] = useState(''); const [confirmReset, setConfirmReset] = useState(false);
  return (
    <Modal label="Configurações" onClose={onClose} wide>
      <h2>Configurações</h2>
      <div className={s.tabs} role="tablist" aria-label="Seções">
        {TABS.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? s.tabOn : ''} onClick={() => { setTab(t.id); setMsg(''); }}>{t.label}</button>)}
      </div>
      <div role="tabpanel" aria-label={TABS.find((t) => t.id === tab)!.label}>
        {tab === 'jogo' && <GamePanel inGame={inGame} />}
        {tab === 'audio' && <AudioPanel />}
        {tab === 'controles' && <ControlsPanel />}
        {tab === 'tela' && <ScreenPanel />}
      </div>
      <p className={s.note} role="status">{msg}</p>
      <div className={s.footer}>
        {!confirmReset
          ? <button className={s.ghost} onClick={() => setConfirmReset(true)}>Restaurar padrões</button>
          : <button className={s.secondary} onClick={() => { resetSettings(); setConfirmReset(false); setMsg('Configurações restauradas ✓'); }}>Confirmar: restaurar tudo</button>}
        <button onClick={onClose} autoFocus>Fechar</button>
      </div>
    </Modal>
  );
}

/** Tutorial — descreve exatamente os controles e regras que existem no motor do jogo. */
export function TutorialDialog({ onClose }: { onClose: () => void }) {
  const st = useSettings();
  const keysOf = (a: Action) => st.keys[a].filter(Boolean).map((c, i) => <kbd key={i}>{keyLabel(c)}</kbd>);
  return (
    <Modal label="Tutoriais" onClose={onClose} wide>
      <h2>Como jogar</h2>
      <div className={s.tut}>
        <section>
          <h3>Objetivo</h3>
          <ul>
            <li>Atravesse cada fase <b>reciclando os resíduos</b>, coletando moedas e derrotando os bichos do lixo.</li>
            <li>Chegue ao <b>portal de reciclagem</b> no fim da fase. Na última fase, derrote o <b>Monstro do Lixão</b> antes.</li>
          </ul>
        </section>
        <section>
          <h3>Teclado <small>(mude em Configurações → Controles)</small></h3>
          <ul>
            {(['left', 'jump', 'shoot', 'special', 'up', 'pause'] as Action[]).map((a) => (
              <li key={a}>{a === 'left' ? <>{keysOf('left')} {keysOf('right')} — mover</> : a === 'up' ? <>{keysOf('up')} {keysOf('down')} — subir e descer escadas</> : <>{keysOf(a)} — {ACTION_LABEL[a].toLowerCase()}{a === 'special' ? ' (recarrega ao longo do tempo)' : ''}</>}</li>
            ))}
            <li><kbd>Esc</kbd> — pausar</li>
          </ul>
        </section>
        <section>
          <h3>Celular</h3>
          <ul><li>Use os botões na tela: ◀ ▶ mover, ▲ ▼ escadas, ⤒ pular, ● atirar e ★ especial.</li></ul>
        </section>
        <section>
          <h3>Dicas</h3>
          <ul>
            <li><b>Lixeiras ♻</b> são checkpoints: recuperam 1 coração e dão bônus pelos resíduos coletados desde a última.</li>
            <li><b>Estrelas:</b> recicle 60% dos resíduos da fase para 2 ★ e 90% para 3 ★.</li>
            <li><b>Power-ups:</b> escudo e velocidade duram 7 s; o coração recupera vida.</li>
          </ul>
        </section>
      </div>
      <button onClick={onClose}>Entendi!</button>
    </Modal>
  );
}

/** Confirmação de saída. */
export function ExitDialog({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal label="Sair do jogo" onClose={onClose}>
      <h2>Sair do jogo?</h2>
      <p>Seu progresso já fica salvo automaticamente neste aparelho.</p>
      <button className={s.secondary} onClick={onConfirm}>Sim, sair</button>
      <button onClick={onClose} autoFocus>Continuar jogando</button>
    </Modal>
  );
}
