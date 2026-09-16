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
LOOP 4.3 — ATUAL
```

## Loop atual

### LOOP 4.3 — Validação de imagem

Estado: pronto para execução após commit do 4.2. Upload e vínculo institucional mínimo implementados conforme MEDIA-001 autorizado; gestão completa de categorias continua no 4.13.

Objetivo:

```text
Testar extensão, MIME, magic bytes e tamanho máximo do upload de imagem existente.
```

Implementar:

- reler AGENTS.md, execute-loop, arquitetura de Storage/Segurança e verificar Git limpo;
- reutilizar validateImage e limite existentes, sem duplicar validação;
- testar formatos permitidos e inconsistências de extensão/MIME/assinatura;
- testar truncamentos, nomes/tipos proibidos e fronteira inclusiva de 15 MiB;
- Supertest deve comprovar rejeição antes de gravar storage/metadados;
- checks, documentação, commit e Git limpo.

Não implementar:

- duplicidade, BullMQ/Worker/Sharp/variantes, PDF, gestão completa de categorias, MediaUsage e logos;
- upload direto Browser → MinIO ou armazenamento físico no PostgreSQL.

Critério de aceite:

```text
Extensão, MIME, assinatura e limite máximo comprovados por testes; rejeições não persistem mídia; checks verdes.
```

## Próximo loop

```text
LOOP 4.4 — SHA-256
```
