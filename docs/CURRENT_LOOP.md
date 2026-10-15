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
- MIG 5.8 — integração PageTemplate e persistência: começou com baseline em banco de teste + MVP HTTP de autenticação; foi suspenso para concluir os catálogos reais e depois retomado (aceite registrado abaixo).
- MIG 5.8-CAT — catálogo editorial funcional: concluído no banco de teste dedicado, CRUD REST com autorização institucional/CSRF e checks aprovados.
- MIG 5.8-GAL — galeria funcional: concluído em banco de teste dedicado, com CRUD/itens/MediaUsage/projeção REST autenticada e checks aprovados.
- MIG 5.8 — PageTemplate integrado: concluído no banco de teste dedicado, com validação dos 23 blocos, CRUD ADMIN e cópia independente para Page DRAFT; evidências em `docs/LOOP_STATUS.md`.
- MIG 6 — primeira jornada de página Nuxt/FastAPI: aceita no banco de demonstração com Playwright/axe, sem paridade V1.
- MIG 6-MEDIA — Biblioteca de Mídia integrada em FastAPI/Nuxt: concluída no banco local dedicado, inclusive Worker, exclusão, Playwright/axe; diferenças para o Next registradas em `docs/MVP_MEDIA_LIBRARY.md`.
- **MIG 6-EDITORIAL — categorias editoriais e galerias utilizáveis no Nuxt: loop atual.**

## MIG 6-EDITORIAL — categorias editoriais e galerias na interface (atual)

Conectar ao Nuxt os catálogos FastAPI/PostgreSQL já aceitos de categoria editorial e galeria. Entregar jornadas de navegador para criar/consultar/editar/excluir categoria e galeria, gerenciar itens ordenados com imagens READY da Biblioteca e visualizar a projeção do `GALLERY_FEED`. Manter sessão/CSRF, autorização institucional no backend, estados de erro, testes proporcionais e Playwright/axe. Os testes devem mostrar uma jornada persistida completa no banco dedicado, não apenas contratos. Não antecipar artigos, estágio, busca, publicação de feeds ou retirada do legado.

O editor `/builder-demo` permanece fixture; a jornada real de páginas está em `/admin/pages` e a Biblioteca em `/admin/media`. A base preexistente `portal_fumep` segue bloqueada para migrations Python porque contém `page_templates` não versionada; manter testes no banco dedicado até auditoria/adopção explícita. Next/Nest permanecem congelados como referência até paridade testada ou nova decisão explícita do responsável.

## Próximo loop

**MIG 6 — próximos módulos editoriais e integração pública**, após aceite das categorias/galerias na interface. Definir sua fronteira funcional com base no plano canônico e nas lacunas restantes, sem retirar o legado nem tocar no banco preexistente sem decisão explícita.
