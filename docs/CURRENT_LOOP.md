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
LOOP 1.8 — ATUAL
```

## Loop atual

### LOOP 1.8 — PageVersion

Objetivo:

```text
Criar snapshots imutáveis e versionados de páginas.
```

Implementar:

- criar a tabela `page_versions`;
- implementar `id`, `page_id`, `version_number`, `snapshot`, `created_by` e `created_at`;
- usar JSONB para o snapshot e garantir `UNIQUE(page_id, version_number)`;
- vincular a página com exclusão em cascata e autoria opcional;
- testar versionamento, snapshot e imutabilidade da estrutura.

Não implementar:

- restauração automática de versões;
- versionamento individual por bloco;
- endpoints, publicação ou preview;
- entidades e funcionalidades dos próximos loops.

Critério de aceite:

```text
PageVersion preserva snapshots numerados da página sem alterar versões anteriores.
```

## Próximo loop

```text
LOOP 1.9 — AuditLog
```
