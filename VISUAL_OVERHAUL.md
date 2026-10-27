# CrisoGuardian2 — revisão visual e novas ilhas

## O que mudou

- Padrão visual documentado: ilustração cartoon vetorial em SVG, contorno escuro, paletas curtas mapeadas por skin; frame comum 96×96 e pivô nos pés em (48,92).
- Atlas único com 415 quadros de Crisoman, Crisogirl e cinco pets. O manifesto define animação, FPS, loop, skin, ID do pet, posição e pivô.
- Animações: idle, walk, run, jump, fall, collect, hurt e celebrate para as 10 skins; idle, follow e collect para os cinco pets.
- Prévia do lobby usa o sprite correto da skin e pet; as variantes usam paletas reais do gerador em vez de filtros de cor do navegador.
- Três ilhas novas: Manguezal Vivo, Geleira Azul e Vulcão Verde, cada uma com céu, três camadas parallax, tiles 32×32, elementos decorativos, lixeira e miniatura.
- Tela de seleção no lobby mostra as 11 ilhas e respeita o progresso desbloqueado. As três fases usam os mesmos limites econômicos e validações de recompensa das anteriores.
- Saves mantêm moedas, compras e equipamentos. A normalização agora também expande estrelas e melhores resultados das oito fases antigas para onze posições.

## Estrutura

- `frontend/public/assets/sprites/v2/`: atlas, manifesto e paletas dos atores.
- `frontend/public/assets/islands/`: camadas, tiles e miniaturas das ilhas novas.
- `frontend/public/assets/previews/`: contact sheets SVG.
- `frontend/tools/generate-visuals.mjs`: gerador procedural das artes e do atlas.
- `frontend/tools/make-contact-sheets.mjs`: gera as prévias.
- `frontend/src/game/`: renderização, animação, layouts e configurações das fases.
- `frontend/src/components/Lobby.tsx`: seleção de ilha e preview de loadout.
- `frontend/src/app/catalog-data.json`: catálogo de paletas, ilhas e limites econômicos.
- `backend/economy-api.mjs`: progresso de 11 fases e migração do save assinado anterior.

## QA executado

- `npm run build`: aprovado (TypeScript e build Vite de produção).
- Suíte Vitest: 178 aprovados; 1 teste HTTP de integração não conseguiu conectar a `127.0.0.1`. O processo de API inicia e registra a porta, porém o ambiente de execução bloqueia a conexão local do teste.
- Manifesto visual: aprovado; dimensões e pivô uniformes e todos os IDs de skin/pet presentes nas animações exigidas.
- Rotas automáticas para as 11 fases: aprovadas.
- Teste fuzz de colisão com entradas aleatórias nas 11 fases: aprovado.
- Análises estáticas da suíte existente: cobrem animação, economia, combate, save assinado e recuperação de backup; o teste HTTP que exercita concorrência/backup é o que ficou bloqueado pela conexão local.
- Não foi possível obter captura do navegador nesta sessão: a automação do navegador encerrou antes de abrir a URL local. As prévias vetoriais entregues são geradas diretamente dos assets e não são capturas de gameplay.

## Limitações

A arte foi desenhada proceduralmente em SVG, conforme a alternativa autorizada no pedido; não foi gerada por modelo de imagem. Ela mantém um estilo coerente e identidade de cor/silhueta, mas requer revisão artística para acabamento de produção. Os oito mapas antigos seguem com sua arte e resolução originais. A validação visual de colisão foi complementada por fuzz e bots; não foi feita inspeção humana interativa de cada tela no navegador.

A economia continua dependendo de coleta reportada pelo cliente e de tetos/deduplicação no servidor. Para prova forte de cada spawn e recompensa, seria necessário mover simulação da partida e validação dos coletáveis para servidor autoritativo.

## Rodar

1. Extraia o ZIP.
2. No diretório `frontend`, execute `npm install`.
3. Em um terminal, execute `npm run dev:api`.
4. Em outro terminal, execute `npm run dev`.
5. Abra a URL local mostrada pelo Vite. Para QA, use `npm test`; `npm run build` valida o pacote de produção.

No deploy, hospede `frontend/dist`, rode `backend/economy-api.mjs`, configure `CRISO_SERVER_SECRET` com 32 caracteres ou mais e `CRISO_DATA_DIR` persistente, e encaminhe `/api` à API.
