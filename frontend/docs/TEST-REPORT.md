# Relatório de validação — CRISOVERDE RUST V1.0

Data do ambiente: 2026-10-13/14 (UTC do ambiente de execução).

## Executado com sucesso

- **Compilação isolada do núcleo do jogo:** `tsc` global compilou os módulos de tipos de fase, configuração, RNG com seed, validador, gerador procedural, entidade do jogador, inimigo e física com `--strict`.
- **Verificação procedural em Node.js:** geração para seeds `1, 2, 3, 4, 5, 9, 42, 100, 777, 123456`; todas produziram níveis válidos segundo `validateLevel`. A mesma seed é implementada por RNG determinístico. As verificações foram executadas com `node:assert` para repetibilidade, variação entre seeds e os testes básicos de movimento, salto, aterrissagem e colisão após compilar o núcleo com TypeScript global.
- **Assets:** inspecionadas dimensões dos 20 PNGs recebidos e preservados no projeto. Foi criado um recorte transparente temporário de Crisoman a partir da referência oficial para uso no Canvas. Ícones PWA quadrados 192×192 e 512×512 foram gerados localmente a partir do logo enviado.

## Não executado / bloqueado pelo ambiente

- **`npm install`: não concluído.** O registro npm não pôde ser alcançado (`EAI_AGAIN registry.npmjs.org`) e a instalação excedeu o tempo limite. Portanto, não há node_modules nem resolução transitiva completa de dependências neste ambiente. O `package-lock.json` registra as versões diretas fixadas, mas precisa ser regenerado/completado por `npm install` em ambiente com acesso ao registry.
- **Build Vite de produção:** não executado, pois as dependências não puderam ser instaladas. Não declarar build validado.
- **Vitest:** testes automatizados foram implementados, mas a suíte não foi executada por falta das dependências instaladas.
- **Playwright/browser:** teste E2E implementado, mas não executado; navegador e dependências Playwright não foram instalados.
- **Console do navegador, controles por toque/multitoque, instalação PWA e modo offline real:** não executados por ausência de navegador de teste e build de produção.
- **Jogo completo do início ao fim por interação real:** não executado neste ambiente.

## Pendências conhecidas

- Crisoman usa um recorte de referência e não animações oficiais individuais.
- Inimigos e coletáveis são temporariamente desenhados com formas no Canvas; sprites compostos originais foram preservados mas ainda não recortados e conectados às entidades.
- A validação verifica conexões, limites e posicionamento básico; não é ainda uma prova formal de alcançabilidade por simulação de saltos. O chão contínuo garante um caminho principal na geração atual.
- A instalação e o cache offline precisam ser confirmados em navegador real após `npm install`, `npm run build` e `npm run preview`.


## Atualização V1.1 — expansão para oito missões

- Implementado: catálogo de oito configurações de fase, seleção no menu, paletas por bioma e integração com o gerador procedural existente.
- Implementado: teste Vitest `tests/levelConfigs.test.ts` cobrindo unicidade dos identificadores e determinismo dos níveis.
- Não executado nesta sessão: Vitest, build Vite, Playwright e validação em navegador; as dependências npm não estão instaladas localmente e o ambiente anteriormente não conseguiu acessar o registro npm.
- Limitação: todas as fases usam o mesmo conjunto base de entidades e mecânicas. A diferenciação atual é configuração, paleta e extensão; fases ainda precisam de tiles, inimigos/objetivos específicos e design de segmentos próprios.
