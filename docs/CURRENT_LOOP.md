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
- **MIG 3.7 — Rate limiting de login isolado: próximo após commit de MIG 3.6.**

## MIG 3.7 — Rate limiting de login isolado

Implementar política isolada de limite de tentativas de login usando Redis: 5 tentativas por minuto por IP, controle complementar por conta/e-mail normalizado e resposta neutra sem revelar existência de usuário. Tratar concorrência e expiração com operação atômica; falha do Redis deve falhar fechado. Sem conectar endpoint/login HTTP nem criar bloqueio permanente de conta nesta fatia. Consultar o documento de segurança antes de implementar.

Aceite: limites por IP e conta, janelas/retry e concorrência testados; não registrar e-mail/IP em texto puro em chave Redis; erro de infraestrutura não libera tentativas. Checks verdes, status atualizado e commit criado.

## Próximo loop

**MIG 3.8 — Contrato de recuperação de senha isolado.** Detalhar somente após aceite de MIG 3.7, respeitando ordem e segurança canônicas.
