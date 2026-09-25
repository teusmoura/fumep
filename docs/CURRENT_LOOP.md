# CURRENT LOOP — migração FastAPI + Nuxt

## Estado

- Pilha NestJS/Next.js: loops até 5.30 concluídos; loop 5.31 interrompido sem commit e preservado no stash `b1bba349ce433efb2f4a9b1cb86739a3d004fca8` criado em 2026-09-25.
- Migração aprovada pelo responsável: FastAPI + Nuxt, preservando PostgreSQL, Redis e MinIO.
- Estratégia: aceitar cada funcionalidade isolada antes da integração entre as novas partes.
- MIG 1 — Páginas institucionais Nuxt: concluído, checks verdes (549 testes).
- MIG 2 — API FastAPI básica isolada: concluído, 6 testes Python e HTTP real aprovados.
- **MIG 3.1 — Sessão Redis e contrato de cookie: próximo após commit de MIG 2.**

## MIG 3.1 — Sessão Redis e contrato de cookie

Implementar somente o armazenamento de sessão server-side no Redis e o contrato seguro de cookie para a API FastAPI. Preservar os limites de 30 minutos de inatividade e 8 horas absolutas do documento de segurança. Não implementar login, recuperação de senha, autorização de instituição, integração Nuxt ou CRUD nesta subfatia. Testar criação/leitura/expiração/invalidação, cookie HttpOnly/SameSite e ausência de JWT/credenciais em armazenamento do navegador. Usar Redis local de teste; não tocar dados de produção.

Aceite: sessão opaca armazenada apenas no Redis com expiração correta, cookie seguro e testes verdes; API pública de MIG 2 continua funcionando. Atualizar status e commitar somente após aceite.

## Próximo loop

**MIG 3.2 — Login e autorização isolados.** Consultar `docs/architecture/MIGRACAO_FASTAPI_NUXT_CANONICA.md` e o documento de segurança.
