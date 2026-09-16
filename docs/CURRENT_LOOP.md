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
LOOP 2.15 — ATUAL
```

## Loop atual

### LOOP 2.15 — Reset password

Objetivo:

```text
Implementar a redefinição de senha com token temporário de uso único.
```

Implementar:

- implementar `POST /api/v1/auth/reset-password` com Zod e OpenAPI;
- validar token pelo hash, expiração e estado de consumo;
- gerar hash Argon2id da nova senha com mínimo de 10 caracteres;
- atualizar senha e consumir token atomicamente;
- testar token válido, inválido, expirado e já utilizado.

Não implementar:

- invalidação de sessões após reset (loop 2.16);
- entidades e funcionalidades dos próximos loops.

Critério de aceite:

```text
Token válido redefine a senha uma única vez; tokens inválidos, expirados ou consumidos são rejeitados.
```

## Próximo loop

```text
LOOP 2.16 — Invalidar sessões após reset
```
