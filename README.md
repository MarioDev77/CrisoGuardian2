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
