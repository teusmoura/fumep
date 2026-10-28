# Migração canônica V1 — FastAPI + Nuxt

## Decisão e precedência

Em 2026-09-25, o responsável pelo Portal FUMEP interrompeu a execução dos loops da pilha NestJS/Next.js e aprovou FastAPI no backend e Nuxt (Vue, SSR) no frontend, preservando PostgreSQL, Redis e MinIO. Esta decisão substitui **somente as escolhas de implementação de stack** incompatíveis nos documentos V1 anteriores. Regras de domínio, segurança, autorização, dados, publicação, acessibilidade e operação continuam válidas.

Para a migração, a precedência é: este documento e o plano de migração abaixo → documentos especializados existentes para comportamento e invariantes → modelo lógico → implementação legada. Menções antigas a NestJS, Next.js, Drizzle, BullMQ, Sharp, Vitest ou Supertest são requisitos históricos de implementação, não instruções para o código novo. Não eliminar o código legado antes de equivalência testada e aceite explícito.

## Arquitetura-alvo

- Frontend público e administrativo: um aplicativo Nuxt com Vue, SSR para conteúdo público e TypeScript para componentes/contratos. Páginas de administração podem usar renderização cliente onde apropriado.
- Backend: FastAPI em Python, REST/OpenAPI e modelos Pydantic; autorização sempre no servidor.
- Persistência primária: PostgreSQL. Manter o schema e os dados existentes. A escolha de ORM/migrations Python será fechada antes de escrever nessa base; as migrations Drizzle existentes permanecem como histórico, não devem ser reaplicadas por outro gerador sem revisão.
- Sessão: Redis + cookie HttpOnly/SameSite, sem JWT; CSRF em mutações administrativas.
- Mídia: MinIO, validação de upload por extensão/MIME/assinatura e processamento em Worker separado. A biblioteca, referências de mídia e regras de exclusão permanecem. Adaptador Python de imagem/fila será decidido por funcionalidade, preservando idempotência e recuperação.
- Operação: Matomo, Nginx, Docker Compose e GitHub Actions permanecem, sujeitos a ajuste dos serviços de aplicação.
- Testes: pytest/TestClient no backend; testes Vue/Nuxt e Playwright/axe no frontend conforme a funcionalidade. Não contar testes legados como prova da implementação nova.

## Estratégia funcional antes da integração

Migrar e aceitar cada funcionalidade isoladamente com fixtures/contratos locais; somente depois conectar Nuxt, FastAPI, PostgreSQL, Redis e MinIO. Fixtures devem ser identificadas como demonstração e nunca simular persistência real. A integração terá testes de contrato e fluxo ponta a ponta próprios. Código legado permanece executável durante a transição para comparação; não se introduz fallback de produção entre pilhas sem decisão específica.

**Cadência ajustada em 2026-09-29:** uma funcionalidade isolada não deve ser quebrada em loops sucessivos de infraestrutura sem resultado completo. Agrupar as etapas técnicas necessárias em um loop com caminho executável e aceite verificável (por exemplo, job → Worker → variantes → estado final), preservando a fronteira de integração acima. Os loops MIG 4.1–4.8 já concluídos não são reabertos; esta regra orienta os próximos. A demonstração isolada não deve ser apresentada como recurso utilizável no navegador ou persistência de produção.

**Ordem ajustada em 2026-10-05 pelo responsável (MIG-TEMPLATE-002):** o aceite da integração PageTemplate (MIG 5.8) fica suspenso após a baseline SQLAlchemy/Alembic e o MVP HTTP de autenticação. As referências reais de categorias editoriais e galerias exigem catálogos funcionais antes do CRUD de templates. A ordem ativa, sem reabrir loops históricos nem antecipar artigos/estágio, passa a ser:

1. **MIG 5.8-CAT — catálogo editorial funcional (concluído)**: migrar `categories` somente em banco de teste auditado; CRUD/listagem REST FastAPI com Pydantic, slug único por instituição, categoria global somente sob ADMIN e categoria institucional sob ADMIN ou EDITOR autorizado, sessão/CSRF, testes PostgreSQL/HTTP/segurança. O resultado deve permitir criar, consultar, alterar e remover categorias reais, não apenas ter uma tabela. Vínculo `ArticleCategory` permanece na fase de artigos.
2. **MIG 5.8-GAL — galeria funcional (concluído)**: migrar `galleries` e `gallery_items` no mesmo banco de teste; CRUD/listagem e itens ordenados com autorização institucional, validação de mídia IMAGE utilizável, `MediaUsage` transacional que impede exclusão de mídia em uso, e projeção REST para `GALLERY_FEED` sem duplicar dados no bloco. Testar concorrência/ordenação, referências, segurança e contrato HTTP. A UI Nuxt e a publicação pública conectada permanecem na fase de integração; estágio continua na fase 11.
3. **Retomar MIG 5.8 — PageTemplate integrado (loop atual)**: validar os 23 blocos com schemas por versão e referências reais de instituição, categoria editorial, galeria e mídia; CRUD ADMIN com snapshots persistidos e cópia para página em rascunho com IDs novos e independência; testes de autorização, persistência e contrato. Não usar IDs de fixture nem abrir CRUD antes dos pré-requisitos.
4. **MIG 6 — integração restante**: conectar Nuxt/serviços e concluir E2E/a11y/paridade antes de retirar legado.

As migrations Python seguem bloqueadas para o banco preexistente `portal_fumep`, que tem `page_templates` fora das migrations versionadas; executar apenas no banco de teste dedicado até auditoria/adopção separada. Este ajuste antecipa as fatias funcionais de Category e Gallery dos loops históricos 8.4 e 11.1–11.5, não suas fases inteiras nem outras entidades relacionadas.

## Plano de migração em fatias

1. **MIG 1 — Páginas institucionais Nuxt**: `/`, `/etmsl`, `/cramam`, identidade, aparência claro/escuro/sistema, SSR, sem API. Testes de rota/semântica e build; navegador verificável.
2. **MIG 2 — API FastAPI básica**: health e projeção institucional com contratos/testes independentes, sem conectar o Nuxt.
3. **MIG 3 — Autenticação e autorização**: sessões Redis, cookie, CSRF, papéis/instituições, recuperação; testes de segurança independentes.
4. **MIG 4 — Biblioteca de mídia**: categorias, upload, seleção, remoção, Worker/variantes; preservar invariantes e testar cada subfuncionalidade separadamente.
5. **MIG 5 — Page Builder**: portar schemas/registry, renderers, editor e templates por bloco/feature, sem publicação prematura.
6. **MIG 6 — Integração**: conectar interfaces ao FastAPI e aos serviços de dados, executar contratos/E2E/a11y, migrar operação e retirar legado somente após paridade demonstrada.

Esta sequência é um roteiro de migração, não uma declaração de que todas as funcionalidades antigas já estão no ar. `docs/CURRENT_LOOP.md` identifica a fatia ativa; `docs/LOOP_STATUS.md` registra evidências.

**Prioridade de demonstração aprovada em 2026-10-28:** na MIG 6, cada novo loop editorial deve entregar uma jornada utilizável no navegador com dados reais no banco dedicado, API, tela administrativa e projeção pública quando pertinente. O acabamento visual pode ser posterior; autorização, persistência, acessibilidade e testes essenciais continuam no aceite. Essa prioridade não altera a pilha aprovada, não libera migrations no banco preexistente e não autoriza remover o legado.
