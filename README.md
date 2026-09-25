# Portal FUMEP

Migração funcional em andamento para Nuxt/Vue e FastAPI. A implementação antiga em Next.js/NestJS permanece no repositório para comparação; não foi conectada ao novo aplicativo.

## Testar agora no navegador

Na raiz do projeto:

```bash
pnpm install --frozen-lockfile --config.confirmModulesPurge=false
pnpm --filter @fumep/portal dev
```

Abra [http://localhost:3002/](http://localhost:3002/), [ETMSL](http://localhost:3002/etmsl) ou [CRAMAM](http://localhost:3002/cramam). É possível alternar entre instituições e testar a aparência Sistema/Claro/Escuro. A tela indica “Demonstração local”: não há login, dados persistidos ou integração FastAPI nessa etapa.

Checks desta funcionalidade:

```bash
pnpm --filter @fumep/portal test
pnpm --filter @fumep/portal typecheck
pnpm --filter @fumep/portal build
```

Consulte `docs/CURRENT_LOOP.md` para a fatia ativa e `docs/architecture/MIGRACAO_FASTAPI_NUXT_CANONICA.md` para a arquitetura e sequência da migração. O trabalho não commitado do antigo loop 5.31 foi preservado em stash recuperável; não foi descartado.
