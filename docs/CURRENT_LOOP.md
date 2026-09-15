# CURRENT LOOP

## Estado

```text
LOOP 0.1 — CONCLUÍDO
LOOP 0.2 — CONCLUÍDO
LOOP 0.3 — CONCLUÍDO
LOOP 0.4 — CONCLUÍDO
LOOP 0.5 — CONCLUÍDO
LOOP 0.6 — CONCLUÍDO
LOOP 0.7 — CONCLUÍDO
LOOP 0.8 — CONCLUÍDO
LOOP 0.9 — CONCLUÍDO
LOOP 0.10 — CONCLUÍDO
LOOP 0.11 — CONCLUÍDO
LOOP 0.12 — CONCLUÍDO
LOOP 0.13 — CONCLUÍDO
LOOP 0.14 — CONCLUÍDO
LOOP 0.15 — CONCLUÍDO
LOOP 0.16 — CONCLUÍDO
LOOP 0.17 — CONCLUÍDO
LOOP 1.1 — CONCLUÍDO
LOOP 1.2 — CONCLUÍDO
LOOP 1.3 — CONCLUÍDO
LOOP 1.4 — CONCLUÍDO
LOOP 1.5 — CONCLUÍDO
LOOP 1.6 — CONCLUÍDO
LOOP 1.7 — CONCLUÍDO
LOOP 1.8 — CONCLUÍDO
LOOP 1.9 — CONCLUÍDO
LOOP 1.10 — CONCLUÍDO
LOOP 2.1 — CONCLUÍDO
LOOP 2.2 — CONCLUÍDO
LOOP 2.3 — CONCLUÍDO
LOOP 2.4 — CONCLUÍDO
LOOP 2.5 — CONCLUÍDO
LOOP 2.6 — CONCLUÍDO
LOOP 2.7 — ATUAL
```

## Loop atual

### LOOP 2.7 — RoleGuard

Objetivo:

```text
Restringir endpoints autenticados conforme o papel administrativo exigido.
```

Implementar:

- implementar `RoleGuard` no NestJS;
- declarar metadados de papéis permitidos por endpoint;
- suportar os papéis canônicos `ADMIN` e `EDITOR`;
- aplicar o guard após o `SessionGuard` em um endpoint de prova;
- testar papel permitido e papel rejeitado.

Não implementar:

- `InstitutionGuard`;
- recuperação de senha;
- entidades e funcionalidades dos próximos loops.

Critério de aceite:

```text
Endpoint protegido por papel aceita usuário autorizado e rejeita papel não permitido.
```

## Próximo loop

```text
LOOP 2.8 — InstitutionGuard
```
