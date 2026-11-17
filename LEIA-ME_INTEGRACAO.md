# CrisoGuardian — 16 fases integradas

Este pacote integra as fases 01–16 no projeto Vite/React original enviado.

## O que foi integrado
- Mantidas as fases 01–08 do projeto original.
- Conectados os 8 layouts adicionais (fases 09–16) ao array principal de fases.
- Incluído o mapa 2 (fases 09–16), desbloqueado ao concluir a fase 08.
- Incluídos catálogo e assets das fases 09–16 em `frontend/public/assets/islands` e `frontend/public/assets/phases`.
- Incluídos inimigos por fase, pivôs normalizados e assets de chefes das fases 11 e 16.
- Mantida a progressão sequencial até a fase 16 e retorno ao mapa apropriado.

## Abrir o projeto
1. Instale uma versão LTS atual do Node.js.
2. No terminal, entre em `frontend`.
3. Execute `npm install`.
4. Execute `npm run dev` para abrir o jogo localmente.
5. Para build de produção, execute `npm run build`.

## Verificação específica das fases 09–16
Na pasta `frontend`, execute:
`npm run verify:islands`

A verificação específica dos vínculos de layouts, inimigos, pivôs, chefes e transições foi executada durante a preparação deste pacote e retornou OK.

## Observação
O build completo e os testes de navegador não foram executados neste pacote. Faça esses testes no seu ambiente antes de publicar.
Arquivos de chave privada e dados locais assinados não foram incluídos.
