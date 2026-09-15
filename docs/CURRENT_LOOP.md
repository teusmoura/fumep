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
LOOP 2.3 — ATUAL
```

## Loop atual

### LOOP 2.3 — Sessão Redis

Objetivo:

```text
Robustecer e validar o ciclo de vida da sessão server-side Redis iniciado no login.
```

Implementar:

- tornar configuráveis os limites de inatividade de 30 minutos e duração absoluta de 8 horas;
- consolidar criação e persistência do payload de sessão no Redis;
- validar flags do cookie em desenvolvimento e produção;
- testar expiração, payload e encerramento seguro do cliente Redis.

Não implementar:

- `GET /api/v1/auth/session`, reservado ao loop 2.4;
- logout, reservado ao loop 2.5;
- recuperação de senha;
- guards e autorização institucional;
- entidades e funcionalidades dos próximos loops.

Critério de aceite:

```text
Sessão permanece exclusivamente server-side no Redis, com limites temporais e cookie canônicos validados.
```

## Próximo loop

```text
LOOP 2.4 — GET session
```
