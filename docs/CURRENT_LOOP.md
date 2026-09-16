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
LOOP 4.6 — ATUAL
```

## Loop atual

### LOOP 4.6 — BullMQ

Estado: pronto para execução após commit do 4.5. Upload, checksum e escolhas de duplicidade concluídos. Preservar autoria/escopo institucional e seleção sem novo upload.

Objetivo:

```text
Implementar a fila BullMQ `media` conforme arquitetura de Jobs, preservando Worker separado.
```

Implementar:

- reler AGENTS.md, execute-loop e arquitetura de Jobs/Storage; confirmar 4.5 commitado e Git limpo;
- usar jobs-worker/media-storage/testing-qa conforme o escopo;
- fila media com conexão Redis interna e configuração/retries/retention canônicos aplicáveis;
- adapter/provedor reutilizável e lifecycle seguro, sem duplicar conexões ad hoc;
- testar fila/configuração/conectividade e encerramento com infraestrutura local;
- não executar processamento no request NestJS;
- checks, documentação, commit e Git limpo.

Não implementar:

- handler PROCESS_MEDIA/processamento Sharp/variantes dos loops seguintes, PDF, gestão completa de categorias, MediaUsage e logos;
- upload direto Browser → MinIO ou armazenamento físico no PostgreSQL.

Critério de aceite:

```text
Fila media configurada e verificável com Redis, sem antecipar o processamento do Worker; testes/checks verdes.
```

## Próximo loop

```text
LOOP 4.7 — PROCESS_MEDIA
```
