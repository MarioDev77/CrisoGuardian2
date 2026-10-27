import type { EconomyState } from '../app/economy';
import s from './Hub.module.css';

export type HubSection = 'lobby' | 'shop' | 'recycle';

export default function HubHeader({ active, economy, unlocked, onNavigate, onMap }: {
  active: HubSection;
  economy: EconomyState;
  unlocked: number;
  onNavigate: (section: HubSection) => void;
  onMap: () => void;
}) {
  return <header className={s.topbar}>
    <a className={s.brand} href="#hub" aria-label="CrisoGuardian — lobby" onClick={(event) => { event.preventDefault(); onNavigate('lobby'); }}>
      <img src="/assets/title/crisoguardian-logo.webp" alt="CrisoGuardian" />
      <span>PROTEGENDO O AMANHÃ</span>
    </a>
    <nav className={s.nav} aria-label="Navegação do jogo">
      <button type="button" aria-current={active === 'lobby' ? 'page' : undefined} onClick={() => onNavigate('lobby')}><Icon kind="home"/>Lobby</button>
      <button type="button" aria-current={active === 'shop' ? 'page' : undefined} onClick={() => onNavigate('shop')}><Icon kind="shop"/>Loja</button>
      <button type="button" aria-current={active === 'recycle' ? 'page' : undefined} onClick={() => onNavigate('recycle')}><Icon kind="recycle"/>Reciclagem</button>
    </nav>
    <div className={s.account}>
      <div className={s.level}><span>FASE LIBERADA</span><b>{String(unlocked).padStart(2, '0')}</b></div>
      <div className={s.wallet} aria-label={`${economy.coins} moedas`}><CoinIcon/><b>{economy.coins.toLocaleString('pt-BR')}</b></div>
      <button type="button" className={s.mapButton} onClick={onMap}>← <span>Fases</span></button>
    </div>
  </header>;
}

export function CoinIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><path d="M14.5 9.5c-.5-1-3.8-1.2-4.3.4-.7 2.2 4.7 1.3 4 3.7-.5 1.7-3.8 1.5-4.7.3M12 7.8v8.4"/></svg> }

function Icon({ kind }: { kind: 'home' | 'shop' | 'recycle' }) {
  if (kind === 'home') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z"/></svg>;
  if (kind === 'shop') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16v11H4zM3 9l2-5h14l2 5M8 13v3m4-3v3m4-3v3"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8.2 4.2 2.2-2.1 2.1 3.7-2.2 1.3L8.2 4.2Zm7.6 0 2.8.1-2.2 3.8-2.3-1.3 1.7-2.6ZM5.4 9.1H2.6l2.1 3.8 2.3-1.3-1.6-2.5Zm13.2 0h2.8l-2.1 3.8-2.3-1.3 1.6-2.5ZM8 18.6l-1.4 2.3h4.4v-2.6H8Zm8 0 1.4 2.3H13v-2.6h3ZM7.4 7h9.2l-4.6 8z"/></svg>;
}
