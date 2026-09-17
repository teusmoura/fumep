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
LOOP 4.10 — CONCLUÍDO
LOOP 4.11 — ATUAL
```

## Loop atual

### LOOP 4.11 — Upload de PDF

Estado: pronto para execução após commit do 4.10. Pipeline de imagem com estados persistidos e leitura autorizada concluído. Preservar upload, duplicidade e autorização institucional.

Objetivo:

```text
Implementar upload editorial de PDF de até 30 MB.
```

Implementar:

- reler AGENTS.md, execute-loop e arquitetura de Storage/Segurança; confirmar 4.10 commitado e Git limpo;
- usar jobs-worker/media-storage/testing-qa conforme o escopo;
- validar extensão/MIME/magic bytes e limite de 30 MB no backend;
- salvar original PDF no MinIO com UUID/chave relativa documents/<uuid>.pdf;
- persistir Media DOCUMENT, SHA-256 obrigatório e auditoria, sem enfileirar Sharp;
- preservar escopo institucional/CSRF/duplicidade aplicáveis e contratos OpenAPI/Zod;
- interface administrativa mínima para envio de PDF, sem biblioteca pública independente;
- manter processamento fora do HTTP e payload sem bytes/credenciais;
- testar arquivo válido/inválido, limites, autorização, duplicidade e falhas de storage/persistência;
- não executar processamento no request NestJS;
- checks, documentação, commit e Git limpo.

Não implementar:

- gestão completa de categorias, MediaUsage, logos e biblioteca pública de documentos; não inventar visualizador PDF próprio;
- upload direto Browser → MinIO ou armazenamento físico no PostgreSQL.

Critério de aceite:

```text
PDF de até 30 MB enviado por usuário autorizado, validado e persistido com checksum, sem processamento Sharp; testes/checks verdes.
```

## Próximo loop

```text
LOOP 4.12 — Bloquear SVG editorial
```
