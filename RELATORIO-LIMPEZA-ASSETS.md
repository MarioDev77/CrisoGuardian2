# Relatório — limpeza de assets

public/assets: 808 -> 352 arquivos (todos referenciados pelo jogo).

Removidos:
- ~175 arquivos nunca carregados (sheets antigas, SVGs substituídos por PNG, islands/spritesheets, previews, logo antigo).
- 112 quadros individuais de heróis/chefe (idênticos pixel a pixel às spritesheets).
- sprites/crisoman (conjunto antigo, não carregado).
- 98 entradas do catálogo phases/catalog.json que o código nunca desenha (308 -> 210) e seus arquivos.
- 22 duplicatas byte a byte (catálogos repontados).
- src/app/write-test.tmp.

Mantidos por exigência de testes: sprites/actors/actors.json e as entradas pNN_prop (fases 9–16).
Testes ajustados: islands, characterSprites, newHeroSprites, bossGrandeLixo, visualOverhaul, crisomanSprites.
Verificado: vitest 35 arquivos / 301 testes ok; npm run build ok; os 352 assets respondem 200 no vite preview.
Não verificado: navegador real e Playwright.
Não alterado: tools/, docs/, _auditoria/, código morto.
Arte ainda genérica (em uso): inimigos 9–16 (SVG por código) e pets dentro do jogo (actors.svg).
