# CURRENT LOOP — migração FastAPI + Nuxt

## Estado

- Pilha NestJS/Next.js: loops até 5.30 concluídos; loop 5.31 interrompido sem commit e preservado no stash `b1bba349ce433efb2f4a9b1cb86739a3d004fca8` criado em 2026-09-25.
- Migração aprovada pelo responsável: FastAPI + Nuxt, preservando PostgreSQL, Redis e MinIO.
- Estratégia: aceitar cada funcionalidade isolada antes da integração entre as novas partes.
- MIG 1, MIG 2 e MIG 3.1–3.8: funcionalidades isoladas concluídas; evidências em `docs/LOOP_STATUS.md`.
- Contratos HTTP de autenticação: adiados para MIG 6, fase de integração, conforme estratégia canônica; não declarados concluídos.
- MIG 4.1 — Metadados isolados da Biblioteca: concluído em `30639aa`.
- MIG 4.2 — Validação isolada de imagem: concluído, 151 testes Python aprovados e 1 integração Redis opcional ignorada.
- MIG 4.3 — Armazenamento isolado MinIO: concluído, inclusive teste com MinIO real; evidências em `docs/LOOP_STATUS.md`.
- **MIG 4.4 — Categorias da Biblioteca como funcionalidade isolada: loop atual.**

## MIG 4.4 — Categorias da Biblioteca como funcionalidade isolada

Portar as regras de categorias editoriais para Python: nome, vínculo institucional, permissões de ADMIN/EDITOR e seleção apenas de categorias autorizadas. Usar repositório de teste em memória para exercitar a funcionalidade, sem afirmar persistência PostgreSQL. Consultar a arquitetura especializada antes de fechar o contrato. Não adicionar endpoint, upload integrado ou UI nesta fatia.

Aceite: ADMIN opera globalmente; EDITOR apenas no escopo institucional atribuído; categorias inválidas ou fora de escopo são rejeitadas; testes/checks verdes, status atualizado e commit criado.

## Próximo loop

**MIG 4.5 — Seleção/reutilização de mídia isolada.** Detalhar após aceite de MIG 4.4, sem antecipar integração entre Nuxt, FastAPI e PostgreSQL.
