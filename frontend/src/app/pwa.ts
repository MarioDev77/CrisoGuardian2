/** Instalação do jogo (atalho na tela inicial) e modo "jogo": tela cheia + horizontal. */

interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

// o navegador dispara este evento cedo: guardamos para o botão "Instalar" usar quando o jogador tocar
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallEvent; emit(); });
  window.addEventListener('appinstalled', () => { deferred = null; emit(); });
}

export const subscribeInstall = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export const canPromptInstall = () => deferred !== null;

/** Já está rodando como app instalado (sem barra do navegador)? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.matchMedia?.('(display-mode: standalone), (display-mode: fullscreen)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Abre o diálogo nativo de instalação (Android/Chrome/Edge/desktop). */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  const ev = deferred; deferred = null; emit();
  try { await ev.prompt(); return (await ev.userChoice).outcome; } catch { return 'dismissed'; }
}

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
type Lockable = ScreenOrientation & { lock?: (o: string) => Promise<void> };

export const fullscreenSupported = () => !!(document.fullscreenEnabled || (document as FsDoc).webkitExitFullscreen);
export const inFullscreen = () => !!(document.fullscreenElement || (document as FsDoc).webkitFullscreenElement);

/**
 * Chamar DENTRO de um toque/clique do jogador (os navegadores exigem): entra em tela cheia e trava na horizontal.
 * No Android (Chrome) trava de verdade; no iPhone/Safari não existe tela cheia nem trava — lá o jeito é instalar o atalho.
 */
export async function enterGameMode(): Promise<void> {
  try {
    if (!inFullscreen() && !isStandalone()) {
      const el = document.documentElement as FsEl;
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    }
  } catch { /* o navegador pode negar: segue o jogo normalmente */ }
  try { await (screen.orientation as Lockable | undefined)?.lock?.('landscape'); } catch { /* sem suporte (iOS, desktop) */ }
}

export async function toggleFullscreen(): Promise<void> {
  try {
    if (inFullscreen()) { if (document.exitFullscreen) await document.exitFullscreen(); else await (document as FsDoc).webkitExitFullscreen?.(); }
    else await enterGameMode();
  } catch { /* ignore */ }
}
