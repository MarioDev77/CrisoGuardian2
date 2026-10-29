import { useEffect, useRef, useState } from 'react';
import { ACHIEVEMENTS, achievementById } from '../app/catalog-ach';
import { NEW_ISLANDS } from '../app/catalog';
import type { PlayerStats } from '../app/api';
import type { Progress } from '../app/progress';
import a from './Account.module.css';

/** Botão fixo de conta (rodapé central): mostra o jogador conectado ou convida a salvar o progresso. */
export function AccountChip({ username, onOpen }: { username: string | null; onOpen: () => void }) {
  return <button type="button" className={a.chip} onClick={onOpen} aria-label={username ? `Conta de ${username}` : 'Entrar ou criar conta para salvar o progresso'}>
    <span aria-hidden="true">{username ? '👤' : '💾'}</span>{username ? <b>{username}</b> : <>Convidado · <b>salvar progresso</b></>}
  </button>;
}

function strength(pw: string): { n: number; label: string } {
  let n = 0; if (pw.length >= 8) n++; if (pw.length >= 12) n++; if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) n++; if (/\d/.test(pw) && /[^A-Za-z0-9]|[A-Za-z]/.test(pw)) n++;
  return { n, label: ['Muito curta', 'Fraca', 'Razoável', 'Boa', 'Forte'][n]! };
}

interface DialogProps { username: string | null; onClose: () => void; onRegister: (u: string, p: string) => Promise<string | null>; onLogin: (u: string, p: string) => Promise<string | null>; onLogout: () => Promise<void>; onDelete: (p: string) => Promise<string | null>; onProfile: () => void }

/** Janela de cadastro/entrada (ou resumo da conta, quando já conectado). */
export function AccountDialog({ username, onClose, onRegister, onLogin, onLogout, onDelete, onProfile }: DialogProps) {
  const [tab, setTab] = useState<'register' | 'login'>('register');
  const [user, setUser] = useState(''); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [confirmDel, setConfirmDel] = useState(false); const [show, setShow] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { first.current?.focus(); const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const st = strength(pw);
  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault(); setErr('');
    if (tab === 'register') {
      if (!/^[A-Za-z0-9_]{3,20}$/.test(user)) return setErr('Nome: 3 a 20 letras, números ou _ (sem espaços).');
      if (pw.length < 8) return setErr('A senha precisa ter pelo menos 8 caracteres.');
      if (pw !== pw2) return setErr('As senhas não são iguais.');
    }
    setBusy(true); const msg = await (tab === 'register' ? onRegister(user, pw) : onLogin(user, pw)); setBusy(false);
    if (msg) setErr(msg); else onClose();
  };
  const del = async (e: { preventDefault: () => void }) => { e.preventDefault(); setBusy(true); const m = await onDelete(pw); setBusy(false); if (m) setErr(m); else onClose(); };

  return <div className={a.overlay} role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={a.dialog} role="dialog" aria-modal="true" aria-labelledby="acc-title">
      <button type="button" className={a.close} onClick={onClose} aria-label="Fechar">✕</button>
      {username ? <>
        <h2 id="acc-title">👤 {username}</h2>
        <p className={a.hint}>Seu progresso, moedas, skins e conquistas estão salvos nesta conta e acompanham você em qualquer aparelho.</p>
        <div className={a.actions}><button type="button" className={a.primary} onClick={() => { onClose(); onProfile(); }}>🏅 Ver perfil e conquistas</button><button type="button" className={a.ghost} onClick={async () => { await onLogout(); onClose(); }}>Sair da conta</button></div>
        {!confirmDel ? <button type="button" className={a.danger} onClick={() => setConfirmDel(true)}>Excluir minha conta…</button> :
          <form onSubmit={del} className={a.delete}><p>Isso apaga a conta e todo o progresso. Digite sua senha para confirmar.</p>
            <input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Senha" aria-label="Senha" />
            {err && <p className={a.err} role="alert">{err}</p>}
            <div className={a.actions}><button type="submit" className={a.dangerSolid} disabled={busy || !pw}>Excluir para sempre</button><button type="button" className={a.ghost} onClick={() => { setConfirmDel(false); setPw(''); setErr(''); }}>Cancelar</button></div></form>}
      </> : <>
        <h2 id="acc-title">Salve seu progresso</h2>
        <p className={a.hint}>Crie uma conta gratuita para guardar fases, estrelas, moedas e conquistas — e continuar de onde parou em qualquer aparelho. O que você já jogou como convidado vai junto.</p>
        <div className={a.tabs} role="tablist"><button type="button" role="tab" aria-selected={tab === 'register'} onClick={() => { setTab('register'); setErr(''); }}>Criar conta</button><button type="button" role="tab" aria-selected={tab === 'login'} onClick={() => { setTab('login'); setErr(''); }}>Já tenho conta</button></div>
        <form onSubmit={submit} noValidate>
          <label>Nome de usuário<input ref={first} value={user} onChange={(e) => setUser(e.target.value.trim())} autoComplete="username" maxLength={20} placeholder="ex.: guardiao_verde" /></label>
          <label>Senha<span className={a.pwRow}><input type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={tab === 'register' ? 'new-password' : 'current-password'} maxLength={128} placeholder="mínimo 8 caracteres" /><button type="button" className={a.eye} onClick={() => setShow(!show)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>{show ? '🙈' : '👁'}</button></span></label>
          {tab === 'register' && <>
            <div className={a.meter} aria-hidden="true">{[0, 1, 2, 3].map((i) => <i key={i} className={i < st.n ? a[`s${st.n}`] : ''} />)}<span>{pw ? st.label : ''}</span></div>
            <label>Repita a senha<input type={show ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" maxLength={128} /></label>
          </>}
          {err && <p className={a.err} role="alert">{err}</p>}
          <button type="submit" className={a.primary} disabled={busy || !user || !pw}>{busy ? 'Aguarde…' : tab === 'register' ? 'Criar conta e salvar' : 'Entrar'}</button>
        </form>
        <p className={a.fine}>Guardamos só o nome de usuário e uma versão criptografada da senha (sem e-mail, sem dados pessoais). Nunca use a senha de outros sites.</p>
      </>}
    </div>
  </div>;
}

/** Tela de perfil: resumo, fases concluídas (mapas 1 e 2) e conquistas. */
export function Profile({ username, progress, achievements, stats, onBack, onOpenAccount }: { username: string | null; progress: Progress; achievements: Record<string, number>; stats: PlayerStats | null; onBack: () => void; onOpenAccount: () => void }) {
  const done = progress.stars.filter((x) => x > 0).length; const stars = progress.stars.reduce((x, y) => x + y, 0); const got = ACHIEVEMENTS.filter((x) => achievements[x.id]).length;
  const names = ['Floresta Viva', 'Rio Limpo', 'Cidade Verde', 'Montanha', 'Praia Limpa', 'Deserto', 'Metrópole', 'Planeta Crisoverde', ...NEW_ISLANDS.map((i) => i.name)];
  return <main className={a.profile}>
    <header className={a.pTop}><button type="button" className={a.ghost} onClick={onBack}>← Voltar</button><div><span>PERFIL DO GUARDIÃO</span><h1>{username ?? 'Convidado'}</h1></div>
      <button type="button" className={a.primary} onClick={onOpenAccount}>{username ? 'Conta' : '💾 Salvar progresso'}</button></header>
    {!username && <p className={a.banner}>Você está jogando como convidado: o progresso fica só neste navegador. Crie uma conta para não perder nada.</p>}
    <section className={a.stats} aria-label="Resumo"><div><b>{done}/{progress.stars.length}</b><span>Fases concluídas</span></div><div><b>⭐ {stars}/{progress.stars.length * 3}</b><span>Estrelas</span></div><div><b>{got}/{ACHIEVEMENTS.length}</b><span>Conquistas</span></div><div><b>{(stats?.materialsCollected ?? 0).toLocaleString('pt-BR')}</b><span>Materiais coletados</span></div></section>
    <h2 className={a.sec}>Fases</h2>
    <ol className={a.levels}>{progress.stars.map((s, i) => <li key={i} data-done={s > 0} data-locked={i + 1 > progress.unlocked}><i>{i + 1}</i><span>{names[i]}</span><em aria-label={`${s} estrelas`}>{[0, 1, 2].map((k) => <u key={k} className={k < s ? a.on : ''}>★</u>)}</em></li>)}</ol>
    <h2 className={a.sec}>Conquistas</h2>
    <ul className={a.ach}>{ACHIEVEMENTS.map((x) => { const at = achievements[x.id]; return <li key={x.id} data-got={!!at}><span className={a.icon} aria-hidden="true">{at ? x.icon : '🔒'}</span><span><b>{x.name}</b><small>{x.desc}</small>{at && <small className={a.date}>Desbloqueada em {new Date(at).toLocaleDateString('pt-BR')}</small>}</span></li>; })}</ul>
  </main>;
}

/** Aviso (toast) de conquista desbloqueada. */
export function AchievementToasts({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  useEffect(() => { if (!ids.length) return; const t = setTimeout(onDone, 5200 + ids.length * 600); return () => clearTimeout(t); }, [ids, onDone]);
  if (!ids.length) return null;
  return <div className={a.toasts} role="status" aria-live="polite">{ids.map((id, i) => { const x = achievementById(id); return x ? <div key={id} className={a.toast} style={{ animationDelay: `${i * 0.35}s` }}><span aria-hidden="true">{x.icon}</span><div><small>Conquista desbloqueada!</small><b>{x.name}</b></div></div> : null; })}</div>;
}
