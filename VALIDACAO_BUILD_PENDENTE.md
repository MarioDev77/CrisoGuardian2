# Validação pendente

O build de produção ainda não foi aprovado. O diretório `node_modules` está incompleto e a instalação não pode ser concluída neste ambiente porque `registry.npmjs.org` falha na resolução DNS (`EAI_AGAIN`).

Executar em ambiente com acesso ao npm:

```bash
cd frontend
npm ci
npm run build
npm test
npm run test:e2e
```

Depois, abrir as fases 9–16 no navegador, verificar visualmente o parallax e as colisões e só então publicar.

A correção de renderização está no arquivo `frontend/src/game/engine.ts`. Este ZIP é um pacote de revisão do código-fonte, não uma build de produção validada.
