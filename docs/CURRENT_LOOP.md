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
LOOP 4.1 — ATUAL
```

## Loop atual

### LOOP 4.1 — Media

Estado: preparado; fase 3 concluída, loop 3.9 com testes de contraste e checks verdes.

Objetivo:

```text
Implementar a tabela Media conforme o modelo e a arquitetura canônicos.
```

Implementar:

- ler o modelo de dados lógico e a arquitetura especializada de Storage/Biblioteca de Mídia;
- usar as skills drizzle-data-model, media-storage e testing-qa conforme o escopo;
- tabela Drizzle e migration com campos essenciais: id, filename, original_filename, mime_type, size, storage_key, checksum_sha256, processing_status, processing_error, created_by e created_at;
- constraints, relações e índices conforme documentos canônicos, sem inventar decisões conflitantes;
- testes aplicáveis e validação da migration, incluindo banco do zero quando aplicável;
- checks disponíveis, status, commit e Git limpo.

Não implementar:

- upload de imagem (4.2), processamento Worker/Sharp, seleção de logos ou demais funcionalidades futuras;
- endpoint/interface de biblioteca não exigido neste loop.

Critério de aceite:

```text
Tabela Media criada conforme documentação canônica, migration aplicável e testes/checks verdes.
```

## Próximo loop

```text
LOOP 4.2 — Upload de imagem
```
