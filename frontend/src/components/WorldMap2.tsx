import { NEW_ISLANDS } from '../app/catalog';
import { LEVEL_COUNT, type Progress } from '../app/progress';
import m from './Map2.module.css';

/** Posição de cada ilha no caminho (percentual do painel) — zigue-zague para a trilha parecer uma jornada. */
const SPOTS: [number, number][] = [[9, 68], [21, 32], [33, 70], [45, 30], [57, 70], [69, 32], [81, 68], [92, 30]];

interface Props { progress: Progress; onPlay: (level: number) => void; onBack: () => void; onOpenLobby: () => void; onOpenShop: () => void; onOpenRecycle: () => void; justUnlocked?: boolean }

/** Mapa 2 — fases 9 a 16. Libera quando a fase 8 é concluída (progress.unlocked >= 9). */
export default function WorldMap2({ progress, onPlay, onBack, onOpenLobby, onOpenShop, onOpenRecycle, justUnlocked }: Props) {
  const slugOf = (id: string) => id.replace(/-\d+$/, '');
  const stars = NEW_ISLANDS.reduce((sum, it) => sum + (progress.stars[it.index] ?? 0), 0);
  const done = NEW_ISLANDS.filter((it) => (progress.stars[it.index] ?? 0) > 0).length;
  const next = Math.min(progress.unlocked, LEVEL_COUNT) - 1;
  const state = (index: number): 'done' | 'current' | 'open' | 'locked' => {
    if (index + 1 > progress.unlocked) return 'locked';
    if ((progress.stars[index] ?? 0) > 0) return 'done';
    return index === next ? 'current' : 'open';
  };
  const path = SPOTS.map(([x, y], i) => `${i ? 'L' : 'M'}${x * 10} ${y * 6}`).join(' ');
  // trecho já percorrido: do 1º nó até o último nó liberado
  const reached = Math.max(0, Math.min(SPOTS.length - 1, progress.unlocked - 9));
  const walked = SPOTS.slice(0, reached + 1).map(([x, y], i) => `${i ? 'L' : 'M'}${x * 10} ${y * 6}`).join(' ');

  return <main className={m.screen}>
    <header className={m.top}>
      <button type="button" className={m.back} onClick={onBack}>← Mapa 1</button>
      <div className={m.title}><span>MAPA 2 · FASES 9 A 16</span><h1>Ilhas do Amanhã</h1></div>
      <div className={m.stats}><span title="Fases concluídas">🏝 {done}/{NEW_ISLANDS.length}</span><span title="Estrelas">⭐ {stars}/{NEW_ISLANDS.length * 3}</span><span title="Moedas">🪙 {progress.coins.toLocaleString('pt-BR')}</span></div>
    </header>
    <nav className={m.nav} aria-label="Menu principal"><button onClick={onOpenLobby}>Lobby</button><button onClick={onOpenShop}>Loja</button><button onClick={onOpenRecycle}>Reciclagem</button></nav>
    {justUnlocked && <p className={m.banner} role="status">🎉 Mapa 2 desbloqueado! Oito novas fases esperam por você.</p>}

    <section className={m.board} aria-label="Mapa das fases 9 a 16">
      <svg className={m.trail} viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
        <path d={path} className={m.trailBase}/>
        <path d={walked} className={m.trailDone}/>
      </svg>
      {NEW_ISLANDS.map((it, k) => {
        const st = state(it.index); const [x, y] = SPOTS[k]!; const s = progress.stars[it.index] ?? 0; const locked = st === 'locked';
        return <button type="button" key={it.id} className={`${m.node} ${m[st]}`} style={{ ['--x' as string]: `${x}%`, ['--y' as string]: `${y}%`, ['--c' as string]: it.palette.accent }}
          disabled={locked} aria-label={`Fase ${it.index + 1}: ${it.name}${locked ? ' (bloqueada)' : s ? ` (concluída, ${s} estrelas)` : ''}`} onClick={() => onPlay(it.index)}>
          <span className={m.disc}>
            <img src={`/assets/islands/${slugOf(it.id)}/thumbnail.svg`} alt="" loading="lazy"/>
            <i className={m.num}>{it.index + 1}</i>
            {locked && <i className={m.lock} aria-hidden="true">🔒</i>}
            {st === 'done' && <i className={m.check} aria-hidden="true">✓</i>}
          </span>
          <b>{it.name}</b>
          <span className={m.starRow} aria-hidden="true">{[0, 1, 2].map((n) => <span key={n} className={n < s ? m.on : ''}>★</span>)}</span>
          {st === 'current' && <em className={m.tag}>PRÓXIMA</em>}
        </button>;
      })}
    </section>

    <footer className={m.foot}>
      <p>{progress.unlocked >= LEVEL_COUNT && done === NEW_ISLANDS.length ? 'Você restaurou todos os biomas. Parabéns, Guardião!' : 'Conclua cada ilha para liberar a próxima.'}</p>
      <button type="button" className={m.play} onClick={() => onPlay(next)}>▶ JOGAR FASE {next + 1}</button>
    </footer>
  </main>;
}
