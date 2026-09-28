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
- MIG 3.4 — Autorização institucional e papéis: concluído, 45 testes Python aprovados.
- MIG 3.5 — Contrato CSRF isolado: concluído, 66 testes Python aprovados.
- **MIG 3.6 — Logout e leitura de sessão isolados: próximo após commit de MIG 3.5.**

## MIG 3.6 — Logout e leitura de sessão isolados

Implementar casos de uso isolados para leitura de sessão e logout sobre Redis: leitura retorna apenas projeção pública mínima ao cliente autenticado; logout remove a sessão e prepara expiração do cookie. Cobrir sessão ausente/expirada, logout idempotente e falha de Redis sem fallback. Não adicionar endpoint, guard, PostgreSQL ou UI Nuxt nesta fatia.

Aceite: leitura válida/ausente e logout válido/repetido têm comportamento testado; dados sensíveis não aparecem na projeção; cookie é expirado com atributos corretos; checks verdes, status atualizado e commit criado.

## Próximo loop

**MIG 3.7 — Rate limiting de login isolado.** Detalhar somente após aceite de MIG 3.6, respeitando ordem e segurança canônicas.
