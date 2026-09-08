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
LOOP 1.3 — ATUAL
```

## Loop atual

### LOOP 1.3 — User

Objetivo:

```text
Implementar a entidade base de usuário administrativo.
```

Implementar:

- tabela `users`;
- campos `id`, `name`, `email`, `password_hash`, `role`, `is_active`, `created_at` e `updated_at`.

Não implementar:

- login;
- sessão ou autenticação;
- relação entre usuários e instituições.

Critério de aceite:

```text
Tabela e modelagem de usuário validadas por migration e testes aplicáveis.
```

## Próximo loop

```text
LOOP 1.4 — UserInstitution
```
