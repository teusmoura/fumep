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
LOOP 2.4 — ATUAL
```

## Loop atual

### LOOP 2.4 — GET session

Objetivo:

```text
Implementar a consulta da sessão autenticada atual.
```

Implementar:

- implementar `GET /api/v1/auth/session`;
- ler o identificador do cookie `fumep_session`;
- consultar e validar a sessão server-side no Redis;
- rejeitar sessão ausente, inválida ou expirada;
- testar sessão válida e não autenticada.

Não implementar:

- logout, reservado ao loop 2.5;
- recuperação de senha;
- guards e autorização institucional;
- entidades e funcionalidades dos próximos loops.

Critério de aceite:

```text
Sessão válida pode ser consultada sem expor seu identificador ou dados internos desnecessários.
```

## Próximo loop

```text
LOOP 2.5 — Logout
```
