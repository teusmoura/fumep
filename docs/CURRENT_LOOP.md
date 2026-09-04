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
LOOP 0.11 — ATUAL
```

## Loop atual

### LOOP 0.11 — Configurar Docker Compose de desenvolvimento

Objetivo:

```text
Criar a primeira composição local de infraestrutura do projeto.
```

Implementar:

- `docker-compose.dev.yml`;
- serviço PostgreSQL;
- serviço Redis;
- serviço MinIO.

Não implementar:

- configuração detalhada de conexão e healthcheck do PostgreSQL, reservada ao loop 0.12;
- configuração detalhada de autenticação, persistência e healthcheck do Redis, reservada ao loop 0.13;
- bucket inicial e healthcheck do MinIO, reservados ao loop 0.14;
- containers da API, web ou Worker.

Critério de aceite:

```text
postgres, redis e minio
→ todos sobem
```

## Próximo loop

```text
LOOP 0.12 — PostgreSQL
```
