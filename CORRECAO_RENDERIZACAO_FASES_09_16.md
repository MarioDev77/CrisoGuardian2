# Correção do motor de renderização — fases 9 a 16

## Alteração aplicada

Arquivo: `frontend/src/game/engine.ts`.

- A repetição horizontal das camadas de parallax agora alterna a orientação (espelhamento) entre blocos consecutivos e sobrepõe uma fração de pixel para reduzir frestas nas junções.
- A camada `near` foi desativada nos índices 8, 12 e 14 (fases 9, 13 e 15). Nesses biomas, o arquivo dessa camada contém recortes de ilhas suspensas com bordas retas que, sobrepostos à copa principal, aparecem como blocos/retângulos. As camadas `sky`, `far` e `mid` continuam sendo desenhadas.
- Não foram alterados movimento, física, hitboxes, colisões, inimigos ou lógica de fases.

## Verificação realizada

- Transpilação sintática do arquivo `engine.ts` com o TypeScript global: sem diagnósticos de sintaxe.
- `npm run build`: não concluído. O ambiente tem `node_modules` incompleto e o registry npm não resolve DNS (`EAI_AGAIN registry.npmjs.org`), impedindo instalar as dependências.
- Testes Vitest e Playwright não executados por falta das dependências.
- A alteração ainda precisa ser testada no navegador e publicada no Vercel para aparecer no endereço online.

## Limitação

Este pacote contém a correção no código-fonte, mas não é uma build aprovada nem uma publicação. Não afirmar que o site online já foi corrigido até executar o build, validar as fases no navegador e fazer o deploy.
