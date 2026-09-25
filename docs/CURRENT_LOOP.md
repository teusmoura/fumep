# CURRENT LOOP — migração FastAPI + Nuxt

## Estado

- Pilha NestJS/Next.js: loops até 5.30 concluídos; loop 5.31 interrompido sem commit e preservado no stash `b1bba349ce433efb2f4a9b1cb86739a3d004fca8` criado em 2026-09-25.
- Migração aprovada pelo responsável: FastAPI + Nuxt, preservando PostgreSQL, Redis e MinIO.
- Estratégia: aceitar cada funcionalidade isolada antes da integração entre as novas partes.
- MIG 1 — Páginas institucionais Nuxt: concluído, checks verdes (549 testes).
- MIG 2 — API FastAPI básica isolada: concluído, 6 testes Python e HTTP real aprovados.
- MIG 3.1 — Sessão Redis e contrato de cookie: concluído, 17 testes Python incluindo Redis real.
- **MIG 3.2 — Política de senha/credenciais Argon2id: próximo após commit de MIG 3.1.**

## MIG 3.2 — Política de senha/credenciais Argon2id

Implementar a política de senha mínima de 10 caracteres, hashing e verificação Argon2id em Python, contratos Pydantic de entrada de credenciais e testes para senha válida/inválida, hash não reversível e ausência de vazamento. Não criar usuário fictício de produção, endpoint de login, guard, conexão PostgreSQL ou tela Nuxt nesta subfatia.

Aceite: contratos rejeitam entrada inválida; hashing/verificação Argon2id funcionam com parâmetros documentados e testes verdes; nenhuma credencial é registrada ou persistida fora do hash. Atualizar status e commitar somente após aceite.

## Próximo loop

**MIG 3.3 — Login com repositório de usuário e sessão Redis.** Consultar `docs/architecture/MIGRACAO_FASTAPI_NUXT_CANONICA.md` e o documento de segurança.
