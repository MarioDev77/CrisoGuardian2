# CrisoGuardian2 — correções visuais e de fluxo

## Alterações

- Crisogirl agora tem desenho próprio em todas as skins: cabelo longo preso com laço, traços faciais e armadura de cintura/saia em paletas femininas. O atlas usa frames transparentes de 96×96, pivô nos pés em `(48,92)` e mantém o ID de cada skin e pet.
- O Lobby é uma tela própria aberta pelo botão no mapa. Nele se escolhe personagem, skin e pet; a prévia usa o atlas correto.
- Loja e Reciclagem são telas próprias no mapa, separadas do Lobby e das fases.
- Clicar em um ponto de fase no mapa inicia a fase diretamente. Depois de concluir, “Próxima fase” inicia a seguinte.
- Uma vitória válida salva as estrelas e libera a fase seguinte mesmo quando dura menos de 15 segundos. Partidas abaixo de 15 segundos não pagam moedas nem materiais, preservando o mínimo econômico.
- As três ilhas novas continuam acessíveis conforme o progresso salvo.

## QA

- `npm run build`: passou.
- `npm test`: 178 testes passaram; 1 teste HTTP de API não conseguiu conectar a `127.0.0.1`. A API chega a imprimir que está ouvindo, mas o ambiente bloqueia a conexão local.
- `npx playwright test --list`: carregou e listou os 8 testes de navegador.
- `npm run test:e2e`: tentativa não concluiu; os servidores locais de teste ficaram sem resposta neste ambiente.
- Teste fuzz automatizado de colisão passou nas 11 fases.
- Teste estático do atlas confirma todas as animações de cada skin e pet. Os contact sheets SVG acompanham o ZIP como prévias.

## Rodar

1. Extraia `CrisoGuardian2-visual-overhaul.zip`.
2. Em `frontend/`, execute `npm install`.
3. Abra dois terminais nessa pasta: rode `npm run dev:api` em um e `npm run dev` no outro.
4. Abra a URL do Vite. Os atalhos de Lobby, Loja e Reciclagem ficam no mapa.

Para produção, configure `CRISO_SERVER_SECRET` (32 caracteres ou mais) e `CRISO_DATA_DIR` persistente, sirva `frontend/dist` e encaminhe `/api` para `backend/economy-api.mjs`.
