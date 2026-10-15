# Assets das 8 fases — relatório de integração

Gerado por `tools/build_phase_assets.py` a partir de `CrisoVerde_Sprites_PNG_Transparentes_Recortados.zip`.

## O que está ligado ao jogo

- **Terreno (chão, plataformas, pontes)**: tiles `pNN_ground`, `pNN_ledge`, `pNN_bridge`, desenhados por `Engine.band()` (borda esquerda + miolo repetido em espelho + borda direita).
- **Caixas, lixeiras, decoração** (cone, cacto, boia) das fases em que o pacote trouxe a peça.
- Moedas, resíduos, inimigos, escadas e HUD continuam vindo do atlas original (têm quadros de animação; os recortes do pacote são estáticos e vários estão quebrados). Estão catalogados para uso futuro.

## Sprites por fase (arquivo de origem → papel)

### Fase 1 — Floresta Viva
- `p01_ground` (terrain) ← fase_01_floresta_viva/platform_long.png
- `p01_ledge` (terrain) ← fase_01_floresta_viva/platform_medium.png
- `p01_bridge` (terrain) ← fase_01_floresta_viva/ladder.png
- `p01_block` (terrain) ← fase_01_floresta_viva/wooden_bridge.png
- `p01_wall` (terrain) ← fase_01_floresta_viva/stone_wall.png #1
- `p01_crate` (props) ← fase_01_floresta_viva/barrel.png
- `p01_barrel` (props) ← fase_01_floresta_viva/metal_pipe.png
- `p01_ladder` (props) ← fase_01_floresta_viva/crate.png
- `p01_pipe` (props) ← fase_01_floresta_viva/stone_wall.png #0
- `p01_bin` (props) ← fase_01_floresta_viva/recycle_bin.png
- `p01_coin` (collectibles) ← fase_01_floresta_viva/leaf_coin.png
- `p01_shield` (collectibles) ← fase_01_floresta_viva/banana.png #0
- `p01_paper` (collectibles) ← fase_01_floresta_viva/paper_scrap.png #0
- `p01_bottle` (collectibles) ← fase_01_floresta_viva/paper_scrap.png #1
- `p01_banana` (collectibles) ← fase_01_floresta_viva/water_bottle.png ⚠ halo azul opaco removido por cor
- `p01_rat` (enemies) ← fase_01_floresta_viva/forest_mouse.png #1

### Fase 2 — Rio Limpo
- `p02_ground` (terrain) ← fase_02_rio_limpo/river_platform_long.png
- `p02_ledge` (terrain) ← fase_02_rio_limpo/river_platform_medium.png
- `p02_bridge` (terrain) ← fase_02_rio_limpo/barrel.png
- `p02_block` (terrain) ← fase_02_rio_limpo/river_bridge.png
- `p02_barrel` (props) ← fase_02_rio_limpo/blue_drum.png
- `p02_rock` (props) ← fase_02_rio_limpo/ladder.png #0
- `p02_pipe` (props) ← fase_02_rio_limpo/recycle_bin.png #0
- `p02_bin` (props) ← fase_02_rio_limpo/recycle_bin.png #1
- `p02_bag` (collectibles) ← fase_02_rio_limpo/trash_bag.png
- `p02_bottle` (collectibles) ← fase_02_rio_limpo/trash_paper.png
- `p02_paper` (collectibles) ← fase_02_rio_limpo/fish_enemy.png #0
- `p02_fish` (enemies) ← fase_02_rio_limpo/fish_enemy.png #1
- `p02_coin` (collectibles) ← projeto: f02_coin ⚠ peça ausente/quebrada no pacote; reaproveitada do projeto

### Fase 3 — Cidade Verde
- `p03_ground` (terrain) ← fase_03_cidade_verde/city_platform_long.png
- `p03_ledge` (terrain) ← fase_03_cidade_verde/city_platform_medium.png
- `p03_bridge` (terrain) ← fase_03_cidade_verde/traffic_cone.png
- `p03_block` (terrain) ← fase_03_cidade_verde/bench.png ⚠ mancha verde translúcida à esquerda cortada
- `p03_wall` (terrain) ← fase_03_cidade_verde/brick_wall.png #1
- `p03_crate` (props) ← fase_03_cidade_verde/barrel.png
- `p03_barrel` (props) ← fase_03_cidade_verde/pipe.png
- `p03_cone` (props) ← fase_03_cidade_verde/crate.png
- `p03_pipe` (props) ← fase_03_cidade_verde/brick_wall.png #0
- `p03_coin` (collectibles) ← fase_03_cidade_verde/paper.png
- `p03_wrapper` (collectibles) ← fase_03_cidade_verde/food_wrapper.png #0
- `p03_bottle` (collectibles) ← fase_03_cidade_verde/bottle.png #1
- `p03_robot` (enemies) ← fase_03_cidade_verde/robot_enemy.png #1
- `p03_bin` (props) ← projeto: f03_bin ⚠ peça ausente/quebrada no pacote; reaproveitada do projeto

### Fase 4 — Montanha
- `p04_ground` (terrain) ← fase_04_montanha/snow_platform_long.png
- `p04_ledge` (terrain) ← fase_04_montanha/snow_platform_small.png
- `p04_bridge` (terrain) ← fase_04_montanha/ladder.png
- `p04_block` (terrain) ← fase_04_montanha/snow_bridge.png
- `p04_rock` (terrain) ← fase_04_montanha/ice_crystal.png
- `p04_wall` (terrain) ← fase_04_montanha/snow_wall.png #1
- `p04_crate` (props) ← fase_04_montanha/barrel.png
- `p04_barrel` (props) ← fase_04_montanha/pipe.png
- `p04_ladder` (props) ← fase_04_montanha/crate.png
- `p04_pipe` (props) ← fase_04_montanha/snow_wall.png #0
- `p04_snowball` (props) ← fase_04_montanha/snowball.png
- `p04_coin` (collectibles) ← fase_04_montanha/leaf_coin.png
- `p04_bottle` (collectibles) ← fase_04_montanha/bottle.png
- `p04_yeti` (enemies) ← fase_04_montanha/yeti_enemy.png
- `p04_bin` (props) ← projeto: f04_bin2 ⚠ peça ausente/quebrada no pacote; reaproveitada do projeto

### Fase 5 — Praia Limpa
- `p05_ground` (terrain) ← fase_05_praia_limpa/sand_platform_small.png
- `p05_ledge` (terrain) ← fase_05_praia_limpa/sand_platform_small.png
- `p05_bridge` (terrain) ← fase_05_praia_limpa/palm_tree.png
- `p05_block` (terrain) ← fase_05_praia_limpa/star_block.png
- `p05_wall` (terrain) ← fase_05_praia_limpa/stone_wall.png #1
- `p05_crate` (props) ← fase_05_praia_limpa/barrel.png
- `p05_palm` (props) ← fase_05_praia_limpa/crate.png
- `p05_bin` (props) ← fase_05_praia_limpa/recycle_bin.png
- `p05_ring` (props) ← fase_05_praia_limpa/crab_enemy.png #1
- `p05_coin` (collectibles) ← fase_05_praia_limpa/leaf_coin.png
- `p05_fishbone` (collectibles) ← fase_05_praia_limpa/bottle.png
- `p05_bottle` (collectibles) ← fase_05_praia_limpa/shell.png #1
- `p05_crab` (enemies) ← fase_05_praia_limpa/crab_enemy.png #0

### Fase 6 — Deserto
- `p06_ground` (terrain) ← fase_06_deserto/desert_platform_small.png
- `p06_ledge` (terrain) ← fase_06_deserto/desert_platform_small.png
- `p06_bridge` (terrain) ← fase_06_deserto/ladder.png
- `p06_block` (terrain) ← fase_06_deserto/cactus.png
- `p06_wall` (terrain) ← fase_06_deserto/sandstone_wall.png
- `p06_crate` (props) ← fase_06_deserto/barrel.png
- `p06_ladder` (props) ← fase_06_deserto/crate.png
- `p06_cactus` (props) ← fase_06_deserto/desert_bridge.png
- `p06_bin` (props) ← fase_06_deserto/red_bin.png
- `p06_coin` (collectibles) ← fase_06_deserto/leaf_coin.png
- `p06_paper` (collectibles) ← fase_06_deserto/paper.png
- `p06_lizard` (enemies) ← fase_06_deserto/lizard_enemy.png

### Fase 7 — Metrópole Sustentável
- `p07_ground` (terrain) ← fase_07_metropole_sustentavel/tech_platform_long.png
- `p07_ledge` (terrain) ← fase_07_metropole_sustentavel/tech_platform_medium.png
- `p07_bridge` (terrain) ← fase_07_metropole_sustentavel/tech_ladder.png
- `p07_block` (terrain) ← fase_07_metropole_sustentavel/energy_bridge.png
- `p07_hazard` (terrain) ← fase_07_metropole_sustentavel/hazard_block.png
- `p07_crate` (props) ← fase_07_metropole_sustentavel/tech_barrel.png
- `p07_ladder` (props) ← fase_07_metropole_sustentavel/tech_crate.png
- `p07_shield` (collectibles) ← fase_07_metropole_sustentavel/drone.png #0
- `p07_battery` (collectibles) ← fase_07_metropole_sustentavel/battery.png
- `p07_circuit` (collectibles) ← fase_07_metropole_sustentavel/circuit.png
- `p07_drone` (enemies) ← fase_07_metropole_sustentavel/drone.png #1
- `p07_coin` (collectibles) ← projeto: f07_coin ⚠ peça ausente/quebrada no pacote; reaproveitada do projeto
- `p07_bin` (props) ← projeto: f07_bin ⚠ peça ausente/quebrada no pacote; reaproveitada do projeto

### Fase 8 — Planeta CrisoVerde
- `p08_ground` (terrain) ← fase_08_planeta_crisoverde/alien_platform_long.png
- `p08_ledge` (terrain) ← fase_08_planeta_crisoverde/alien_platform_medium.png
- `p08_bridge` (terrain) ← fase_08_planeta_crisoverde/energy_ladder.png
- `p08_block` (terrain) ← fase_08_planeta_crisoverde/purple_wall.png
- `p08_float` (terrain) ← fase_08_planeta_crisoverde/crystal.png
- `p08_crate` (props) ← fase_08_planeta_crisoverde/tech_barrel.png
- `p08_ladder` (props) ← fase_08_planeta_crisoverde/tech_crate.png
- `p08_crystal` (props) ← fase_08_planeta_crisoverde/energy_bridge.png
- `p08_pipe` (props) ← fase_08_planeta_crisoverde/energy_pipe.png #1
- `p08_shield` (collectibles) ← fase_08_planeta_crisoverde/alien_enemy.png #0
- `p08_capsule` (collectibles) ← fase_08_planeta_crisoverde/capsule.png
- `p08_banana` (collectibles) ← fase_08_planeta_crisoverde/energy_bottle.png
- `p08_alien` (enemies) ← fase_08_planeta_crisoverde/alien_enemy.png #1
- `p08_coin` (collectibles) ← projeto: f08_coin ⚠ peça ausente/quebrada no pacote; reaproveitada do projeto
- `p08_bin` (props) ← projeto: f08_bin ⚠ peça ausente/quebrada no pacote; reaproveitada do projeto

## Correções feitas nos PNGs

- 28 arquivos com 2+ objetos foram separados por componente conectado (o objeto certo foi escolhido olhando o conteúdo).
- Alfa binário preservado/forçado; cor dos pixels transparentes = vizinho opaco (sem franja escura ao redimensionar). Contornos escuros do desenho foram mantidos.
- Tiles de terreno: borda mais limpa espelhada para o outro lado, miolo em janela sem mordidas, furos internos preenchidos, rebarbas da base cortadas, redução LANCZOS para a escala do jogo (largura múltipla de 5 = cap de 20% exato).
- Fase 1: halo azul opaco da casca de banana removido por cor.

## Ainda precisa de arte/correção manual

- Quebrados no pacote: `bottle` (rio), `river_rock`, `city_platform_short`, `pipe` (deserto), `leaf_coin` e `recycle_bin` (fase 8); `leaf_coin` das fases 2, 3, 7; `recycle_bin` das fases 3, 4, 7 e 8. Lixeiras dessas fases usam as peças do projeto.
- Peças de terreno dedicadas: cada fase só traz **uma** largura por tamanho, sem canto/borda/miolo próprios. O miolo espelhado cria textura simétrica ("borboleta") nas pedras. O ideal é um tile esquerda/centro/direita por fase.
- `pNN_block` da fase 3 ainda tem uma mancha verde translúcida à esquerda (peça não usada no jogo).
- Fase 2 não tem caixa; fases 7 e 8 só têm caixas tecnológicas pequenas (não usadas nos layouts atuais).
- Decoração antiga mantida: `f01_rocks`, `f03_totem`, `f05_hut`.
