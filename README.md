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

## Testar a API FastAPI isolada

Use Python 3.12 ou superior em outro terminal. No WSL/Linux:

```bash
cd apps/backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-lock.txt
.venv/bin/python -m pytest -q
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8002
```

No Windows, os comandos equivalentes são:

```powershell
cd apps/backend
py -3.12 -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements-lock.txt
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8002
```

Abra a [documentação interativa](http://127.0.0.1:8002/docs), o [health](http://127.0.0.1:8002/api/v1/health) ou o [tema ETMSL](http://127.0.0.1:8002/api/v1/public/institutions/etmsl/theme). As respostas de tema usam fixtures sinalizadas pelo cabeçalho `X-FUMEP-Data-Source: fixture`; ainda não leem o banco, nem são consumidas pelo Nuxt. O backend legado pode ocupar a porta 8000, por isso esta demonstração usa 8002.

A primitiva de sessão Redis da migração é testável isoladamente; ainda não oferece login no navegador. Consulte `docs/REDIS_SESSION_MIGRATION.md` para contrato, limites e teste opcional contra Redis local.
