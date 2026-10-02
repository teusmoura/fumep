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
- MIG 4.10 — Uso e exclusão de mídia como fluxo isolado: concluído, 262 testes Python aprovados; fixture de estado, sem endpoint/UI ou PostgreSQL.
- MIG 5.1 — Page Builder básico de páginas isolado: concluído, editor demonstrativo Nuxt/SSR e checks completos aprovados; sem persistência.
- MIG 5.2 — Composição editorial avançada isolada: concluído, quatro blocos novos no editor/SSR e checks completos aprovados; sem persistência.
- MIG 5.3 — FAQ, TABS e TABLE como conjunto editorial isolado: concluído, dez blocos válidos no editor/SSR e checks completos aprovados; sem persistência.
- MIG 5.4 — TIMELINE, STATISTICS e CAROUSEL como conjunto isolado: concluído, treze blocos válidos no editor/SSR e checks aprovados; sem persistência.
- MIG 5.5 — MAP, VIDEO e DOCUMENT como recursos externos controlados: concluído, dezesseis blocos válidos no editor/SSR e PDF local de fixture; sem Media Library real.
- MIG 5.6 — catálogo demonstrativo do registry V1: concluído, 23 tipos canônicos registrados e validados em Nuxt; feeds ainda em fixture.
- **MIG 5.7 — PageTemplate isolado: loop atual.**

## MIG 5.7 — PageTemplate isolado

Implementar um fluxo isolado e demonstrável de PageTemplate (snapshot de blocos, escopo global/institucional, aplicação em rascunho local) conforme Page Builder canônico e plano loops 5.31–5.32, mantendo a fronteira de migração. Antes de escolher persistência, consultar a decisão canônica de ORM/migrations Python; não escrever no PostgreSQL existente nem reivindicar CRUD persistido sem essa decisão. Não integrar FastAPI, publicar páginas ou remover o legado.

Aceite: contrato e aplicação de template demonstráveis sem mutar fixture original, escopo validado, snapshot completo validado pelo registry, testes de rejeição e smoke SSR/a11y se houver interface. Documentar explicitamente o que ainda depende de persistência/autorização backend. Checks aplicáveis, status e commit.

## Próximo loop

**MIG 5.8 — integração PageTemplate e persistência.** Detalhar somente após decisão de ORM/migrations Python e fronteira de integração autorizada; não antecipar no MIG 5.7.
