# CURRENT LOOP — migração FastAPI + Nuxt

## Estado

- Pilha NestJS/Next.js: loops até 5.30 concluídos; loop 5.31 interrompido sem commit e preservado no stash `b1bba349ce433efb2f4a9b1cb86739a3d004fca8` criado em 2026-09-25.
- Migração aprovada pelo responsável: FastAPI + Nuxt, preservando PostgreSQL, Redis e MinIO.
- Estratégia: aceitar cada funcionalidade isolada antes da integração entre as novas partes.
- MIG 1 — Páginas institucionais Nuxt: concluído, checks verdes (549 testes).
- **MIG 2 — API FastAPI básica isolada: próximo após commit de MIG 1.**

## MIG 2 — API FastAPI básica isolada

Criar um aplicativo FastAPI independente com health e projeção pública institucional (`fumep`, `etmsl`, `cramam`), modelos Pydantic/OpenAPI e testes pytest/TestClient. Usar dados locais explicitamente provisórios; não conectar Nuxt, PostgreSQL, Redis ou MinIO neste loop. Não antecipar autenticação nem CRUD.

Aceite: health responde sem vazar detalhes internos; projeção retorna somente campos públicos e 404 para instituição desconhecida; OpenAPI contém os contratos; testes Python e checks aplicáveis passam. Atualizar status e commitar somente após aceite.

## Próximo loop

**MIG 3 — Autenticação e autorização isoladas.** Consultar `docs/architecture/MIGRACAO_FASTAPI_NUXT_CANONICA.md`.
