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
LOOP 1.9 — ATUAL
```

## Loop atual

### LOOP 1.9 — AuditLog

Objetivo:

```text
Criar a estrutura inicial de auditoria administrativa.
```

Implementar:

- criar a tabela `audit_logs`;
- implementar `id`, `user_id`, `action`, `entity_type`, `entity_id`, `metadata`, `ip_address` e `created_at`;
- usar JSONB para metadados e INET para endereço IP;
- preservar registros sem exclusão em cascata;
- testar a estrutura inicial.

Não implementar:

- catálogo completo de eventos de auditoria;
- instrumentação de todas as operações;
- endpoints ou interface de consulta;
- entidades e funcionalidades dos próximos loops.

Critério de aceite:

```text
AuditLog registra eventos administrativos básicos sem risco de exclusão em cascata.
```

## Próximo loop

```text
LOOP 1.10 — Redirect
```
