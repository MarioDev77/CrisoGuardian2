# Revisão de assets — fases 09 a 16

## O que foi verificado
- Os 8 mapas (Manguezal, Geleira, Vulcão, Fábrica, Copas, Oceano, Cidade do Futuro e Guardião) usam `parts` próprios, com terreno e decoração por trecho.
- Foram verificados 170 registros do catálogo de assets das fases 09–16.
- Todos os caminhos de imagem desses registros existem no projeto.
- Todas as 139 chaves de sprite referenciadas pelos layouts das fases 09–16 existem no catálogo.
- As lixeiras específicas das oito fases existem; foi adicionado fallback para a lixeira verde da fase 01 (ou fase 02) caso algum arquivo de lixeira falhe ao carregar.
- Também foi adicionado fallback para terreno, plataformas, pontes e caixas caso um arquivo de terreno de uma ilha falhe ao carregar.

## Arquivos adicionados
- `public/assets/sprites/imported-crisoverde-pack/`: sprites PNG do pacote `crisoverde_assets_pack.zip`, separados em `ambiente/` e `criaturas/`, com `manifest.json`.
- `public/assets/portal/phase-portals-pack/`: portais originais e quadros individuais do pacote `CrisoGuardian_Portais_Alpha_Pro.zip`.

## Observação importante
Os sprites numerados do pacote geral foram preservados integralmente e organizados no projeto. Como o pacote não traz um mapa semântico que relacione cada `sprite_###.png` a uma fase/objeto, eles não foram distribuídos aleatoriamente nos mapas — isso poderia colocar ícones, itens ou criaturas no lugar de terreno e prejudicar a jogabilidade. Os sprites que já estão associados aos mapas 09–16 continuam com seus nomes e referências originais.

## Alteração de carregamento
`frontend/src/game/assets.ts` agora aplica fallback para as lixeiras e peças de terreno das fases 09–16 quando algum arquivo não carregar.
