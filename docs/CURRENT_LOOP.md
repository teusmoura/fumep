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
LOOP 0.12 — ATUAL
```

## Loop atual

### LOOP 0.12 — PostgreSQL

Objetivo:

```text
Completar a configuração inicial do PostgreSQL de desenvolvimento.
```

Implementar:

- container;
- volume;
- healthcheck;
- variável de ambiente.

Não implementar:

- configuração detalhada do Redis, reservada ao loop 0.13;
- configuração detalhada do MinIO, reservada ao loop 0.14;
- modelos, migrations ou funcionalidades de domínio.

Critério de aceite:

```text
API consegue conectar ao PostgreSQL.
```

## Próximo loop

```text
LOOP 0.13 — Redis
```
