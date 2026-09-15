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
LOOP 2.2 — ATUAL
```

## Loop atual

### LOOP 2.2 — Login

Objetivo:

```text
Implementar o endpoint de login da API.
```

Implementar:

- implementar `POST /api/v1/auth/login`;
- validar as credenciais de usuário ativo;
- usar o serviço Argon2id existente;
- criar a abstração mínima de sessão necessária ao contrato do login;
- testar credenciais válidas e inválidas.

Não implementar:

- implementação Redis da sessão, reservada ao loop 2.3;
- recuperação de senha;
- guards e autorização institucional;
- entidades e funcionalidades dos próximos loops.

Critério de aceite:

```text
Credenciais válidas criam sessão pelo endpoint de login e credenciais inválidas são rejeitadas.
```

## Próximo loop

```text
LOOP 2.3 — Sessão Redis
```
