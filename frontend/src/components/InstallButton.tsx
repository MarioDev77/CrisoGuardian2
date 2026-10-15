import { useEffect, useState } from 'react';
import { canPromptInstall, isIOS, isStandalone, promptInstall, subscribeInstall } from '../app/pwa';
import { Modal } from './Dialogs';
import s from './Screens.module.css';

/** Botão "Instalar jogo": Android/Chrome abre o diálogo nativo; iPhone e demais navegadores mostram o passo a passo. */
export default function InstallButton() {
  const [, tick] = useState(0);
  const [help, setHelp] = useState(false);
  useEffect(() => subscribeInstall(() => tick((n) => n + 1)), []);
  if (isStandalone()) return null; // já instalado: abriu pelo atalho
  const ios = isIOS();
  const click = async () => { if (canPromptInstall()) { await promptInstall(); } else setHelp(true); };
  return (
    <>
      <button type="button" className={s.installBtn} onClick={click} aria-label={ios ? 'Adicionar à tela inicial' : 'Instalar o jogo'}>
        <span aria-hidden="true">📲</span> {ios ? 'Adicionar à tela inicial' : 'Instalar jogo'}
      </button>
      {help && (
        <Modal label="Instalar o jogo" onClose={() => setHelp(false)} wide>
          <h2>Jogar em tela cheia</h2>
          <div className={s.tut}>
            {ios ? (
              <section>
                <h3>No iPhone / iPad <small>(use o Safari)</small></h3>
                <ul>
                  <li>Toque no botão <b>Compartilhar</b> (o quadrado com a seta para cima ⬆️), na barra do Safari.</li>
                  <li>Role a lista e toque em <b>Adicionar à Tela de Início</b>.</li>
                  <li>Toque em <b>Adicionar</b>. O ícone do CrisoGuardian aparece na tela inicial.</li>
                  <li>Abra pelo ícone: o jogo ocupa a tela inteira, sem a barra do navegador.</li>
                </ul>
              </section>
            ) : (
              <>
                <section>
                  <h3>No Android <small>(Chrome)</small></h3>
                  <ul>
                    <li>Toque no menu <b>⋮</b> (canto superior direito).</li>
                    <li>Toque em <b>Instalar app</b> (ou <b>Adicionar à tela inicial</b>).</li>
                    <li>Confirme. O ícone do CrisoGuardian aparece na tela inicial e abre em tela cheia, na horizontal.</li>
                  </ul>
                </section>
                <section>
                  <h3>No computador <small>(Chrome ou Edge)</small></h3>
                  <ul><li>Clique no ícone de instalar <b>⊕</b> na barra de endereço, ao lado das estrelinhas.</li></ul>
                </section>
              </>
            )}
          </div>
          <button type="button" onClick={() => setHelp(false)} autoFocus>Entendi</button>
        </Modal>
      )}
    </>
  );
}
