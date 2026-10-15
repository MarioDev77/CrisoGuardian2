import { useEffect, useState } from 'react';
import { audio } from '../game/audio';
import TitleScreen from '../components/TitleScreen';
import WorldMap from '../components/WorldMap';
import GameView from '../components/GameView';
import { enterGameMode } from './pwa';
import { completeLevel, loadProgress, saveProgress, type Progress } from './progress';

type Screen = { name: 'title' } | { name: 'map' } | { name: 'play'; level: number };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const update = (p: Progress) => { setProgress(p); saveProgress(p); };
  // o navegador só libera o som depois de um toque/tecla do jogador
  useEffect(() => {
    const go = () => audio.unlock();
    window.addEventListener('pointerdown', go); window.addEventListener('keydown', go);
    return () => { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go); };
  }, []);
  // trilha: calma nos menus, uma por fase durante o jogo
  const track = screen.name === 'play' ? screen.level : 'menu';
  useEffect(() => { audio.setTrack(track); }, [track]);
  // o toque em JOGAR / numa fase é o gesto que o navegador exige para liberar tela cheia e travar na horizontal
  if (screen.name === 'title') return <TitleScreen onPlay={() => { void enterGameMode(); setScreen({ name: 'map' }); }} />;
  if (screen.name === 'map') return <WorldMap progress={progress} onPlay={(level) => { void enterGameMode(); setScreen({ name: 'play', level }); }} onBack={() => setScreen({ name: 'title' })} />;
  return (
    <GameView key={screen.level} level={screen.level} onExit={() => setScreen({ name: 'map' })}
      onWin={(level, r, stars) => update(completeLevel(progress, level, stars, r.coins, r.score))}
      onNext={(level) => setScreen({ name: 'play', level })} />
  );
}
