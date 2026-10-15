import styles from './Menus.module.css';
type Props={onResume:()=>void;onRestart:()=>void;onMenu:()=>void};
export function PauseMenu({onResume,onRestart,onMenu}:Props){return <div className={styles.overlay}><section className={styles.dialog}><h2>PAUSADO</h2><p>A floresta espera por você.</p><button onClick={onResume}>Continuar</button><button className={styles.secondary} onClick={onRestart}>Reiniciar fase</button><button className={styles.ghost} onClick={onMenu}>Menu principal</button></section></div>}
