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
LOOP 2.15 — CONCLUÍDO
LOOP 2.16 — CONCLUÍDO
LOOP 3.1 — CONCLUÍDO
LOOP 3.2 — CONCLUÍDO
LOOP 3.3 — CONCLUÍDO
LOOP 3.4 — CONCLUÍDO
LOOP 3.5 — CONCLUÍDO
LOOP 3.6 — CONCLUÍDO
LOOP 3.7 — CONCLUÍDO
LOOP 3.8 — CONCLUÍDO
LOOP 3.9 — CONCLUÍDO
LOOP 4.1 — CONCLUÍDO
LOOP 4.2 — CONCLUÍDO
LOOP 4.3 — CONCLUÍDO
LOOP 4.4 — CONCLUÍDO
LOOP 4.5 — CONCLUÍDO
LOOP 4.6 — CONCLUÍDO
LOOP 4.7 — CONCLUÍDO
LOOP 4.8 — CONCLUÍDO
LOOP 4.9 — CONCLUÍDO
LOOP 4.10 — ATUAL
```

## Loop atual

### LOOP 4.10 — Status de processamento

Estado: pronto para execução após commit do 4.9. Worker gera variantes WebP/AVIF e thumbnail compartilhada, sem upscale. Media ainda PENDING; estados finais são o escopo atual.

Objetivo:

```text
Cobrir PENDING, PROCESSING, READY e FAILED no pipeline de processamento.
```

Implementar:

- reler AGENTS.md, execute-loop e arquitetura de Jobs/Storage/modelo lógico; confirmar 4.9 commitado e Git limpo;
- usar jobs-worker/media-storage/testing-qa conforme o escopo;
- transições no Worker: PENDING/FAILED → PROCESSING → READY somente após derivados persistidos;
- FAILED/processing_error sanitizado em erro permanente ou tentativas exauridas, com auditoria aplicável;
- repetição segura, preservação do original/variantes válidas e logs estruturados;
- contratos/projeções de estado observáveis sem vazar detalhes internos ao Editor;
- manter processamento fora do HTTP e payload sem bytes/credenciais;
- testar sucesso, falha permanente/temporária/exaurida, repetição e estados persistidos;
- não executar processamento no request NestJS;
- checks, documentação, commit e Git limpo.

Não implementar:

- PDF do 4.11, gestão completa de categorias, MediaUsage e logos; não inventar outbox/tabelas auxiliares;
- upload direto Browser → MinIO ou armazenamento físico no PostgreSQL.

Critério de aceite:

```text
Estados PENDING/PROCESSING/READY/FAILED coerentes com o pipeline, erro seguro e testes/checks verdes.
```

## Próximo loop

```text
LOOP 4.11 — Upload de PDF
```
