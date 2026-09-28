# CURRENT LOOP — migração FastAPI + Nuxt

## Estado

- Pilha NestJS/Next.js: loops até 5.30 concluídos; loop 5.31 interrompido sem commit e preservado no stash `b1bba349ce433efb2f4a9b1cb86739a3d004fca8` criado em 2026-09-25.
- Migração aprovada pelo responsável: FastAPI + Nuxt, preservando PostgreSQL, Redis e MinIO.
- Estratégia: aceitar cada funcionalidade isolada antes da integração entre as novas partes.
- MIG 1 — Páginas institucionais Nuxt: concluído, checks verdes (549 testes).
- MIG 2 — API FastAPI básica isolada: concluído, 6 testes Python e HTTP real aprovados.
- MIG 3.1 — Sessão Redis e contrato de cookie: concluído, 17 testes Python incluindo Redis real.
- MIG 3.2 — Política de senha/credenciais Argon2id: concluído, 28 testes Python aprovados.
- **MIG 3.3 — Fluxo de login isolado: próximo após commit de MIG 3.2.**

## MIG 3.3 — Fluxo de login isolado

Implementar o caso de uso de login no backend FastAPI como serviço isolado: repositório de usuário por contrato/injeção (test double somente em testes), verificação de hash Argon2id, estado ativo, vínculo institucional e criação de sessão Redis pelo componente MIG 3.1. Respostas de falha não devem diferenciar usuário inexistente, senha incorreta ou conta inativa. Não criar usuário fictício de produção, endpoint HTTP, acesso PostgreSQL, guard ou tela Nuxt nesta subfatia; integração posterior não é simulada como persistência.

Aceite: serviço autentica somente conta ativa com hash válido, cria sessão opaca contendo identidade e escopo institucional mínimo, falha de forma uniforme sem criar sessão, testes verdes com repositório injetado e Redis simulado/real conforme disponibilidade. Atualizar status e commitar somente após aceite.

## Próximo loop

**MIG 3.4 — Autorização institucional e papéis em serviço isolado.** Consultar os documentos canônicos de segurança e o modelo lógico antes de detalhar o próximo escopo.
