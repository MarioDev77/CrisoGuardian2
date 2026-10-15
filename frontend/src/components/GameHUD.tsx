import type { GameSnapshot } from '../game/GameCanvas';
import styles from './Menus.module.css';
type Props={game:GameSnapshot;onPause:()=>void};
export function GameHUD({game,onPause}:Props){return <div className={styles.hud}><div className={styles.stat}><span>VIDA</span><strong>{'♥ '.repeat(Math.max(0,game.hp))}{'♡ '.repeat(Math.max(0,3-game.hp))}</strong></div><div className={styles.stat}><span>RESÍDUOS</span><strong>{game.materials} / {game.total}</strong></div><div className={styles.stat}><span>PONTOS</span><strong>{game.score}</strong></div><button className={styles.pauseButton} onClick={onPause} aria-label="Pausar jogo">Ⅱ</button></div>}
