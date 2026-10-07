# MIG 5.8 — PageTemplate persistido (API)

Este marco é **backend somente**. O Nuxt continua demonstrativo: não há painel integrado, edição de página salva, preview persistido nem publicação. O código legado continua preservado.

## Fluxo executável

Com FastAPI configurado para o banco local dedicado `portal_fumep_mig58_test`, Redis e um usuário ADMIN existente, o OpenAPI expõe:

- `GET/POST /api/v1/admin/page-templates` — listar/criar;
- `GET/PUT /api/v1/admin/page-templates/{id}` — snapshot e metadados;
- `PATCH /api/v1/admin/page-templates/{id}/active` — ativar/desativar;
- `POST /api/v1/admin/page-templates/{id}/apply` — criar `Page` DRAFT e `ContentBlock[]` independentes.

Sessão por cookie e CSRF são obrigatórios nas mutações. EDITOR não gerencia templates. O endpoint recusa qualquer banco que não seja o banco de teste local dedicado; **não** migra nem escreve em `portal_fumep`.

`blocks_snapshot` usa os 23 tipos V1 com `schemaVersion: 1`, posições e âncoras únicas, dados estritos por tipo e fundos canônicos (`DEFAULT`, `LIGHT`, `INSTITUTION`, `IMAGE`). IDs de fixture do Nuxt não são aceitos como referência real. Instituições devem estar ativas; categorias e galerias devem existir no escopo do modelo/página; imagens/PDFs devem estar READY e sem exclusão solicitada. Mídia referenciada gera `MediaUsage` transacional no template e em cada ContentBlock copiado.

Aplicar um modelo ativo copia o JSON para novos IDs de bloco, sem vínculo mutável com o template; alterações posteriores no modelo não alteram a página criada. Slugs de página repetidos na instituição retornam conflito. O próximo marco é integrar a experiência Nuxt/FastAPI e sua publicação, sem apresentar esta API isolada como CMS pronto.
