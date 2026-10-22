# CrisoGuardian — Protegendo o amanhã (v2)

Fluxo: **Tela de título → Mapa de fases → Fase → Resultado → Mapa**.

## Tela de título
- Arte em `public/assets/title/crisoguardian-title.webp`; os botões (Jogar, Configurações, Tutoriais, Sair) são áreas clicáveis posicionadas sobre os botões pintados — ajuste as coordenadas em `src/components/TitleScreen.tsx` (constante `BTN`, em pixels da imagem 1536x1024).
- `Enter` inicia o jogo. Configurações e Tutoriais abrem janelas (`src/components/Dialogs.tsx`, as mesmas do mapa). Sair pede confirmação; como o navegador não deixa fechar abas abertas pelo usuário, mostra uma tela de despedida.
- O selo CrisoGuardian no canto do mapa (`.brand` em `WorldMap.tsx`) cobre o logo antigo que está pintado em `public/assets/map/mapa.png`.

## Como rodar
```bash
npm install
npm run dev      # desenvolvimento
npm run build    # produção (pasta dist/)
npm test         # testes (inclui um bot que joga as 8 fases)
```

## Controles
Padrão: ← → / A D mover · Espaço ou Z pular · J ou X atirar · K ou C ataque especial · ↑ ↓ escadas · P ou Esc pausar. No celular há botões na tela. **Todas as teclas (exceto Esc) podem ser trocadas em Configurações → Controles.**

## Configurações
Abrem na tela de título (botão), no mapa (engrenagem) e no menu de pausa durante a fase. Tudo vale na hora e fica salvo no aparelho (`localStorage`, chave `crisoguardian-settings-v1`).
- **Jogo:** dificuldade (Fácil 6 ♥ / Normal 5 ♥ / Difícil 3 ♥ — também muda vida e velocidade dos inimigos, vida do chefe, recarga do especial e tempo de invulnerabilidade; vale ao reiniciar a fase), tiro automático, animação de abertura, pausar ao sair da aba. Em partida: **Reiniciar fase** e **Voltar ao mapa**.
- **Áudio:** som ligado/mudo, volume geral, música e efeitos. Tudo é sintetizado por Web Audio (`src/game/audio.ts`), sem arquivos de som.
- **Controles:** remapear teclas (principal + alternativa por ação; trocar tecla já usada faz as ações trocarem entre si), restaurar padrão, botões de toque (Auto/Sempre/Nunca) e tamanho (P/M/G).
- **Tela:** qualidade gráfica (resolução do canvas), tela cheia, tremor de tela, luz e vinheta, contador de FPS.
- **Restaurar padrões** zera só as configurações (não mexe no progresso).

Código: `src/app/settings.ts` (estado, validação, teclas), `src/hooks/useSettings.ts`, `src/game/audio.ts`, `src/components/Dialogs.tsx` (janela), integração em `src/game/engine.ts` e `src/components/GameView.tsx`.

## O que mudou
- As 8 fases usam **como fundo a cena do sprite oficial** de cada fase; as plataformas, pontes, caixas, lixeiras e moedas são as **peças da faixa de objetos do mesmo sprite**, posicionadas sobre o desenho.
- Personagem, ratos, barata, mosca, aranha, nuvem tóxica, Monstro do Lixão, coletáveis e power-ups usam os quadros dos sprites enviados (`public/assets/game/atlas.png`).
- Mapa (`public/assets/map/mapa.png`) com progresso salvo, fases bloqueadas e estrelas. Engrenagem: liberar todas as fases / apagar progresso.
- Cada fase tem layout próprio (rio com plataformas flutuantes, pontes e torres na montanha, doca na praia, cânions no deserto, etc.).

## Estrutura
- `src/game/levels/layouts.ts` — layout de cada fase (coordenadas da cena do sprite).
- `src/game/level.ts` — monta o mundo, espelha as telas e distribui inimigos/itens.
- `src/game/engine.ts` — física, IA, chefe, render e HUD.
- `src/components/` — tela inicial, mapa, tela de jogo.
