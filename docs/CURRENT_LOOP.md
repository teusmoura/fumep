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
LOOP 4.7 — ATUAL
```

## Loop atual

### LOOP 4.7 — PROCESS_MEDIA

Estado: pronto para execução após commit do 4.6. Fila media configurada e verificada com Redis real. Preservar upload, checksum, autorização e escolhas de duplicidade.

Objetivo:

```text
Worker separado recebe job PROCESS_MEDIA da fila media.
```

Implementar:

- reler AGENTS.md, execute-loop e arquitetura de Jobs/Storage; confirmar 4.6 commitado e Git limpo;
- usar jobs-worker/media-storage/testing-qa conforme o escopo;
- contrato mínimo PROCESS_MEDIA com referência Media.id, sem bytes/credenciais no payload;
- enfileiramento após persistência, sem apagar original ou Media caso Redis falhe;
- consumidor apps/worker com validação, logs estruturados seguros e shutdown;
- testar recepção real, payload inválido, repetição e falhas/retries aplicáveis;
- não executar processamento no request NestJS;
- checks, documentação, commit e Git limpo.

Não implementar:

- processamento Sharp/variantes e transições finais do processamento dos loops seguintes, PDF, gestão completa de categorias, MediaUsage e logos;
- upload direto Browser → MinIO ou armazenamento físico no PostgreSQL.

Critério de aceite:

```text
Worker recebe PROCESS_MEDIA com referência validada, sem antecipar Sharp/variantes; testes/checks verdes.
```

## Próximo loop

```text
LOOP 4.8 — Sharp
```
