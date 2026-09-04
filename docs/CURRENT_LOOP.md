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
LOOP 0.13 — ATUAL
```

## Loop atual

### LOOP 0.13 — Redis

Objetivo:

```text
Completar a configuração inicial do Redis de desenvolvimento.
```

Implementar:

- container;
- autenticação quando aplicável;
- persistência;
- healthcheck;

Não implementar:

- configuração detalhada do MinIO, reservada ao loop 0.14;
- sessões, filas BullMQ ou cache da aplicação.

Critério de aceite:

```text
API consegue executar `PING` no Redis.
```

## Próximo loop

```text
LOOP 0.14 — MinIO
```
