#!/usr/bin/env python3
"""Gera public/assets/sprites/actors/actors.json: animações de inimigos, chefe e efeitos.

Nada é estimado: os retângulos (x, y, w, h) e os pivôs (ax, ay) são copiados de public/assets/game/atlas.json,
os nomes de quadros e a hitbox vêm de src/game/entities.ts (ENEMIES) e os estados do chefe de engine.ts (drawBoss).
O jogo continua lendo atlas.json; este arquivo descreve as animações (para a página de visualização e para os testes).
Uso: python3 tools/build_actor_meta.py
"""
import json, os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
atlas = json.load(open(os.path.join(ROOT, 'public/assets/game/atlas.json')))
ents = open(os.path.join(ROOT, 'src/game/entities.ts'), encoding='utf8').read()

def rect(n): f = atlas[n]; return {k: f[k] for k in ('x', 'y', 'w', 'h', 'ax', 'ay')}
frames = {}
def use(n): frames[n] = rect(n); return n

# --- inimigos com quadros no atlas (os de bioma são sprites estáticos animados por código: ver "procedural") ---
enemies, procedural = {}, {}
for m in re.finditer(r"^\s*(\w+): \{ w: (\d+), h: (\d+), hp: (\d+), speed: (\d+), scale: ([\d.]+), fly: (true|false), score: (\d+), frames: \[([^\]]*)\](.*?)\},?\s*$", ents, re.M):
    kind, w, h, hp, speed, scale, fly, score, fr, rest = m.groups()
    names = re.findall(r"'([^']+)'", fr); get = lambda k: (re.search(k + r": '([^']+)'", rest) or [None, None])[1]
    chase, attack, die, motion = get('chase'), get('attack'), get('die'), get('motion')
    body = dict(w=int(w), h=int(h), note='hitbox física; independente do tamanho do sprite')
    if motion:
        procedural[kind] = dict(sprite=names[0], motion=motion, body=body, hp=int(hp), flying=fly == 'true', note='sprite estático do catálogo de fases (phases/catalog.json); a animação é feita por código (engine.ts enemyPose)')
        continue
    anims = {}
    if kind == 'rat':
        anims['idle'] = dict(frames=[use(names[1])], loop=True, fps=0, note='preparação/recuperação do golpe reutilizam esta pose')
        anims['walk'] = dict(frames=[use(n) for n in names], loop=True, fps=4)
        anims['chase'] = dict(frames=[use(names[0]), use(chase)], loop=True, fps=10)
        anims['attack'] = dict(frames=[use(attack)], loop=False, fps=0, note='ativa no estado strike (enemyAI.ts)')
    else:
        anims['walk'] = dict(frames=[use(n) for n in names], loop=True, fps=18 if kind == 'fly' else 6)
        if chase: anims['chase'] = dict(frames=[use(names[0]), use(chase)], loop=True, fps=14)
    if die: anims['die'] = dict(frames=[use(die)], loop=False, fps=0, duration=0.6, note='desvanece em 0,6 s (engine.ts: e.dying)')
    enemies[kind] = dict(body=body, hp=int(hp), flying=fly == 'true', native_facing='left' if 'nativeLeft: true' in rest else 'right', animations=anims,
                         engine_effects=dict(hurt='quadro atual com brilho 220 % e squash (e.hurt)', windup='brilho 140 % (aviso do golpe)'))

# --- chefe: mapeamento literal de drawBoss (engine.ts) ---
boss_states = {
    'idle': ['boss_idle', 'boss_atk1'], 'windup': ['boss_atk1'], 'windup_leap': ['boss_idle'], 'charge': ['boss_atk1'], 'spit': ['boss_atk1'],
    'leap': ['boss_atk2'], 'recover': ['boss_idle'], 'hurt': ['boss_hurt'], 'phase': ['boss_hurt'], 'dead': ['boss_die'],
}
boss = dict(body=dict(w=120, h=180, note='hitbox física (engine.ts: this.boss)'), phases=3,
            animations={k: dict(frames=[use(n) for n in v], loop=k not in ('dead',), fps=3 if len(v) > 1 else 0) for k, v in boss_states.items()},
            telegraph='engine.ts drawBoss: aviso de mira/linha no windup; fase 3 com aura vermelha pulsante')
# --- efeitos do atlas ---
fx = dict(
    shot=dict(frames=[use('fx_shot')], loop=True, fps=0, note='projétil do Crisoman; scale 0,7'),
    special_ring=dict(frames=[use('fx_special_ring')], loop=False, fps=0, duration=0.7, note='anel que se expande (scale 0,8 → 4,2) e some'),
    special_burst=dict(frames=[use('fx_special_burst')], loop=False, fps=0, duration=0.7, note='explosão de energia verde (scale 0,6 → 2,6)'),
)
out = dict(version=1, image='../../game/atlas.png', atlas='../../game/atlas.json', atlas_size=dict(w=1024, h=534),
           convention='x,y,w,h = retângulo no atlas.png; ax,ay = pivô (pés/centro) em pixels do quadro. Inimigos e chefe usam o pivô como ponto de apoio no chão; efeitos usam o centro.',
           frames=frames, enemies=enemies, enemies_procedural=procedural, boss=boss, effects=fx,
           particles='faíscas, poeira e partículas são desenhadas por código (engine.ts parts); sem sprites',
           missing=['inimigos: sem quadros de dano dedicados (usam brilho/squash por código); rato é o único com quadro de ataque e perseguição próprios',
                    'chefe: sem animação multi-quadro (1 pose por estado); sem sprite de projétil/ataque especial próprio',
                    'efeitos: sem poeira, coleta, cura ou explosões em quadros; as partículas são por código'])
os.makedirs(os.path.join(ROOT, 'public/assets/sprites/actors'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'public/assets/sprites/actors/actors.json'), 'w'), indent=1, ensure_ascii=False)
print('inimigos', len(enemies), 'procedurais', len(procedural), 'quadros', len(frames))
