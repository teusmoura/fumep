# CURRENT LOOP — migração FastAPI + Nuxt

## Estado

- Pilha NestJS/Next.js: loops até 5.30 concluídos; loop 5.31 interrompido sem commit e preservado no stash `b1bba349ce433efb2f4a9b1cb86739a3d004fca8` criado em 2026-09-25.
- Migração aprovada pelo responsável: FastAPI + Nuxt, preservando PostgreSQL, Redis e MinIO.
- Estratégia: aceitar cada funcionalidade isolada antes da integração entre as novas partes.
- MIG 1 — Páginas institucionais Nuxt: concluído, checks verdes (549 testes).
- MIG 2 — API FastAPI básica isolada: concluído, 6 testes Python e HTTP real aprovados.
- MIG 3.1 — Sessão Redis e contrato de cookie: concluído, 17 testes Python incluindo Redis real.
- MIG 3.2 — Política de senha/credenciais Argon2id: concluído, 28 testes Python aprovados.
- MIG 3.3 — Fluxo de login isolado: concluído, 36 testes Python aprovados.
- **MIG 3.4 — Autorização institucional e papéis: próximo após commit de MIG 3.3.**

## MIG 3.4 — Autorização institucional e papéis

Implementar política isolada de autorização backend para papéis ADMIN/EDITOR e escopo por instituição: ADMIN global, EDITOR restrito às instituições atribuídas, conteúdo multi-institucional exigindo todas as atribuições. Partir dos contratos de sessão existentes, sem endpoint, guard HTTP, PostgreSQL ou UI; não usar controles de frontend como autorização. Consultar o documento especializado e o modelo lógico antes de codificar.

Aceite: operações de exemplo ADMIN-only e EDITOR scoped têm decisão correta, incluindo Editor ETMSL sem acesso CRAMAM e Editor parcial sem acesso a conteúdo compartilhado. Testes de negação e aprovação verdes; status atualizado e commit criado.

## Próximo loop

**MIG 3.5 — Contrato de proteção CSRF isolado.** Detalhar somente após aceite de MIG 3.4, respeitando ordem e segurança canônicas.
