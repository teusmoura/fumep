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
LOOP 4.9 — ATUAL
```

## Loop atual

### LOOP 4.9 — MediaVariant

Estado: pronto para execução após commit do 4.8. Sharp decodifica/verifica original e grava dimensões. Media ainda PENDING, sem variantes.

Objetivo:

```text
Criar MediaVariant e gerar WebP, AVIF e thumbnail no Worker.
```

Implementar:

- reler AGENTS.md, execute-loop e arquitetura de Jobs/Storage/modelo lógico; confirmar 4.8 commitado e Git limpo;
- usar jobs-worker/media-storage/testing-qa conforme o escopo;
- schema/migration/repository MediaVariant, storage_key relativo conforme documento especializado;
- gerar WebP/AVIF/thumbnail segundo política canônica aplicável, sem upscale e preservando original;
- persistir objetos MinIO e metadados PostgreSQL com idempotência/repetição segura;
- manter processamento fora do HTTP e payload sem bytes/credenciais;
- testar variantes/dimensões, imagem pequena, idempotência, falhas e migrations do zero;
- não executar processamento no request NestJS;
- checks, documentação, commit e Git limpo.

Não implementar:

- transições finais do 4.10, PDF, gestão completa de categorias, MediaUsage e logos;
- upload direto Browser → MinIO ou armazenamento físico no PostgreSQL.

Critério de aceite:

```text
WebP/AVIF/thumbnail registrados em MediaVariant e MinIO, sem upscale/perda do original; migrations/testes/checks verdes.
```

## Próximo loop

```text
LOOP 4.10 — Status de processamento
```
