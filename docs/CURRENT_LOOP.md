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
LOOP 1.7 — ATUAL
```

## Loop atual

### LOOP 1.7 — ContentBlock

Objetivo:

```text
Criar a estrutura de blocos de conteúdo polimórficos.
```

Implementar:

- criar a tabela `content_blocks`;
- implementar `id`, `owner_type`, `owner_id`, `type`, `position`, `is_visible`, `schema_version`, `background`, `background_media_id`, `anchor`, `data`, `created_at` e `updated_at`;
- usar JSONB para `data`;
- testar a estrutura e seus defaults aplicáveis.

Não implementar:

- PageVersion ou snapshots;
- catálogo completo de blocos, renderização, edição, preview ou publicação;
- entidades e funcionalidades dos próximos loops.

Critério de aceite:

```text
ContentBlock pode armazenar dados estruturados e ordenados para um proprietário.
```

## Próximo loop

```text
LOOP 1.8 — PageVersion
```
