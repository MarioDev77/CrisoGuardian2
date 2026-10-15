import { useState } from 'react';
import { LEVEL_COUNT, type Progress } from '../app/progress';
import { SettingsDialog } from './Dialogs';
import s from './Screens.module.css';
import { useFit } from './useFit';

/** Node positions measured on the 1774x887 map art (lock disc centre, number pill, stars). */
const NODES = [
  { x: 152, lock: 0, num: 463, star: 505 }, { x: 452, lock: 348, num: 392, star: 416 }, { x: 747, lock: 284, num: 328, star: 352 },
  { x: 1105, lock: 237, num: 281, star: 305 }, { x: 1540, lock: 248, num: 292, star: 316 }, { x: 1547, lock: 493, num: 537, star: 561 },
  { x: 1178, lock: 622, num: 666, star: 690 }, { x: 627, lock: 681, num: 725, star: 749 },
];
const W = 1774, H = 887;
const px = (v: number) => `${(v / W) * 100}cqw`;
const L = (x: number) => `${(x / W) * 100}%`;
const T = (y: number) => `${(y / H) * 100}%`;

interface Props { progress: Progress; onPlay: (level: number) => void; onBack: () => void }

export default function WorldMap({ progress, onPlay, onBack }: Props) {
  // o mapa inteiro é "seguro" (HUD no topo, botão de fases na base): estica até 1.5x e, se não couber, mostra inteiro com fundo desfocado nas laterais
  const fit = useFit(W / H, { maxStretch: 1.25, cap: 1.5, safe: [0, 0.96], cropTop: 0.5 });
  const [shake, setShake] = useState(-1);
  const [settings, setSettings] = useState(false);
  const click = (i: number) => {
    if (i + 1 <= progress.unlocked) onPlay(i);
    else { setShake(i); setTimeout(() => setShake(-1), 500); }
  };
  return (
    <div className={s.mapWrap}>
      {fit.bars && <div className={s.backdrop} style={{ backgroundImage: "url('/assets/map/mapa.png')" }} aria-hidden="true" />}
      <div className={s.map} style={{ backgroundImage: "url('/assets/map/mapa.png')", left: fit.left, top: fit.top, width: fit.width, height: fit.height }}>
        {/* selo CrisoGuardian cobre o logo antigo pintado no canto do mapa */}
        <div className={s.brand} style={{ left: 0, top: 0, width: px(392), height: px(190) }}>
          <img src="/assets/title/crisoguardian-logo.webp" alt="CrisoGuardian" />
          <span>PROTEGENDO O AMANHÃ</span>
        </div>
        {/* live values over the painted HUD */}
        <div className={s.hudPill} style={{ left: L(684), top: T(33), width: px(108), height: px(36) }}>NÍVEL {progress.unlocked}</div>
        <div className={s.hudPill} style={{ left: L(1122), top: T(33), width: px(92), height: px(36) }}>{progress.coins}</div>
        {NODES.map((n, i) => {
          const open = i + 1 <= progress.unlocked; const st = progress.stars[i] ?? 0; const cls = `${s.node} ${shake === i ? s.shake : ''}`;
          const top = i === 0 ? n.num - 36 : n.lock - 42;
          return (
            <div key={i}>
              {i > 0 && <div className={`${s.disc} ${open ? s.discOpen : ''}`} style={{ left: L(n.x), top: T(n.lock), width: px(76), height: px(76) }}>{open ? '♻' : <Lock />}</div>}
              <div className={`${s.numPill} ${open ? s.numOpen : ''}`} style={{ left: L(n.x), top: T(n.num), width: px(66), height: px(42) }}>{i + 1}</div>
              <div className={s.starPill} style={{ left: L(n.x), top: T(n.star), width: px(94), height: px(30) }}>
                {[0, 1, 2].map((k) => <span key={k} className={k < st ? s.starOn : s.starOff}>★</span>)}
              </div>
              <button aria-label={`Fase ${i + 1}`} className={cls} style={{ left: L(n.x), top: T(top), width: px(150), height: px(i === 0 ? 170 : 215) }} onClick={() => click(i)} />
            </div>
          );
        })}
        <button aria-label="Configurações" className={s.hit} style={{ left: L(1628), top: T(48), width: px(70), height: px(70) }} onClick={() => setSettings(true)} />
        <button aria-label="Voltar à tela inicial" className={s.hit} style={{ left: L(1717), top: T(48), width: px(70), height: px(70) }} onClick={onBack} />
        <button aria-label="Escolha uma fase" className={s.hit} style={{ left: L(1602), top: T(805), width: px(300), height: px(86) }} onClick={() => onPlay(Math.min(progress.unlocked, LEVEL_COUNT) - 1)} />
      </div>
      {settings && <SettingsDialog onClose={() => setSettings(false)} />}
    </div>
  );
}

function Lock() {
  return (
    <svg viewBox="0 0 24 24" width="52%" height="52%" aria-hidden="true">
      <path d="M7 10V8a5 5 0 0 1 10 0v2" fill="none" stroke="#dfe9e2" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="5" y="10" width="14" height="11" rx="2.5" fill="#f2d046" stroke="#8a6d10" strokeWidth="1.2" />
      <circle cx="12" cy="15" r="1.7" fill="#6b4f0b" />
    </svg>
  );
}
