---
name: jobs-worker
description: Implemente filas BullMQ, Workers, jobs idempotentes, retries, agendamentos e observabilidade de jobs do Portal FUMEP.
---

# Jobs Worker

## Filas V1

```text
media
content
integrations
maintenance
```

## Jobs principais

```text
PROCESS_MEDIA
PUBLISH_CONTENT
EXPIRE_CONTENT
REINDEX_SEARCH
INVALIDATE_CACHE
SYNC_SELECTION_PROCESSES
SYNC_CONTESTS
CLEAN_EXPIRED_RESET_TOKENS
```

## Regras

- Worker separado da API;
- retries limitados;
- integração externa com backoff;
- job id/dedupe quando aplicável;
- idempotência;
- falha externa não apaga projeção válida;
- logs estruturados;
- Postgres é fonte de verdade do domínio.

## Testes

Sucesso, repetição, retry, falha permanente e concorrência aplicável.
