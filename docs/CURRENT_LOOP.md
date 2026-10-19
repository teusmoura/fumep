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
- MIG 6-EDITORIAL — categorias editoriais e galerias utilizáveis no Nuxt: concluído, com jornada Playwright/axe no banco dedicado.
- MIG 6-GALLERY-FEED — bloco público conectado à galeria real: concluído com API, SSR e Playwright/axe no banco dedicado.
- **MIG 6-NEWS — primeira notícia publicável: loop atual.**

## MIG 6-NEWS — primeira notícia publicável (atual)

Entregar uma notícia editorial básica de ponta a ponta no banco dedicado: rascunho vinculado a uma ou mais instituições, categoria editorial, capa READY obrigatória somente para publicar, corpo em blocos permitidos para `ARTICLE` dentro da fatia, `ArticleVersion` imutável, listagem/detalhe públicos Nuxt SSR e autorização institucional/CSRF. O aceite exige que a equipe crie, salve, publique e visualize a notícia no navegador anônimo; testes devem cobrir escopo, mídia, snapshot, API, Playwright/axe e checks completos aplicáveis. Agrupar schema, serviço, estados e interface nesta jornada — não abrir um loop para cada camada. Delimitar explicitamente quaisquer blocos/tags/`NEWS_FEED` ainda não implementados, sem apresentá-los como paridade V1.

Consultar a Fase 8 do plano, o documento especializado de Page Builder e o modelo lógico antes de alterar dados. Reutilizar categorias/mídia e a sessão existentes. Não antecipar estágio, busca, migração do banco preexistente nem retirada do Next/Nest. `portal_fumep` segue bloqueado para migrations Python até auditoria/adopção explícita; usar apenas o banco dedicado.

## Próximo loop

**MIG 6 — próximos módulos editoriais/`NEWS_FEED`**, a definir após o aceite da primeira notícia publicável, sem tocar no banco preexistente ou retirar o legado sem decisão explícita.
