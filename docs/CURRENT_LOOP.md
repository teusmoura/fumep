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
- **MIG 3.8 — Contrato de recuperação de senha isolado: próximo após commit de MIG 3.7.**

## MIG 3.8 — Contrato de recuperação de senha isolado

Implementar contratos isolados de solicitação e consumo de token de recuperação de senha: resposta neutra para conta existente/inexistente, token aleatório de uso único com validade de 30 minutos e somente hash persistível; senha nova segue Argon2id. Usar repositórios/provedores injetados com test doubles apenas nos testes, sem criar endpoint, conexão PostgreSQL, envio de e-mail real ou UI. Definir limites de transação/invalidação de sessões conforme documento especializado antes de codificar, sem fingir atomicidade inexistente.

Aceite: existência da conta não vaza; token é aleatório, só hash vai ao repositório, expira e não reutiliza; redefinição exige senha válida e invalidação de sessões, com testes de falha e documentação dos limites da implementação isolada. Checks verdes, status atualizado e commit criado.

## Próximo loop

**MIG 3.9 — Contratos HTTP de autenticação FastAPI.** Detalhar somente após aceite de MIG 3.8, preservando controles de segurança e sem integrar Nuxt ainda.
