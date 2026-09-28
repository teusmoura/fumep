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
- **MIG 3.5 — Contrato CSRF isolado: próximo após commit de MIG 3.4.**

## MIG 3.5 — Contrato CSRF isolado

Implementar contrato de proteção CSRF para futuras mutações administrativas baseadas em cookie: token imprevisível ligado à sessão, validação do token e de Origin/Referer conforme o documento de segurança. Manter serviço/testes isolados, sem endpoint, middleware global, UI Nuxt ou integração PostgreSQL. GET não altera estado. Evitar registrar token em log ou persistir token puro além do necessário ao vínculo com sessão.

Aceite: token válido e origem autorizada passam; token ausente/incorreto e origem externa falham; cobertura para métodos mutáveis, cookie e cabeçalhos relevantes, sem quebrar API pública existente. Checks verdes, status atualizado e commit criado.

## Próximo loop

**MIG 3.6 — Contrato de logout e leitura de sessão isolados.** Detalhar somente após aceite de MIG 3.5, respeitando ordem e segurança canônicas.
