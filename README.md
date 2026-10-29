# Portal FUMEP

Migração funcional em andamento para Nuxt/Vue e FastAPI. A implementação antiga em Next.js/NestJS permanece no repositório para comparação; não foi conectada ao novo aplicativo.

## Testar agora no navegador

No Windows, com Docker Desktop ativo, `.env`, dependências Python em `apps/backend/.venv` e `pnpm install` já preparados, execute **um comando** na raiz:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-mvp.ps1
```

O script inicia PostgreSQL, Redis e MinIO locais, aplica migrations **somente** em `portal_fumep_mig58_test`, compila o Nuxt e mantém API, Worker e portal ativos enquanto o terminal estiver aberto. `Ctrl+C` encerra esses três processos; os containers Docker permanecem ativos. Não use o script em produção.

Abra [Biblioteca](http://localhost:3002/admin/media) e escolha um perfil pelos botões de demonstração. Depois acesse [Editorial](http://localhost:3002/admin/editorial), [Notícias](http://localhost:3002/admin/noticias) e [Páginas](http://localhost:3002/admin/pages). As [homes](http://localhost:3002/) das três instituições ainda são demonstrativas; notícias e páginas criadas e publicadas nas telas administrativas usam o banco dedicado e aparecem em rotas públicas. A API está em [Swagger](http://127.0.0.1:8002/docs).

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

O acesso por perfil sem senha é habilitado pelo script apenas para a demonstração local com banco dedicado, origem e cliente loopback. Consulte `docs/MVP_MEDIA_LIBRARY.md` para os limites desse recurso.
