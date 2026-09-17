# Logos institucionais via Media

Loop 4.17: `Institution.logo_light_id` e `logo_dark_id` são FKs nullable para Media; migration aditiva 0019. As instituições reutilizam o mesmo arquivo da Biblioteca, sem upload ou cópia na seleção.

## Configuração

Com sessão ADMIN ativa, abra `/admin/media/library`. Use a busca, categoria e paginação para localizar imagens prontas. Na seção Logos institucionais, escolha instituição, logo claro e logo escuro e salve. O logo atual fora da página pode ser mantido; a opção vazia remove a referência. Editor continua podendo enviar arquivos conforme seu escopo, mas a configuração institucional é ADMIN.

`GET /api/v1/institutions/:id/logos` retorna somente IDs selecionados. `PATCH` no mesmo caminho aceita uma ou ambas as propriedades `logoLightId`/`logoDarkId`, UUID ou null; corpo vazio/extra/URL é inválido. Sessão, ADMIN e CSRF são exigidos no backend. Apenas IMAGE READY, MIME PNG/JPEG/WebP/AVIF e deletionStatus NONE são selecionáveis. SVG editorial permanece bloqueado; nenhuma nova exceção de upload foi criada.

O repository bloqueia a instituição, sincroniza os usos INSTITUTION com campos `logo_light_id`/`logo_dark_id` e atualiza proprietário/auditoria na mesma transação. Referências estáveis preservam IDs de uso; troca/remoção elimina usos antigos. Falha de validação ou auditoria desfaz tudo. Exclusão autorizada da instituição remove usos na transação; dependências existentes ainda impedem sua exclusão e causam rollback. FK e MediaUsage impedem apagar mídia usada.

## Apresentação pública

O tema público inclui paths opcionais `/media/institutions/:slug/logo/light` e `/dark`, sempre same-origin e associados ao slug do tema. Nenhuma URL MinIO, storage key, credencial ou sessão é entregue ao navegador.

O proxy Next.js acessa exclusivamente o endpoint público NestJS `/api/v1/public/institutions/:slug/logo/:appearance`, sem cookies, redirects ou URLs arbitrárias. Só logos selecionados de instituições ativas são públicos; não existe biblioteca pública genérica por UUID. A leitura tem limite de 15 MiB e MIME permitido; respostas usam no-store e nosniff. Prefere thumbnail WEBP até 320px quando existente; caso contrário usa o original já validado. Indisponibilidade do storage retorna erro neutro, não URL interna.

Dark ausente usa light. SSR entrega variantes com Next/Image e CSS seleciona LIGHT/DARK/SYSTEM antes de hidratar, preservando a preferência manual existente. O logo é link para a home da respectiva instituição, com nome acessível, foco visível e tamanho responsivo. Sem logos, a página de construção permanece disponível. Não foram implementados header completo, navegação ou Page Builder.

## Validação

Testes PostgreSQL cobrem reutilização entre três instituições/duas variantes, FK, usos estáveis, troca, remoção, rollback de tipo/estado/deleção/auditoria e exclusão do proprietário. Supertest/MinIO cobrem ADMIN/Editor, sessão/CSRF, contrato estrito, paths seguros, bytes públicos, fallback, instituição inativa e OpenAPI. Web cobre SSR, formulário, seleção da biblioteca, CSRF, feedback/foco e proxy bounded.

A fixture nova `portal_fumep_loop_4_17_test` recebe todas as migrations do zero e a suíte DB; a fixture existente do Worker 4.16 recebe a migration aditiva. Os bancos são preservados, e cada teste limpa somente seus próprios registros/objetos UUID. Browser E2E/axe e QA visual não foram executados; não há script test:e2e no projeto. Nenhum servidor de preview foi iniciado e nenhuma credencial de desenvolvimento foi criada.
