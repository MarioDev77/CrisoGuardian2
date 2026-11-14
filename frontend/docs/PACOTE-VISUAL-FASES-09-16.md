# Pacote visual — CrisoGuardian 2 (fases 9–16)

## Diagnóstico do projeto
- As fases 9–16 já possuem cenários parallax próprios em `public/assets/islands/<bioma>/background/`, tiles próprios e decorações próprias.
- O renderizador do jogo seleciona as camadas por índice de fase (`islandLayers.get(levelIndex)`); as fases 9–16 usam índices 8–15. Os screenshots enviados mostram Manguezal Vivo e Geleira Azul, que já são cenários distintos.
- O problema visual confirmado na auditoria foi que os oito biomas compartilhavam o mesmo desenho de lixeira: os oito `bin.svg` tinham o mesmo tamanho e conteúdo. Além disso, o renderizador ainda usa o portal global de `public/assets/portal`, não um portal por bioma.
- As fases 9–16 herdam a configuração-base `forestConfig` para alguns parâmetros de nível, mas `islandLayouts.ts` contém layouts, tiles, decorações e listas de inimigos próprios para cada bioma.

## O que foi criado/alterado
1. Oito lixeiras temáticas exclusivas, em SVG editável e PNG com canal alfa, uma por bioma.
2. O catálogo `public/assets/phases/catalog.json` foi atualizado para carregar a lixeira PNG exclusiva de cada fase 9–16. As lixeiras já são usadas pelo carregador normal de assets do jogo.
3. Oito portais dimensionais temáticos em SVG e PNG transparente. São recursos prontos para integração; o código atual ainda desenha o portal global, portanto estes portais não foram conectados ao motor nesta entrega.
4. Spritesheets transparentes e seus JSONs de coordenadas:
   - `bins_09_16.png` — 8 lixeiras
   - `portals_09_16.png` — 8 portais
   - `animals_09_16.png` — 8 animais de bioma já existentes, rasterizados do SVG
   - `enemies_09_16.png` — 16 inimigos (andarilho e voador de cada bioma), rasterizados do SVG
   - `bosses_11_16.png` — conceitos de chefes para Vulcão Verde (fase 11) e Guardião do Planeta (fase 16)
5. Os PNGs individuais e os SVGs-fonte permanecem em cada pasta de bioma.

## Mapa de biomas
| Fase | Bioma | Lixeira | Portal |
|---|---|---|---|
| 9 | Manguezal Vivo | verde-raiz | folha |
| 10 | Geleira Azul | azul-gelo | floco |
| 11 | Vulcão Verde | rocha vulcânica | chama |
| 12 | Fábrica da Reciclagem | aço/amarelo | engrenagem |
| 13 | Floresta das Copas | verde-copa | folhas |
| 14 | Oceano Cristalino | azul-oceano | ondas |
| 15 | Cidade do Futuro | azul-tecnologia | energia |
| 16 | Guardião do Planeta | índigo/verde-luz | estrela |

## Transparência e uso
- Todos os PNGs novos usam RGBA com transparência real (não fundo quadriculado ou cor sólida).
- Os JSONs das spritesheets informam posição (`x`, `y`), tamanho (`w`, `h`) e nome de cada quadro.
- Use o SVG para alterar cores/formas; use o PNG individual ou a spritesheet no jogo.
- Os spritesheets têm espaçamento entre quadros. Recorte usando os retângulos do JSON, não uma grade presumida.

## Chefes
O jogo atualmente marca encontro de chefe nas fases 11 e 16. Foram criados dois conceitos de chefe em PNG/SVG transparente para esses encontros. Eles estão no spritesheet `bosses_11_16.png`, mas ainda precisam ser ligados aos estados/animações de chefe do motor; não substituí os sprites funcionais atuais para evitar quebrar hitboxes ou animações.

## Validação
- Verificado que os 8 novos PNGs de lixeira e os 8 PNGs de portal têm canal alfa.
- Verificado que as imagens de animais/inimigos derivam dos SVGs de cada bioma, com transparência.
- Não foi executada uma partida de navegador nesta sessão; a troca de lixeira é feita pelo catálogo existente, mas recomenda-se validar visualmente as fases 9–16 no navegador após substituir os arquivos no deploy.
