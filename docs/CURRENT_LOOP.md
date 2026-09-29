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
- MIG 4.4 — Categorias isoladas da Biblioteca: concluído, 174 testes Python aprovados e 2 integrações opcionais ignoradas.
- **MIG 4.5 — Seleção/reutilização de mídia isolada: loop atual.**

## MIG 4.5 — Seleção/reutilização de mídia isolada

Implementar contrato Python isolado para detectar mídia existente por SHA-256 e oferecer seleção autorizada ou novo envio explícito. Revalidar escopo institucional da mídia/categoria e estado de processamento/deleção antes da seleção. Usar repositório de teste em memória, sem afirmar persistência PostgreSQL. Não adicionar endpoint, UI, upload integrado, Worker ou variantes.

Aceite: duplicata autorizada é oferecida sem bloquear novo envio explícito; mídia estrangeira, global para EDITOR, indisponível ou não pronta nunca é selecionável; seleção não grava novo objeto nem registro; testes/checks verdes, status atualizado e commit criado.

## Próximo loop

**MIG 4.6 — Próxima subfuncionalidade da Biblioteca.** Detalhar após aceite de MIG 4.5, sem antecipar integração entre Nuxt, FastAPI e PostgreSQL.
