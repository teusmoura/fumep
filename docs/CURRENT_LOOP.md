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
LOOP 2.7 — CONCLUÍDO
LOOP 2.8 — CONCLUÍDO
LOOP 2.9 — CONCLUÍDO
LOOP 2.10 — CONCLUÍDO
LOOP 2.11 — CONCLUÍDO
LOOP 2.12 — CONCLUÍDO
LOOP 2.13 — CONCLUÍDO
LOOP 2.14 — CONCLUÍDO
LOOP 2.15 — CONCLUÍDO
LOOP 2.16 — CONCLUÍDO
LOOP 3.1 — ATUAL
```

## Loop atual

### LOOP 3.1 — CRUD administrativo de Institution

Objetivo:

```text
Disponibilizar CRUD administrativo de instituições exclusivamente para ADMIN.
```

Implementar:

- listar, consultar, criar, atualizar e excluir Institution por REST/OpenAPI;
- reutilizar repository Drizzle existente e contratos Zod compartilhados;
- SessionGuard, RoleGuard ADMIN e CSRF nas mutações;
- validar UUID, campos, unicidade de slug e dependências na exclusão;
- testar CRUD, validação, 401, 403 e CSRF.

Não implementar:

- entidades e funcionalidades dos próximos loops.

Critério de aceite:

```text
ADMIN opera o CRUD; EDITOR e visitantes não acessam; entradas inválidas e conflitos são tratados sem detalhes internos.
```

## Próximo loop

```text
LOOP 3.2 — InstitutionSetting
```
