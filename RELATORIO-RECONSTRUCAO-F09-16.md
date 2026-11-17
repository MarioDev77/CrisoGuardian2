# Relatório de reconstrução visual e integração — fases 09 a 16

## Escopo entregue nesta revisão

A revisão amplia o projeto original e mantém as fases 01–08 intactas. As oito fases novas continuam usando a arquitetura de quatro camadas de cenário já prevista pelo motor (`sky`, `far`, `mid`, `near`), com parallax e repetição horizontal.

### 1. Criaturas e sprites

- Curadoria de criaturas transparentes do pacote `crisoverde_assets_pack.zip`, com seleção temática por bioma.
- 42 quadros RGBA distribuídos entre os oito biomas, nas categorias `walker` e `flyer`.
- Os inimigos das fases 09–16 passaram a usar sequências de quadros próprias, em vez de uma única ilustração estática por tipo.
- As sequências são registradas em `entities.ts` e carregadas pelo motor a partir dos manifests por fase.
- Os PNGs individuais foram preservados para fallback, inspeção e edição.

### 2. Fundos

Cada fase possui quatro imagens independentes em `public/assets/islands/<bioma>/background/`:

- `sky`: céu/base distante;
- `far`: cenário distante;
- `mid`: cenário intermediário;
- `near`: elementos próximos.

O motor desenha as camadas com velocidades de parallax diferentes. Os caminhos foram verificados no catálogo `assets/islands/catalog.json`.

### 3. Objetos e obstáculos

- 40 elementos ambientais adicionais foram selecionados do pacote enviado, recortados individualmente em PNG RGBA e distribuídos pelos oito biomas.
- Os objetos são registrados em `assets/phases/catalog.json` e posicionados nas cinco partes de cada mapa em `levels/islandLayouts.ts`.
- Cada bioma tem um atlas de objetos (`phase_props_sheet.png`) e manifesto com as coordenadas dos quadros, além dos PNGs independentes.
- Os obstáculos que causam dano continuam usando o sistema de colisão do jogo, com posicionamento por fase em `level.ts`. A distribuição evita início, portal, chefe, lixeiras e caixas.

### 4. Spritesheets

Em `public/assets/islands/creatures/` há oito spritesheets transparentes, uma por fase (`phase_09.png` a `phase_16.png`), com manifestos JSON que registram os quadros de caminhada e voo. O carregador recorta os quadros desses atlases e os registra no sistema de tiles do jogo.

Cada bioma também possui um spritesheet de objetos ambientais com manifesto próprio em `deco/pack/`.

### 5. Integração no jogo

- Os novos quadros de criaturas são carregados em `Assets.loadAnimals()` e usados pelos perfis de inimigos em `entities.ts`.
- Os novos objetos são carregados pelo catálogo de fases e referenciados diretamente nos mapas.
- Os cenários de quatro camadas, lixeiras, portais, chefes específicos, plataformas e obstáculos continuam integrados ao motor existente.
- A fase 16 mantém o chefe final animado do jogo; o sprite estático do santuário não substitui essa animação.

## Verificações realizadas nesta revisão

- 8 manifestos de criaturas e 8 spritesheets de fase presentes.
- 42 quadros de criatura referenciados nos manifestos e nas listas de animação.
- 40 novos objetos ambientais presentes no catálogo e referenciados nos mapas.
- 250 entradas no catálogo de sprites de fase; nenhum caminho de arquivo ausente.
- 454 referências de tiles nos mapas das fases 09–16; nenhuma referência sem catálogo.
- Todos os retângulos de recorte dos spritesheets estão dentro dos limites das imagens.
- Sintaxe TypeScript dos arquivos alterados verificada por transpilation.

## Limitação de validação

A instalação das dependências (`npm ci`) excedeu o tempo disponível neste ambiente e deixou o diretório `node_modules` incompleto. Por isso, o build completo do Vite/TypeScript e a suíte Vitest não puderam ser executados nesta revisão. Não se declara aprovação de build nem de testes automatizados. O projeto deve ser validado com `npm ci`, `npm run build` e `npm test` em um ambiente com acesso ao registry npm antes de publicar.

## Origem da arte

Os novos atlases e recortes foram montados a partir dos PNGs transparentes fornecidos no pacote `crisoverde_assets_pack.zip`. Eles foram selecionados, recortados, organizados em spritesheets e conectados ao motor; não são ilustrações inéditas desenhadas do zero por IA.
