# Auditoria técnica — CrisoGuardian2 (30/10/2026)

Escopo: frontend + backend, com foco em árvore de habilidades, evolução dos pets e missões diárias.
Método: leitura do código, execução real de `npm ci`, `tsc`, `vitest`, `vite build`, sondas contra o backend rodando e uma suíte nova de 27 testes.
Backups dos arquivos alterados: `_auditoria/backup-originais/`. Diff completo: `_auditoria/correcoes.patch`.

## 1. Resultado dos testes (executados)

| Verificação | Antes | Depois |
|---|---|---|
| `npm ci` | ok | ok |
| `tsc -b` | **FALHA** (hubScreens.test.tsx: prop `onProgression` ausente) | ok (exit 0) |
| `vitest run` | 228/228 (28 arquivos) — nenhum cobria as 3 funções novas | **255/255 (31 arquivos)** |
| `npm run build` (tsc + vite) | **FALHA** (por causa do tsc) | ok (bundle JS 343 kB, PWA gerada) |
| Testes de integração das rotas (backend real) | não existiam | 18 testes novos, todos passando |
| Testes E2E Playwright | — | **NÃO EXECUTADOS** (Chromium não baixa neste ambiente; `playwright.local.config.ts` aponta para um Chrome do Windows) |

Validação da suíte nova: rodei os 16 testes iniciais contra o backend original (só com o endpoint de relógio de teste): **7 falharam** exatamente nos bugs abaixo; os 9 que passaram mostram comportamentos que já estavam corretos.

## 2. Bugs encontrados e corrigidos

| # | Gravidade | Problema (comprovado por execução) | Correção |
|---|---|---|---|
| 1 | Alta | **Build de produção quebrava**: `tsc` falhava num teste que não recebeu a nova prop `onProgression` do Lobby. | `tests/hubScreens.test.tsx` |
| 2 | **Crítica** | **Contas e sessões eram descartadas ao reiniciar o servidor** (`verifyEnvelope` só devolvia `players`). Prova: cadastro → reinício → login retorna 401; o progresso da conta ficava órfão e era sobrescrito no próximo salvamento. Também afetava o arquivo de backup. | `economy-api.mjs`: nova `cleanAuth()` valida e preserva `accounts`/`sessions` |
| 3 | Alta | **Missão "Colete 5 materiais" ficava impossível** depois que as fases eram pagas: contava só o material *pago*, e fases já concluídas não pagam mais. | Conta os materiais coletados na partida, limitados por `runLimits` (tempo/8 s…); pagamento continua só na 1ª vez |
| 4 | Alta | **XP do pet e missão "Vença 1 fase" podiam ser obtidos com vitória instantânea** (settle logo após start). | Só contam com vitória ≥ 15 s (mesma regra das recompensas) |
| 5 | Média | **Clique duplo comprava 2 níveis** de habilidade (cobrando 100 + 200). | Parâmetro `expectedLevel` → `409` se o nível mudou; UI já envia |
| 6 | Média | **Requisições sem cookie criavam e gravavam um perfil por chamada** (300 chamadas → 301 perfis em disco), sem limite; mapas de rate-limit/`activeRuns` nunca eram limpos. | GET sem perfil não grava; criação por POST limitada a 30/min por IP; varredura periódica dos mapas |
| 7 | Baixa | Pets com XP incoerente (ex.: nível 10 com XP>0) passavam na sanitização. | XP normalizado ao carregar |
| 8 | Baixa | UI: pet nível 10 mostrava "0/1000 XP"; tela de missões não atualizava ao abrir nem mostrava o horário da renovação. | `Progression.tsx`, `App.tsx`, `api.ts`; snapshot traz `daily.resetsAt` |
| 9 | Baixa | Arquivo solto `src/app/write-test.tmp`. | Removido (backup incluído) |

## 3. Funcionalidades — situação

**Aprovadas (verificadas por teste automatizado):**
- Árvore de habilidades: 4 habilidades × 3 níveis; custos 100/200/350 cobrados no servidor; teto no nível 3; saldo insuficiente, habilidade inválida e payloads maliciosos (`__proto__`, arrays, objetos) recusados sem alterar saldo; compra simultânea serializada; persistência após reinício.
- Efeitos na jogabilidade (motor real, headless): defesa +1 HP/nível; salto +altura por nível (≈ +39% de altura no nível 3); velocidade +6%/nível (≈ +18%); magnetismo +8 px/nível; pet +2 px/nível de alcance; sem habilidades o comportamento original é idêntico.
- Pets: +25 XP por vitória válida, só no pet equipado; sobe de nível a cada `nível×100` XP; teto 10; progresso persiste; reenvio da mesma partida → 409; XP/nível enviados pelo navegador são ignorados; pet não possuído não equipa.
- Missões: geração, contagem de vitórias/materiais/reciclagens no servidor, resgate uma única vez (inclusive 2 requisições simultâneas), ids inválidos recusados, renovação diária (data antiga zera contagens e resgates).
- Segurança: toda rota usa o jogador derivado do cookie de sessão (não do corpo) — não há como agir sobre outro jogador; saves antigos (sem `progression`) carregam com valores padrão sem perder moedas/itens.
- Regressão: todos os 228 testes originais (colisão, fases, economia, loja, contas, conquistas, chefes etc.) continuam passando.

**Não verificadas em navegador real:** controles de celular, Lobby/Mapas/Loja de ponta a ponta, PWA — dependem dos E2E (não executados). Cobertos apenas por testes de unidade/jsdom e leitura de código (os controles de toque estão embutidos em `GameView.tsx`).

## 4. Pendências (não corrigidas — decisão ou escopo maior)

1. **Partida roda no cliente** (já documentado no README): ids de coletáveis, estrelas e pontuação não são provados pelo servidor. Mitigado por tetos de tempo, mas um cliente adulterado ainda pode ganhar ~4 vitórias/min de XP/missão. Recomendo teto diário de XP e, no longo prazo, validação autoritativa.
2. **Renovação em UTC** = 21h em Brasília. Está no README e agora aparece na tela; considerar fuso `America/Sao_Paulo`.
3. **Desempenho do armazenamento** (medido): cada escrita regrava e revalida o arquivo inteiro — 1.000 jogadores ≈ 44 ms/escrita; 5.000 ≈ 290 ms (fila serial ≈ 3 escritas/s). Adequado para instância única pequena; migrar para banco transacional antes de crescer.
4. Código não utilizado (mantido, nada removido): `PauseMenu`, `GameHUD`, `MainMenu`, `VictoryScreen`, `useGame`, `secureSave`, `entities/Collectible`, `MobileControls.tsx` (duplicado do controle embutido em `GameView`). `catalog-data.json` existe em duas cópias idênticas (front e back) e custos/missões estão duplicados em `Progression.tsx` — risco de divergência.
5. O "atributo" que o pet evolui é só o alcance de coleta; não há inventário separado (itens ficam no Lobby/Loja).
6. Não avaliei se o salto +39% facilita demais algum trecho das fases.
7. `/api/test/*` só existe com `CRISO_TEST_MODE=1` — nunca ativar em produção.

## 5. Avaliação

- **Segurança:** boa base (cookies HttpOnly/SameSite, scrypt, HMAC no save, validação server-side de moedas/XP/resgates, serialização anti-corrida). Após as correções, os vetores novos mais relevantes (clique duplo, XP instantâneo, perfis anônimos, perda de contas) estão fechados; o risco residual é a confiança no cliente (item 1).
- **Desempenho:** gameplay sem regressão; backend adequado para escala pequena, com custo O(N) por escrita (item 3).
