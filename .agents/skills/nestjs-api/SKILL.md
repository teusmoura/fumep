---
name: nestjs-api
description: Implemente endpoints, services, guards e contratos REST do backend NestJS do Portal FUMEP.
---

# NestJS API

1. Confirme o loop atual.
2. Leia `apps/api/AGENTS.md`.
3. Leia o documento de arquitetura do domínio afetado.
4. Reuse schemas Zod compartilhados.
5. Mantenha controller fino.
6. Coloque regra de negócio em service apropriado.
7. Faça autorização no backend.
8. Documente endpoints OpenAPI.
9. Adicione testes Supertest quando houver endpoint.
10. Rode lint/typecheck/test/build disponíveis.

Não:
- usar JWT;
- acessar MinIO ou Redis por código duplicado fora de adapters/services;
- inventar DTO incompatível com schemas compartilhados.
