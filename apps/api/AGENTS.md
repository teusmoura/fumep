# AGENTS.md — apps/api

Escopo: API NestJS e regras de negócio.

## Regras
- REST + OpenAPI.
- Validar entradas com Zod conforme contratos compartilhados.
- Autorização obrigatória no backend.
- Sessões server-side em Redis; JWT é proibido.
- Controllers finos; regras em services/domain services.
- PostgreSQL via Drizzle; não usar ORM alternativo.
- Não executar jobs pesados dentro do request quando já houver fila definida.
- Nunca retornar segredos, stack traces ou dados internos desnecessários.
- Respeitar `docs/architecture/SEGURANCA_E_CONTROLE_DE_ACESSO.md`.

## Validação
Supertest para endpoints relevantes e Vitest para regras.
