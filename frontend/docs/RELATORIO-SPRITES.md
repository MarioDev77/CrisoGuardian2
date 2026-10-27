# Relatório — auditoria e integração de sprites (CrisoGuardian 2)

## Auditoria
- Motor ativo: `src/game/engine.ts` + `assets.ts` (atlas `public/assets/game/atlas.png/json`, 103 quadros) + `playerAnim.ts` (máquina de estados do herói).
- Código antigo sem uso pela interface: `GameCanvas.ts`, `Physics.ts`, `entities/Player.ts`, `hooks/useGame.ts`.
- Crisoman: `public/assets/sprites/crisoman/` (40 quadros 94×83, pés em 47,81). Pendências de arte já documentadas no README dessa pasta.

## Alterações
| Arquivo | Mudança |
|---|---|
| `src/game/engine.ts` | Corrigido comentário que engolia o desvanecer de morte dos inimigos; overlay de depuração ligado (somente `import.meta.env.DEV`, F3 / `?debug=1`) |
| `public/assets/game/atlas.png` | Removidos 7 resíduos de borda (original em `tools/backup/atlas.before-edge-fix.png`) |
| `tests/physics.test.ts` | Valores atualizados para a altura atual do herói |
| NOVO `tools/fix_atlas_edges.py` | Limpeza idempotente de resíduos de borda (`--check` só lista) |
| NOVO `tools/build_actor_meta.py` | Gera `public/assets/sprites/actors/actors.json` a partir do atlas e do código |
| NOVO `public/assets/sprites/actors/actors.json` | Animações de 8 inimigos, chefe (10 estados) e 3 efeitos; retângulos/pivôs exatos |
| NOVO `tests/actorsMeta.test.ts` | 7 testes: JSON × atlas × `ENEMIES` × engine |
| NOVO `sprite-viewer.html` | Visualizador DEV (`npm run dev` → `/sprite-viewer.html`); não entra no build |

## Testes (executados)
- `npx vitest run`: 19 arquivos, 160 testes passando. `npx tsc -b` e `npm run build` sem erros.
- Navegador (Chromium headless, fase 1): correr, pular, cair, atirar e especial com a sequência de estados esperada, sem erros de console.
- Registro histórico: houve uma falha isolada em `collisionFuzz` (fase 8); investigação e reprodução descritas na seção de continuação abaixo.

## Pendências
- Arte nova do Crisoman (agachar, rolar, ataque forte, combo, knockback, cura, vitória, escalada, interação, transições): não criada; as pranchas de referência têm resolução baixa demais para recorte.
- Inimigos sem quadros de dano próprios (usam brilho/squash por código); chefe com 1 pose por estado; sem sprites de poeira, coleta e cura.
- Hurt/morte do herói, inimigos e chefe não foram exercitados no navegador (só testes automatizados).
- `tests/e2e/game.spec.ts` foi atualizado nesta continuação para a interface vigente; veja o escopo E2E abaixo.

## Como adicionar novas animações
1. Coloque os quadros novos no atlas (ou numa folha própria) com nomes `prefixo_N`.
2. Registre os retângulos em `atlas.json` e rode `python3 tools/fix_atlas_edges.py --check`.
3. Inimigos: acrescente os quadros em `ENEMIES` (`entities.ts`) e use-os em `enemyFrame` (`engine.ts`); rode `python3 tools/build_actor_meta.py`.
4. Herói: mapeie o estado em `playerAnim.ts` (`frame()`), regenere `crisoman.json` com `tools/build_crisoman_sprites.py` e ajuste `tests/crisomanSprites.test.ts`.
5. Confira no `sprite-viewer.html` e rode `npx vitest run`.


## Continuação — 26/10/2026

### Alterações feitas
- Atualizado `tests/e2e/game.spec.ts` para o fluxo real: título → mapa → fase 1; controles de movimento/pulo/tiro/especial, pausa/retomada, reinício e retorno ao mapa.
- Declarado `@playwright/test` em `devDependencies` e adicionado `npm run test:e2e`.
- `sprite-viewer.html` agora oferece fundo xadrez, claro ou escuro e exibe o status/nota da animação para distinguir estados originais, compartilhados, emprestados e poses únicas cadastradas.
- `tests/collisionFuzz.test.ts` agora controla também `Math.random()` do motor pela seed do caso. O gerador aleatório do teste já era seeded, mas a inicialização e a IA de inimigos/chefe ainda usavam o RNG global não controlado.

### Investigação de collisionFuzz — fase 8
A linha de base (antes das mudanças) passou: 19 arquivos, 160 testes. Em três execuções isoladas seguintes, as duas primeiras passaram e a terceira falhou somente em `expect(wins).toBeGreaterThan(0)`: nenhuma das seis sequências aleatórias concluiu a fase. A asserção de vitória era parte do teste de colisão, embora o resultado dependa de entradas aleatórias e da IA com `Math.random()` sem seed.

Fixei a fonte aleatória interna do motor a partir da seed da simulação, preservando os limites e as verificações de colisão existentes. A fase 8 e as demais passaram no fuzz determinístico; a suíte final passou 160/160. Não há evidência reproduzida de defeito físico. A falha observada foi uma condição de vitória não determinística, não uma violação demonstrada de colisão.

### Verificações desta continuação
- `npm ci`: concluído a partir do lockfile; npm reportou 6 vulnerabilidades nas dependências instaladas (1 baixa, 2 moderadas, 1 alta, 2 críticas).
- Linha de base: `npm test` — 19 arquivos / 160 testes passando; `npm run build` — passou.
- Fuzz isolado: 2 execuções passaram e 1 falhou antes da correção de seed; após seedear o RNG do motor, o fuzz de 8 fases passou.
- Verificação final: `npm test` — 19 arquivos / 160 testes passando; `npm run build` — passou; `npm run test:e2e` — 2 cenários passaram no Chromium.
- O visualizador continua fora do build de produção: `dist/sprite-viewer.html` não é gerado.

### Arquivos alterados nesta continuação
- `frontend/package.json`, `frontend/package-lock.json`
- `frontend/tests/e2e/game.spec.ts`
- `frontend/tests/collisionFuzz.test.ts`
- `frontend/sprite-viewer.html`
- `frontend/docs/RELATORIO-SPRITES.md`

### Arte concluída e pendências explícitas
O ZIP de referência adicional declara no próprio README que suas imagens são pranchas compostas, sem recortes individuais com transparência confiável; por isso não foram tratadas como spritesheets de produção nem copiadas como animação pronta.

Estados com quadros próprios já cadastrados: idle, walk, run, subida/ápice do salto, queda, aterrissagem, tiro (preparação/ação/recuperação), dano, morte e especial. Estados emprestados que continuam pendentes: início do salto (pose compartilhada), vitória (poses de salto), interação (recarga) e escalada (caminhada). Agachar, rolamento, ataque forte, combo, knockback com recuperação, cura e animação dedicada de transições seguem sem arte própria; não foram inventados controles ou mecânicas para preencher essas lacunas.

Inimigos e chefe mantêm o comportamento atual. Os metadados existentes descrevem limitações de poses, particularmente quadros únicos em vários estados do chefe e ausência de animações de dano dedicadas em alguns inimigos. E2E exercita a fase 1 e os controles/UI; não simula dano/morte, luta de chefe nem todas as oito fases no navegador. A suíte unitária existente cobre IA e motor de inimigos/chefe, mas isso não substitui validação visual dessas situações reais.


## Melhorias de experiência para o site — 26/10/2026

### Implementado
- Primeira visita: ao escolher Jogar, a pessoa vê o tutorial de controles e objetivo com opções explícitas para começar ou pular. A escolha fica salva no navegador; partidas seguintes vão direto ao mapa.
- Diálogos: foco do teclado entra na janela, fica preso nela durante Tab/Shift+Tab, Esc fecha e o foco retorna ao controle que abriu o diálogo.
- Acessibilidade no jogo: Canvas identificado com fase/objetivo; região `aria-live` anuncia mensagens existentes de dano, cura, itens, checkpoints, especiais e eventos importantes. Controles de toque receberam nomes acessíveis.
- Opções visuais: respeitada a preferência de alto contraste do sistema; a opção de reduzir tremor já respeitava movimento reduzido e continua disponível.
- Celular: testes de navegador cobrem a orientação retrato e paisagem, aviso para girar e os botões de toque.
- Progresso: conferi a gravação de fase, estrelas e moedas; continua persistida no `localStorage` atual.
- Relatório e suite: teste de primeira visita e pular tutorial; teste de foco circular; E2E de tutorial/fluxo, teclado/pausa/reinício, orientação e controles de toque e início da fase 8.

### Verificação final
- `npm test`: 19 arquivos e 162 testes passaram, incluindo fuzz das 8 fases.
- `npm run build`: passou; 49 módulos transformados; visualizador DEV ausente do build.
- `npm run test:e2e`: 4 cenários passaram no Chromium.
- Fase 8: E2E confirma carregamento, movimento, habilidade e continuidade do jogo. O percurso automatizado não chegou com confiabilidade ao chefe; não afirmo validação browser do encontro com o chefe.

### Pendências
- Arte própria das animações ainda pendentes (agachar, rolamento, ataque forte, combo, knockback, cura, vitória, escalada, transições, entre outras). As pranchas do pacote de referência não são recortes de produção com transparência confiável. Nenhum quadro genérico foi incorporado.
- Falta validar combate até o chefe no navegador e exercitar dano/derrota em uma partida E2E dedicada; IA e luta do chefe continuam cobertas pelos testes do motor.
- Teste em dispositivos físicos e com usuários, leitores de tela e navegadores mobile ainda é recomendado; Chromium emulado valida os layouts, mas não substitui essa revisão.
- Geração de arte raster por ferramenta integrada não estava disponível nesta sessão. A rota alternativa de geração por API exige chave de API e escolha explícita do usuário.

### Arquivos tocados nesta etapa
- `src/components/TitleScreen.tsx`, `src/components/Dialogs.tsx`, `src/components/GameView.tsx`, `src/components/Screens.module.css`, `src/game/engine.ts`
- `tests/title.test.tsx`, `tests/settingsUi.test.tsx`, `tests/e2e/game.spec.ts`, `tests/collisionFuzz.test.ts`
- `docs/RELATORIO-SPRITES.md`
