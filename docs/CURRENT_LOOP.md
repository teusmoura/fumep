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
- MIG 4.5 — Duplicidade/seleção isoladas: concluído, 191 testes Python aprovados e 2 integrações opcionais ignoradas.
- MIG 4.6 — Validação e armazenamento PDF isolados: concluído, 220 testes Python aprovados, integração MinIO real aprovada e 1 integração Redis opcional ignorada.
- MIG 4.7 — Publicação isolada de PROCESS_MEDIA em Redis: concluído, 228 testes Python aprovados com Redis e MinIO reais.
- MIG 4.8 — Worker Python e inspeção isolada do original: concluído, 242 testes Python aprovados com Redis e MinIO reais.
- MIG 4.9 — Processamento de imagem completo e isolado: concluído, 253 testes Python aprovados com Redis e MinIO reais; estado/variantes ainda em fixture.
- **MIG 4.10 — Uso e exclusão de mídia como fluxo isolado: loop atual.**

## MIG 4.10 — Uso e exclusão de mídia como fluxo isolado

Entregar um fluxo isolado de vínculo/desvínculo de uso e exclusão segura: mídia em uso ou PROCESSING não pode ser excluída; mídia elegível registra intenção antes do job, fica indisponível para novos usos e o Worker remove variantes/original/metadados de forma idempotente, com retry limitado e falhas preservadas. Usar repositório injetado/fixture explícita e MinIO real nos testes. Consultar MEDIA-002, Storage §§55.1–55.5 e Jobs §6.1 antes de implementar; não alegar durabilidade PostgreSQL onde houver apenas fixture.

Aceite: vínculo cria bloqueio real na regra de exclusão; desvínculo libera quando elegível; falhas parciais e repetição não removem mídia em uso nem perdem a intenção; testes/checks verdes, status atualizado e commit criado. Sem endpoint/UI e sem escrita no schema PostgreSQL existente antes da decisão ORM/migrations.

## Próximo loop

**MIG 5 — Page Builder por funcionalidade completa.** Detalhar após aceite de MIG 4.10; não antecipar integração entre Nuxt, FastAPI e PostgreSQL.
