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
