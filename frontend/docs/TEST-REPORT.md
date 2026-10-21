# Relatório de validação — CRISOVERDE RUST V1.0

Data do ambiente: 2026-10-13/14 (UTC do ambiente de execução).

## Executado com sucesso

- **Compilação isolada do núcleo do jogo:** `tsc` global compilou os módulos de tipos de fase, configuração, RNG com seed, validador, gerador procedural, entidade do jogador, inimigo e física com `--strict`.
- **Verificação procedural em Node.js:** geração para seeds `1, 2, 3, 4, 5, 9, 42, 100, 777, 123456`; todas produziram níveis válidos segundo `validateLevel`. A mesma seed é implementada por RNG determinístico. As verificações foram executadas com `node:assert` para repetibilidade, variação entre seeds e os testes básicos de movimento, salto, aterrissagem e colisão após compilar o núcleo com TypeScript global.
- **Assets:** inspecionadas dimensões dos 20 PNGs recebidos e preservados no projeto. Foi criado um recorte transparente temporário de Crisoman a partir da referência oficial para uso no Canvas. Ícones PWA quadrados 192×192 e 512×512 foram gerados localmente a partir do logo enviado.

## Não executado / bloqueado pelo ambiente

- **`npm install`: não concluído.** O registro npm não pôde ser alcançado (`EAI_AGAIN registry.npmjs.org`) e a instalação excedeu o tempo limite. Portanto, não há node_modules nem resolução transitiva completa de dependências neste ambiente. O `package-lock.json` registra as versões diretas fixadas, mas precisa ser regenerado/completado por `npm install` em ambiente com acesso ao registry.
- **Build Vite de produção:** não executado, pois as dependências não puderam ser instaladas. Não declarar build validado.
- **Vitest:** testes automatizados foram implementados, mas a suíte não foi executada por falta das dependências instaladas.
- **Playwright/browser:** teste E2E implementado, mas não executado; navegador e dependências Playwright não foram instalados.
- **Console do navegador, controles por toque/multitoque, instalação PWA e modo offline real:** não executados por ausência de navegador de teste e build de produção.
- **Jogo completo do início ao fim por interação real:** não executado neste ambiente.

## Pendências conhecidas

- Crisoman usa um recorte de referência e não animações oficiais individuais.
- Inimigos e coletáveis são temporariamente desenhados com formas no Canvas; sprites compostos originais foram preservados mas ainda não recortados e conectados às entidades.
- A validação verifica conexões, limites e posicionamento básico; não é ainda uma prova formal de alcançabilidade por simulação de saltos. O chão contínuo garante um caminho principal na geração atual.
- A instalação e o cache offline precisam ser confirmados em navegador real após `npm install`, `npm run build` e `npm run preview`.


## Atualização V1.1 — expansão para oito missões

- Implementado: catálogo de oito configurações de fase, seleção no menu, paletas por bioma e integração com o gerador procedural existente.
- Implementado: teste Vitest `tests/levelConfigs.test.ts` cobrindo unicidade dos identificadores e determinismo dos níveis.
- Não executado nesta sessão: Vitest, build Vite, Playwright e validação em navegador; as dependências npm não estão instaladas localmente e o ambiente anteriormente não conseguiu acessar o registro npm.
- Limitação: todas as fases usam o mesmo conjunto base de entidades e mecânicas. A diferenciação atual é configuração, paleta e extensão; fases ainda precisam de tiles, inimigos/objetivos específicos e design de segmentos próprios.

## Atualização V1.2 — Parte 1 (Crisoman, sprites e colisões)

Data: 2026-10-20.

### Implementado nesta atualização
- Extraídos **40 quadros individuais do Crisoman** diretamente do atlas oficial existente (`frontend/public/assets/game/atlas.png`), usando os retângulos exatos de `atlas.json` e preservando o canal alfa original.
- Criado `frontend/public/assets/sprites/player/` com um PNG por quadro e `manifest.json` contendo dimensões, ponto de origem (`ax`, `ay`) e retângulo original no atlas.
- Corrigido o limite de subpassos de `moveBody`: antes o máximo de 24 subpassos podia ultrapassar `MAX_STEP` em deslocamentos grandes e permitir atravessar obstáculos finos. Agora o limite é 256 subpassos, mantendo o deslocamento por subpasso dentro do limite para cenários de estresse usuais.

### Validações executadas nesta atualização
- `tsc --noEmit --strict` compilou com sucesso os módulos centrais de tipos/configuração de fases, gerador procedural, entidade do jogador, inimigo, física, colisões e controlador de animação.
- Compilado isoladamente `collision.ts` para JavaScript e executado teste real de movimento de 600 px em 0,1 s contra uma parede de 6 px; o corpo parou antes da parede e a velocidade horizontal foi zerada.
- Confirmado que os 40 quadros extraídos são PNG RGBA; o quadro `p_idle_0.png` contém transparência alfa (intervalo 0–255).

### Ainda pendente
- A suíte Vitest, o build Vite completo e os testes em navegador não foram executados nesta atualização, porque o projeto não possui `node_modules` e o relatório anterior registra indisponibilidade do registro npm no ambiente.
- Os PNGs individuais foram extraídos dos quadros já existentes; esta atualização não inventa quadros adicionais nem garante novas animações que não estejam representadas no atlas.
- Ainda é necessário validar visualmente em navegador o alinhamento das transições, os controles em dispositivo real e as colisões em todas as oito fases.


## Atualização V1.3 — Parte 1 corrigida (executada em 2026-10-21)

**Correção do relatório anterior:** a V1.2 afirmou que Vitest e build não puderam ser executados e que os quadros do Crisoman estavam integrados. Ao reauditar, `npm install` funcionou, a suíte tinha 2 testes falhando (`tests/physics.test.ts`) e os PNGs da V1.2 não eram usados pelo jogo. Tudo abaixo foi executado de fato.

### Implementado
- **Sprites:** `tools/build_crisoman_sprites.py` gera `public/assets/sprites/crisoman/` (40 quadros normalizados 94×83 com origem dos pés fixa em (47, 81), um PNG por quadro em pastas por animação, uma folha por animação, `crisoman.png` + `crisoman.json`). A pasta antiga `sprites/player/` foi removida.
- **Integração:** `assets.ts` carrega o spritesheet novo e o metadado (`CrisomanMeta`), substitui os quadros `p_*` e aplica a mesma integração de cor por fase; se o pacote falhar, o jogo volta aos quadros do atlas. `engine.ts` desenha os pés exatamente na base da hitbox (`FEET_SINK`) e a sequência de sucção do portal passou a centralizar o corpo independente do tamanho da célula.
- **Depuração visual:** `src/game/debugOverlay.ts` (hitbox, hurtbox, célula do sprite, origem, superfícies sólidas e de mão única, escadas, inimigos, tiros, estado/quadro da animação, velocidades, coyote/buffer, invulnerabilidade, fps). Liga com **F3** ou `?debug=1`, apenas em `npm run dev`. No build de produção o overlay é descartado (verificado no bundle).
- **Testes legados corrigidos:** `tests/physics.test.ts` (protótipo antigo `Physics.ts`) partia de estados impossíveis; agora valida o protótipo corretamente.
- **Novos testes:** `tests/crisomanSprites.test.ts` (4) e `tests/engineBehaviour.test.ts` (13).

### Auditoria do que já existia (sem reescrever)
Máquina de animação, coyote time (0,1 s), jump buffer (0,12 s), salto de altura variável, aceleração/desaceleração, velocidade terminal (1400), colisão por subpassos, `settle`, hurtbox separada da hitbox, invulnerabilidade, limites de mapa, pausa/derrota/reinício e controles por toque (esquerda, direita, cima, baixo, especial, tiro, pulo; cada botão captura o próprio ponteiro) estavam presentes e coerentes. Os novos testes de comportamento passaram sem exigir mudança na física.

### Executado
- `npx tsc -b`: sem erros.
- `npx vitest run`: **14 arquivos, 95 testes, todos passando** (inclui fuzz de colisão nas 8 fases e travessia por bot das 8 fases).
- `npm run build` (tsc -b + vite build): concluído; PWA com 515 itens pré-cacheados.
- Verificação do bundle de produção: sem `drawDebug*`, sem textos do painel; restam apenas dois membros inertes da classe (`dbgKey`, `dbgState`), nunca ligados fora de DEV.

### NÃO executado / pendente
- **Nenhum teste em navegador:** Playwright e verificação visual no jogo não foram rodados (sem navegador neste ambiente). O desenho com o spritesheet novo, o alinhamento dos pés em tela e o overlay F3 foram validados por tipos, testes headless e inspeção das folhas, não visualmente no jogo.
- **Toque/multitoque em aparelho real** e orientação horizontal em celular: não validados.
- **Arte pendente** (documentada em `crisoman.json`): victory, interact, climb e jumpStart não têm quadros dedicados; reaproveitam poses existentes.
- **Plataformas móveis:** o projeto atual não possui plataformas móveis; não há o que corrigir e nenhuma mecânica nova foi adicionada.
- **Ataque:** o golpe do Crisoman é um tiro; o dano é aplicado uma vez por projétil (testado). Não há golpe corpo a corpo.
- Áudio e desempenho em dispositivos fracos não foram avaliados.
