# CURRENT LOOP — migração FastAPI + Nuxt

## Estado

- Pilha NestJS/Next.js: loops até 5.30 concluídos; loop 5.31 interrompido sem commit e preservado no stash `b1bba349ce433efb2f4a9b1cb86739a3d004fca8` criado em 2026-09-25.
- Migração aprovada pelo responsável: FastAPI + Nuxt, preservando PostgreSQL, Redis e MinIO.
- Estratégia: aceitar cada funcionalidade isolada antes da integração entre as novas partes.
- MIG 1, MIG 2 e MIG 3.1–3.8: funcionalidades isoladas concluídas; evidências em `docs/LOOP_STATUS.md`.
- Contratos HTTP de autenticação: MVP de login/sessão/guard ADMIN entregue no MIG 5.8; demais integrações continuam na MIG 6.
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
- MIG 5.7 — PageTemplate isolado: concluído, contrato e aplicação de snapshots em rascunho local; sem persistência.
- MIG 5.8 — integração PageTemplate e persistência: parcialmente iniciado (baseline em banco de teste + MVP HTTP de autenticação), suspenso sem aceite enquanto os catálogos reais são concluídos.
- **MIG 5.8-CAT — catálogo editorial funcional: loop atual por reordenação explícita aprovada em 2026-10-05.**

## MIG 5.8-CAT — catálogo editorial funcional (atual)

Entrega completa no FastAPI/PostgreSQL de um catálogo de categorias editoriais real: migration `categories` somente no banco dedicado `portal_fumep_mig58_test`; criar, listar/consultar, alterar e remover via REST/Pydantic; unicidade de slug por escopo; categoria global administrada somente por ADMIN, categoria institucional por ADMIN ou EDITOR atribuído; sessão/CSRF nas mutações; testes de contrato, autorização, persistência e constraints. Não confundir com `media_categories`. Não criar ainda `ArticleCategory` nem usar a base local preexistente `portal_fumep` para migrations. O aceite deve demonstrar um fluxo CRUD executável pelo FastAPI/OpenAPI com PostgreSQL e Redis de teste, sem credenciais ou fixtures persistidas em Git.

MIG 5.8 permanece suspenso, não concluído: sua baseline PageTemplate foi testada apenas em `portal_fumep_mig58_test`, e o MVP de autenticação está em `/api/v1/auth/*` e `/api/v1/admin/session`. CRUD de templates continua fechado até categorias e galerias funcionais, schemas dos 23 blocos e referências reais. O plano canônico 5.31–5.33 continua exigindo CRUD ADMIN e cópia independente do snapshot.

## Próximo loop

**MIG 5.8-GAL — galeria funcional**, com Gallery, GalleryItem, MediaUsage, CRUD/ordenação e projeção REST de `GALLERY_FEED`. Depois, retomar o aceite integral da MIG 5.8 PageTemplate; MIG 6 continua posterior. Ordem e limites em `docs/architecture/MIGRACAO_FASTAPI_NUXT_CANONICA.md`.
