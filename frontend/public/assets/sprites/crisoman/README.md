# Crisoman — sprites preparados

Gerado por `python3 tools/build_crisoman_sprites.py` a partir do atlas oficial (`public/assets/game/atlas.png` + `atlas.json`).

- `frames/<animacao>/<animacao>_NN.png` — um PNG RGBA por quadro. **Todos têm o mesmo tamanho (94×83)** e a **origem dos pés no mesmo ponto (47, 81)**.
- `sheets/<animacao>.png` — uma linha de quadros por animação (idle, walk, run, jump, fall, land, shoot, reload, hurt, die, special).
- `crisoman.png` + `crisoman.json` — spritesheet usado pelo jogo e metadados (retângulo de cada quadro, origem, estados, pendências).
- Limpeza aplicada: componente isolado removido (1 resíduo em `p_special_0`) e cor escondida zerada em todos os pixels de alfa 0 (60 395 px), o que evita halo ao ampliar/tingir. O alfa é o original (sem chroma-key).
- Nenhum quadro foi inventado ou duplicado. Proporções originais mantidas (corpo de 38 a 83 px de altura conforme a pose).

## Estados do jogo → quadros
Ver `states` em `crisoman.json`. `status`: `original` (arte própria), `shared` (pose de outra família) ou `borrowed` (sem arte dedicada).

## Pendências de arte (documentadas, não inventadas)
- **victory** — sem quadros de comemoração; reaproveita poses de salto.
- **interact** — usa a pose de recarga (`p_reload_*`) como gesto.
- **climb** — sem escalada; reaproveita a caminhada.
- **jumpStart** — compartilha `p_jump_0` (não há quadro de agachar separado).
