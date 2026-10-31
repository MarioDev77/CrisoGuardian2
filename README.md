# CrisoGuardian2

Projeto organizado em duas partes: `frontend/` contém o jogo web, e `backend/` contém a API que valida economia e progresso.

## Rodar em desenvolvimento

Instale as dependências dentro do frontend:

```bash
cd frontend
npm install
```

Abra dois terminais:

```bash
cd frontend
npm run dev:api
```

```bash
cd frontend
npm run dev
```

Acesse o endereço que o Vite mostrar. O site encaminha `/api` para a API local.

## Build e hospedagem

Dentro de `frontend/`, `npm run build` gera `frontend/dist/`. A hospedagem precisa rodar `backend/economy-api.mjs` e encaminhar `/api` para o backend na mesma origem. Configure `CRISO_SERVER_SECRET` com pelo menos 32 caracteres e `CRISO_DATA_DIR` para armazenamento persistente. Em produção use HTTPS e encaminhe `X-Forwarded-Proto: https`. O armazenamento atual é um JSON assinado para uma única instância; multi-instância requer banco transacional.

Para rodar os testes unitários/API: `cd frontend` e `npm test`. Para os testes de navegador instale Chromium com `npx playwright install chromium`, depois rode `npm run test:e2e`.

O catálogo de preços compartilhado pela interface e API está em `frontend/src/app/catalog-data.json`. A sessão é anônima; limpar o cookie inicia um perfil vazio. O saldo salvo anteriormente só no navegador não é migrado, pois podia ser alterado localmente. Como a partida ainda roda no cliente, a API limita e deduplica recompensas, mas não consegue provar cada toque em coletável; veja o relatório da entrega para os limites de segurança.

## Navegação e arte visual

No mapa, os botões **Lobby**, **Loja** e **Reciclagem** abrem telas separadas. Equipe personagens, skins e pets no Lobby; escolha uma fase clicando diretamente no mapa. Ao concluir uma fase, a próxima fase inicia pelo botão de avanço.

O atlas de personagens fica em `frontend/public/assets/sprites/v2/`. Ele é gerado por `frontend/tools/generate-visuals.mjs`; as prévias são geradas por `frontend/tools/make-contact-sheets.mjs`. Vitórias válidas com menos de 15 segundos avançam o progresso sem dar moedas ou materiais.

## Contas, conquistas e salvamento

- **Cadastro:** nome de usuário (3–20 letras/números/_) e senha (8–128). Sem e-mail. A senha é guardada só como hash `scrypt` com sal próprio; o login leva o mesmo tempo para usuário existente ou não e responde a mesma mensagem.
- **Sessão:** cookie `HttpOnly` + `SameSite=Lax` (`Secure` atrás de HTTPS), trocado a cada login (evita fixação de sessão), válido por 30 dias. O servidor guarda só o hash do cookie.
- **Proteções:** limite de 10 tentativas/min por IP nas rotas `/api/auth/*`; 5 senhas erradas bloqueiam a conta por 5 min; lista de senhas fracas recusadas. Atrás de proxy, defina `CRISO_TRUST_PROXY=1`.
- **Progresso de convidado** vai junto ao criar a conta. O jogador pode sair e **excluir a conta** (pede a senha) — apaga conta, progresso e conquistas.
- **Conquistas** (`catalog-data.json` → `achievements`) são avaliadas **no servidor** com dados já validados; o cliente só exibe. Estatísticas: moedas ganhas, materiais coletados, trocas e compras.
- **Produção:** defina `CRISO_SERVER_SECRET` (≥ 32 caracteres), sirva por HTTPS e faça backup da pasta `backend/data`. Rotas: `POST /api/auth/register | login | logout | delete`.
- **Dev:** `npm run dev:api` (porta 4174) e `npm run dev`.

## Geração de assets (opcional)

- `python3 tools/build_hero_sprites.py` — sprites dos heróis a partir da folha de poses.
- `node tools/build_island_kits.mjs` — cenários, tiles, props, animais, **inimigos das ilhas 9–16** e layouts em partes A–D.


## Progressão: habilidades, pets e missões diárias

- No Lobby, abra **Habilidades e missões** para acessar a nova central de progressão.
- **Árvore de habilidades:** salto, velocidade, defesa e coleta magnética, com três níveis e custos de 100, 200 e 350 moedas. Os efeitos são aplicados ao iniciar uma fase.
- **Pets:** o pet equipado recebe 25 XP por vitória; sobe de nível até o nível 10 e amplia a aura de coleta.
- **Missões diárias:** vencer uma fase, coletar cinco materiais e reciclar um lote. Cada recompensa pode ser resgatada uma vez por dia. O ciclo diário usa a data UTC do servidor.
- O progresso dessas funções é salvo no arquivo assinado do backend e as compras/resgates são validados no servidor.

### Regras de progressão (revisadas na auditoria)

- **Habilidades:** o cliente envia `{ skill, expectedLevel }`; se o nível já mudou (clique duplo), o servidor responde `409` e não cobra de novo. Custos 100/200/350 e teto no nível 3 são validados só no servidor.
- **XP do pet e missões** só contam em vitória válida (≥ 15 s, a mesma regra das recompensas). Vitórias instantâneas continuam avançando o mapa, mas não dão XP nem progresso de missão.
- **"Coletar 5 materiais"** acompanha os materiais coletados na partida, inclusive em fases já pagas (replays), limitado por `runLimits` (tempo/8 s…); o pagamento de materiais continua sendo só na primeira vez.
- **Renovação diária:** data UTC do servidor (meia-noite UTC = 21h em Brasília). O snapshot traz `progression.daily.resetsAt` e a tela mostra o horário local de renovação.
- **Persistência:** contas e sessões agora são mantidas ao recarregar o arquivo assinado (antes eram descartadas a cada reinício do servidor).
- **Abuso:** visitas sem cookie não gravam perfis; criação de perfis novos por POST limitada a 30/min por IP (atrás de proxy, defina `CRISO_TRUST_PROXY=1`).
- **Testes:** `tests/progressionApi.test.ts` (integração real com o backend), `progressionEngine.test.ts` (efeitos no motor), `progressionUi.test.tsx`. Em `CRISO_TEST_MODE=1` existe `/api/test/age-run` para simular o tempo da partida; nunca ative em produção.
