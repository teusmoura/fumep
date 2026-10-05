# MVP verificável — integração administrativa para PageTemplate

Estado em 2026-10-05: **API de autenticação utilizável; PageTemplate ainda não utilizável**. Este é um checkpoint do MIG 5.8, não um aceite do loop.

| Parte | Estado | Como verificar |
| --- | --- | --- |
| Baseline SQLAlchemy/Alembic | Testada só em `portal_fumep_mig58_test` | `pytest tests/test_page_template_database.py` com `FUMEP_TEST_DATABASE_URL` explícita |
| Login PostgreSQL/Redis | API implementada | `POST /api/v1/auth/login` |
| Cookie/CSRF/sessão | API implementada | `GET /api/v1/auth/session`, `POST /api/v1/auth/logout` |
| Guard ADMIN | API implementada | `GET /api/v1/admin/session`: 200 ADMIN, 403 EDITOR, 401 sem sessão |
| PageTemplate CRUD/validação de blocos reais | Pendente | Não exposto; dados de fixture não passam por persistência |
| Interface Nuxt administrativa | Pendente | `/builder-demo` continua demonstração local, sem API real |

Para experimentar a API no navegador, iniciar o FastAPI e abrir `http://127.0.0.1:8002/docs`. As variáveis `DATABASE_URL`, `REDIS_URL`, `APP_ORIGIN` e `LOGIN_RATE_LIMIT_SECRET` devem estar no ambiente do processo; Uvicorn não lê automaticamente a `.env` da raiz. Para testar pelo Swagger em `127.0.0.1:8002`, usar `APP_ORIGIN=http://127.0.0.1:8002` e um segredo aleatório de pelo menos 32 bytes gerado localmente para `LOGIN_RATE_LIMIT_SECRET`. Não colocar esse segredo em Git. O banco deve já conter um usuário ADMIN ativo com hash Argon2id, criado por fluxo administrativo seguro; não há conta/senha de demonstração. O login exige `Origin` ou `Referer` compatível com `APP_ORIGIN`; operações autenticadas usam o cookie HttpOnly e logout exige `X-CSRF-Token` retornado pelo login/sessão.

Os testes automatizados usam usuário e Redis efêmeros e exercitam o fluxo completo sem tocar em dados existentes. O banco local `portal_fumep` ainda contém `page_templates` não versionada; nenhuma migration Python foi aplicada nele. O próximo trabalho dentro do MIG 5.8 é validar snapshots com IDs reais e fechar dependências de mídia/galeria antes de expor CRUD.
