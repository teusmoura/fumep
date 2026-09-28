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
- MIG 3.6 — Logout e leitura de sessão isolados: concluído, 73 testes Python aprovados.
- MIG 3.7 — Rate limiting de login isolado: concluído, 80 testes Python aprovados.
- MIG 3.8 — Contrato de recuperação de senha isolado: concluído, 89 testes Python aprovados.
- **MIG 3.9 — Contratos HTTP de autenticação FastAPI: próximo após commit de MIG 3.8.**

## MIG 3.9 — Contratos HTTP de autenticação FastAPI

Inspecionar os casos de uso MIG 3.1–3.8 e definir/implementar contratos HTTP FastAPI de autenticação somente na medida em que não exponham fluxos incompletos. Login, consulta de sessão, logout, recuperação e reset precisam preservar Redis, cookie HttpOnly, CSRF, rate limiting, autorização, auditoria e persistência reais antes de uma rota de produção. Decidir o adaptador Python de PostgreSQL/migrations antes de escrever no banco existente. Se não houver decisão suficiente, registrar a questão em `docs/ISSUES_ARCHITECTURE.md`, não expor rota insegura e limitar-se ao trabalho independente.

Aceite: contratos HTTP/OpenAPI validados por TestClient sem fixture de usuário em produção; nenhuma rota administrativa retorna sucesso fictício; controles obrigatórios presentes nos fluxos expostos. Checks verdes, status atualizado e commit criado somente se o escopo seguro estiver completo.

## Próximo loop

**MIG 3.10 — Integração Nuxt dos fluxos de autenticação.** Planejar somente após aceite de MIG 3.9 e dados reais testados.
