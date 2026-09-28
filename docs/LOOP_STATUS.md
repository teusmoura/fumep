# LOOP STATUS

## Migração FastAPI + Nuxt — 2026-09-25

Por decisão explícita do responsável, os loops técnicos NestJS/Next.js foram interrompidos após 5.30 (`bc5a96e`). O trabalho não commitado do 5.31 (schema PageTemplate, migration, testes e documentação) foi preservado no stash `b1bba349ce433efb2f4a9b1cb86739a3d004fca8`; não há aceite nem commit do 5.31. A pilha-alvo e a precedência estão em `docs/architecture/MIGRACAO_FASTAPI_NUXT_CANONICA.md`. Funcionalidades serão migradas individualmente antes da integração.

### MIG 3.2 — Política de senha/credenciais Argon2id — concluído

Estado inicial: MIG 3.1 concluído em `4d6a65f`, Git limpo. Entregue: contratos Pydantic estritos para credenciais de login e senha nova, normalização de e-mail sem alterar senha, mínimo de 10 caracteres somente para senha nova, hash/verificação Argon2id com parâmetros explícitos e salt aleatório. Senha é mascarada antes da validação para não aparecer em representação, serialização ou `ValidationError.errors()`. Parâmetros e fronteira estão em `docs/PASSWORD_POLICY_MIGRATION.md`. Sem endpoint de login, usuário fictício persistido ou conexão PostgreSQL.

Checks aprovados: `python -m pip check`, `python -m compileall -q app`, `python -m pytest -q` (28 aprovados, 1 integração Redis opcional ignorada sem URL), `pnpm format:check` e `git diff --check`. A suíte Python existente permaneceu verde. Warning transitivo Starlette/TestClient sobre httpx sem falha. Checks JS completos não repetidos porque nenhum código JS mudou.

Aceite MIG 3.2 cumprido. Próximo: MIG 3.3 — fluxo isolado de login com contrato de repositório de usuário e criação de sessão Redis; integração PostgreSQL/HTTP fica para decisão explícita posterior.

### MIG 3.3 — Fluxo de login isolado — concluído

Estado inicial: MIG 3.2 concluído em `d158777`, Git limpo. Entregue: `LoginService` com contrato `UserRepository` injetado, verificação Argon2id, conta ativa, papel e vínculo institucional; sessão Redis opaca apenas no sucesso. Usuário inexistente, senha errada, conta inativa e Editor sem instituição falham com a mesma resposta, sem sessão. Hash-isca aleatório em memória reduz diferença imediata entre usuário existente/inexistente; falha do Redis não autoriza fallback. Contrato/fronteira em `docs/LOGIN_SERVICE_MIGRATION.md`. Sem endpoint, PostgreSQL, guard, cookie HTTP ou UI nesta fatia.

Checks aprovados: `python -m pip check`, `python -m compileall -q app`, `python -m pytest -q` (36 aprovados, 1 integração Redis opcional ignorada sem URL), `pnpm format:check` e `git diff --check`. Warning transitivo Starlette/TestClient sobre httpx sem falha. Sem código JS alterado; checks JS completos não repetidos.

Aceite MIG 3.3 cumprido. `architecture-guard`: conforme com observação — autenticação permanece isolada, sem rota disponível ou dados reais; rate limiting, auditoria, revalidação e invalidação de sessões existentes exigem fatias futuras. Próximo: MIG 3.4 — autorização institucional e papéis em serviço isolado.

### MIG 3.4 — Autorização institucional e papéis — concluído

Estado inicial: MIG 3.3 concluído em `04fab7f`, Git limpo. Entregue: política backend isolada para ADMIN global e EDITOR vinculado a instituições, exigindo todas as atribuições para conteúdo compartilhado e rejeitando escopo vazio. `CurrentUserAccess` representa estado atualizado de fonte confiável; divergência de ID, papel, instituições ou conta inativa nega acesso. Contrato/fronteira em `docs/AUTHORIZATION_POLICY_MIGRATION.md`. Sem guard HTTP ou PostgreSQL.

Checks aprovados: `python -m pip check`, `python -m compileall -q app`, `python -m pytest -q` (45 aprovados, 1 integração Redis opcional ignorada sem URL), `pnpm format:check` e `git diff --check`. Warning transitivo Starlette/TestClient sobre httpx sem falha. Nenhum código JS alterado; checks JS completos não repetidos.

Aceite MIG 3.4 cumprido. `architecture-guard`: conforme com observação — o futuro guard deverá obter o estado atualizado do usuário no backend e invalidar sessões após desativação/mudança de permissão; esta política não aceita estado fornecido pelo navegador. Próximo: MIG 3.5 — contrato CSRF isolado.

### MIG 3.5 — Contrato CSRF isolado — concluído

Estado inicial: MIG 3.4 concluído em `a6b77e9`, Git limpo. Originalmente entregue com token HMAC derivado, depois corrigido para token aleatório armazenado na sessão Redis conforme AUTH-002 (ver correção canônica abaixo). Validação de Origin/Referer e POST/PUT/PATCH/DELETE, sem token no cookie. Origem externa, token ausente/incorreto, sessão invalidada ou cookie malformado falham fechado. Contrato e limites em `docs/CSRF_CONTRACT_MIGRATION.md`; sem rota/middleware/UI.

Checks aprovados: `python -m pip check`, `python -m compileall -q app`, `python -m pytest -q` (66 aprovados, 1 integração Redis opcional ignorada sem URL), `pnpm format:check` e `git diff --check`. Warning transitivo Starlette/TestClient sobre httpx sem falha. Sem código JS alterado; checks JS completos não repetidos.

Aceite MIG 3.5 cumprido após correção AUTH-002. O futuro adaptador HTTP deverá aplicar este contrato a todas as mutações administrativas, com origem por configuração segura. Próximo: MIG 3.6 — logout e leitura de sessão isolados.

### MIG 3.6 — Logout e leitura de sessão isolados — concluído

Estado inicial: MIG 3.5 concluído em `0f83137`, Git limpo. Entregue: `SessionUseCases.read` projeta ID, papel e instituições de sessão Redis válida; após correção AUTH-002 também entrega token CSRF para a resposta autenticada. Ausente/expirada retorna `None`. Logout remove sessão e expira cookie com atributos seguros, inclusive em repetição ou token ausente. Falhas de Redis propagam sem fallback. Fronteira documentada em `docs/SESSION_USE_CASES_MIGRATION.md`; sem endpoint/guard/UI.

Checks aprovados: `python -m pip check`, `python -m compileall -q app`, `python -m pytest -q` (73 aprovados, 1 integração Redis opcional ignorada sem URL), `pnpm format:check` e `git diff --check`. Warning transitivo Starlette/TestClient sobre httpx sem falha. Sem código JS alterado; checks JS completos não repetidos.

Aceite MIG 3.6 cumprido. A futura rota de logout exige CSRF; a leitura não substitui revalidação da conta/permissões atuais no backend. Próximo: MIG 3.7 — rate limiting de login isolado.

### MIG 3.7 — Rate limiting de login isolado — concluído

Estado inicial: MIG 3.6 concluído em `2ff5db6`, Git limpo. Entregue: orçamento inicial de 5 tentativas/minuto por IP e conta normalizada, decisão neutra sem consulta ao usuário, retry temporário, transação Redis `WATCH/MULTI/EXEC`, chaves HMAC sem IP/e-mail em texto puro e falha fechada em erro/contensão. Contrato e limite de integração em `docs/LOGIN_RATE_LIMIT_MIGRATION.md`; sem endpoint ou bloqueio permanente.

Checks aprovados: `python -m pip check`, `python -m compileall -q app`, `python -m pytest -q` (80 aprovados, 1 integração Redis opcional ignorada sem URL), teste de concorrência repetido 10 vezes, `pnpm format:check` e `git diff --check`. Warning transitivo Starlette/TestClient sobre httpx sem falha. Sem código JS alterado; checks JS completos não repetidos. O teste focado inicial tinha uma contagem esperada incorreta de chaves Redis; corrigida e reexecutada com sucesso.

Aceite MIG 3.7 cumprido. O futuro endpoint ainda deve conectar o limitador, registrar auditoria de falhas e aplicar política progressiva antes de produção. Próximo: MIG 3.8 — contrato de recuperação de senha isolado.

### Correção canônica AUTH-002 antes de MIG 3.8

Durante a revisão de recuperação de senha, foi detectado que o contrato MIG 3.5 de token derivado por HMAC contrariava a decisão AUTH-002 já aprovada em `docs/ISSUES_ARCHITECTURE.md`. Sem reescrever commits anteriores, a implementação foi corrigida: token CSRF aleatório de 32 bytes no payload Redis; `LoginResult` e consulta de sessão o entregam separadamente do cookie; `CsrfService` compara o valor armazenado e conserva validação de origem/método/sessão. Logout com sessão válida passou a exigir CSRF, enquanto ausência/repetição permanece idempotente. Documentos MIG 3.1/3.3/3.5/3.6 e testes ajustados. O loop ativo continua MIG 3.8 até seu próprio aceite.

Checks da correção: `python -m pip check`, `python -m compileall -q app`, `python -m pytest -q` (81 aprovados, 1 integração Redis opcional ignorada), `pnpm format:check` e `git diff --check`, todos verdes.

### MIG 3.1 — Sessão Redis e cookie — concluído

Entregue: `RedisSessionStore` com token opaco de 32 bytes, `SET NX EX`, prefixo isolado da pilha legada, leitura/renovação atômica `WATCH/MULTI/EXEC`, limite de inatividade de 30 minutos, limite absoluto de 8 horas, invalidação e descarte de dados corrompidos. Cookie `fumep_session` HttpOnly, SameSite=Lax, Path=/, Secure em produção. Sem login, autorização de rotas ou integração com Nuxt. Contrato/teste local descritos em `docs/REDIS_SESSION_MIGRATION.md`.

Checks aprovados: `python -m pip check`, `python -m compileall -q app`, `python -m pytest -q` (16 testes aprovados + 1 integração opcional ignorada sem URL), suíte completa com `FUMEP_REDIS_TEST_URL` apontando somente para Redis loopback DB 15 (17 aprovados), `pnpm format:check` e `git diff --check`. Teste real usou prefixo de teste exclusivo e removeu somente sua própria sessão. API pública MIG 2 permaneceu verde. Warning transitivo Starlette/TestClient sobre httpx persiste sem falha. Checks JS completos não repetidos porque nenhum código JS mudou.

Aceite MIG 3.1 cumprido. Próximo: MIG 3.2 — política de senha Argon2id e contrato de credenciais, ainda sem endpoint/login real.

### MIG 2 — API FastAPI básica isolada — concluído

Entregue: aplicativo `apps/backend` em FastAPI/Python com `GET /api/v1/health`, `GET /api/v1/public/institutions/{slug}/theme`, modelos Pydantic `extra=forbid`, OpenAPI/Swagger e fixtures determinísticas para FUMEP, ETMSL e CRAMAM. Tema retorna apenas campos públicos, `Cache-Control: no-store` e `X-FUMEP-Data-Source: fixture`; 404 não revela dados internos. Sem consumo pelo Nuxt, persistência, Redis ou autenticação. Dependências Python fixadas em `requirements-lock.txt`; README contém comandos WSL/Windows e URLs de teste.

Checks aprovados: `python -m pip check`, `python -m compileall -q app`, `python -m pytest -q` (6 testes), `pnpm format:check`, `git diff --check`. HTTP real em 127.0.0.1:8002: health `ok`, tema ETMSL com header fixture e `/docs` 200. A porta 8000 já estava ocupada, então 8002 foi usada sem alterar o backend antigo. O TestClient em FastAPI 0.141.1/Starlette 1.7 emite um aviso de depreciação transitiva sobre `httpx`; os testes passam. Checks completos da pilha JS não foram repetidos: nenhuma fonte JS mudou desde MIG 1, quando 549 testes e build global passaram. Sem integração/E2E/axe nesta fatia.

Aceite MIG 2 cumprido. Próximo: MIG 3.1 — armazenamento isolado de sessões Redis e contrato de cookie, sem login/CRUD antecipados.

### MIG 1 — Páginas institucionais Nuxt — concluído

Entregue: aplicativo Nuxt/Vue SSR separado em `apps/portal` com `/`, `/etmsl` e `/cramam`, identidade/cor local distinta, navegação institucional, título/meta por instituição, preferência Sistema/Claro/Escuro em cookie apenas visual, skip link, landmarks/labels e aviso explícito de demonstração sem persistência. Rota institucional desconhecida retorna 404. Sem FastAPI, banco ou autenticação conectados. A implementação legada permanece disponível para comparação. README atualizado com comando e URLs para teste no navegador.

Checks aprovados: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (549: 83 validation, 71 DB, 12 jobs, 3 storage, 122 API, 223 web, 30 Worker, 5 portal), `pnpm build`, `git diff --check`. Verificação HTTP do Nuxt local: três rotas 200 com `data-institution` correto, desconhecida 404, cookie visual DARK refletido no HTML SSR. Sem E2E/axe automatizado nesta fatia; sem integração. O lint inicial falhou por analisar `.nuxt/.output` gerados como React; corrigido com ignores e segunda execução verde. Warning de depreciação transitiva no build Nuxt não quebrou o build.

Aceite MIG 1 cumprido. Próximo: MIG 2 — API FastAPI básica isolada.

## LOOP 5.30 — Concluído

Estado inicial: 5.29 concluído em 5a6d630, Git limpo. Escopo: auditar Registry operacional dos 17 blocos implementados até 5.29, versões/contextos/schemas/editor/renderer e documentar fronteira com FEEDs alocados a loops posteriores. Sem implementar FEEDs ou PageTemplate antecipadamente.

Entregue: teste de contrato do catálogo operacional completo, afirmando ordem/tipos, 17 definições PAGE, oito contextos ARTICLE, schemaVersion 1, editor/renderer reais, drafts válidos do builder e rejeição de duplicatas, posições/versões inválidas. Documentada a fronteira entre o enum de 23 tipos V1 e o Registry operacional deste estágio: seis FEEDs permanecem reservados para loops posteriores, sem stubs. Nenhuma API, migration ou dependência nova.

Checks aprovados: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, pnpm build e git diff --check. Suíte completa 544 testes (83 validation, 71 DB, 12 jobs, 3 storage, 122 API, 223 web, 30 Worker). Teste web focado 223 passou. test:e2e inexistente. Sem QA manual de navegador porque o loop altera apenas testes/documentação de contrato, sem UI nova.

Aceite do estágio cumprido: todas as definições operacionais criadas até 5.29 estão registradas e validadas, sem definições parciais. Leitura literal de “todos os blocos V1” incluiria FEEDs agendados explicitamente para 5.34/8.13/9.11/10.10/11.5/13.15–13.16; execute-loop/architecture-guard preservaram essa ordem e não anteciparam implementação. Commit: test(builder): lock complete core registry contract. Próximo: 5.31 PageTemplate schema.

## LOOP 5.29 — Concluído

Estado inicial: 5.28 concluído em 36f75cb, Git limpo. Escopo: DOCUMENT v1 PAGE/ARTICLE com PDF pronto da Biblioteca, mediaId e texto opcional, seleção/editor, renderer SSR com mídia resolvida pelo caller, testes e documentação. Sem URL física de MinIO no JSONB, Registry completo, endpoint/Preview/publicação antecipados.

Entregue: schema Zod strict/versionado para mediaId e title?/description?/buttonLabel?, projeção de PDF READY/NONE com href interno validado; seleção de PDFs disponíveis da Biblioteca, editor Client com callback async e falha retida; renderer SSR com PDF resolvido por ID e link nativo para visualização. Registry/PageBuilder permitem DOCUMENT em PAGE/ARTICLE somente quando há PDF elegível. Sem URL física em JSONB, endpoint, migration ou dependência nova; backend/caller deve revalidar disponibilidade, autorização e MediaUsage.

Checks aprovados: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, pnpm build e git diff --check. Suíte completa 541 testes (83 validation, 71 DB, 12 jobs, 3 storage, 122 API, 220 web, 30 Worker). Testes focados validation/web aprovados; axe-core sem violações semânticas no editor/renderer (contraste desabilitado no jsdom). test:e2e inexistente. Não houve QA manual de navegador neste loop; SSR, DOM, seleção no builder e build estão cobertos por testes automatizados.

Aceite cumprido. execute-loop/page-builder/media-storage/architecture-guard preservaram mídia por ID, PDF válido e contrato do caller; nextjs-frontend/testing-qa verificaram semântica, segurança básica e A11y. Commit: feat(builder): add document PDF block v1. Próximo: 5.30 Registry completo.

## LOOP 5.28 — Concluído

Estado inicial: 5.27 concluído em 12ca68c, Git limpo. Escopo: VIDEO v1 PAGE/ARTICLE com url YouTube/Vimeo, title obrigatório e description? conforme contrato especializado; editor, renderer responsivo/acessível, Registry/builder, testes e documentação. Sem iframe livre, outros provedores, DOCUMENT ou persistência/publicação antecipada. O resumo anterior em CURRENT_LOOP divergia do documento especializado em title/provider; prevalece o contrato canônico.

Entregue: schema Zod strict/versionado e parser de URL HTTPS com host/ID exatos, rejeição de parâmetros e origens arbitrárias; editor Client com aplicação async e falha retida; renderer SSR com título/descrição/link e botão de carregamento consentido, criando iframe somente de origem controlada após clique. Registro e criação no builder para PAGE/ARTICLE, sem endpoint, migration ou dependência nova. O draft inicial usa vídeo de exemplo público e exige substituição editorial.

Checks aprovados: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, pnpm build e git diff --check. Suíte completa 534 testes (81 validation, 71 DB, 12 jobs, 3 storage, 122 API, 215 web, 30 Worker). O teste focado inicial detectou catálogo ARTICLE desatualizado; expectativa corrigida e suíte completa aprovada. axe-core sem violações semânticas no editor/renderer (contraste desabilitado no jsdom). test:e2e inexistente; sem QA real de navegador neste loop, coberto por testes DOM/SSR e build.

Aceite cumprido. execute-loop/page-builder/architecture-guard preservaram os campos e provedores canônicos; nextjs-frontend/testing-qa verificaram SSR, interação, segurança básica, responsividade por CSS e A11y. Commit: feat(builder): add controlled video block v1. Próximo: 5.29 DOCUMENT.

## LOOP 5.27 — Concluído

Estado inicial: 5.26 concluído em 9915a27, Git limpo. Escopo: MAP V1 PAGE-only com title?, latitude, longitude, address e zoom? estruturados; editor, renderer responsivo/acessível, Registry/builder, testes e documentação. Sem HTML/iframe arbitrário, carregamento externo automático, VIDEO ou persistência/publicação antecipada.

Entregue: schema Zod strict/versionado com coordenadas finitas e limites, endereço obrigatório e zoom opcional; editor Client acessível com aplicação async e draft preservado em falha; renderer SSR de localização com endereço/coordenadas escapados e link OpenStreetMap calculado sem iframe ou requisição externa automática. Registry/PageBuilder permitem MAP somente em PAGE. Sem endpoint, migration ou dependência nova. Provedor não está fixado no plano; a URL externa não é persistida, e o vínculo pode ser trocado sem migração.

Checks aprovados: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, pnpm build, pnpm ls --depth 0 e git diff --check. Suíte completa 527 testes (79 validation, 71 DB, 12 jobs, 3 storage, 122 API, 210 web, 30 Worker). O teste focado inicial encontrou contagem antiga de Registry (14), corrigida para 15; a suíte completa passou. axe-core sem violações semânticas no editor/renderer (contraste desabilitado no jsdom). test:e2e inexistente.

QA real em 390×844 e 1280×900: sem overflow horizontal, endereço HTML literal escapado, sem iframe, link com alvo >=44 px, edição/aplicação do título confirmada. Tentativa inicial do servidor local teve EPERM no arquivo gerado next-env.d.ts; reexecução autorizada fora do sandbox resolveu. Erro de composição da fixture Server/Client foi corrigido e validado. Fixtures removidas, viewport restaurado, aba de QA fechada e servidor encerrado; uma aba da tentativa inicial permaneceu inacessível por política de URL do navegador, sem efeito no repositório.

Aceite cumprido. execute-loop/page-builder/architecture-guard mantiveram dados estruturados, PAGE-only e escopo; nextjs-frontend/testing-qa/computer-use verificaram SSR, editor, responsividade, segurança básica e A11y. Commit: feat(builder): add structured map block v1. Próximo: 5.28 VIDEO.

## LOOP 5.26 — Concluído

Estado inicial: 5.25 concluído em 7e26c15, Git limpo. Escopo: CAROUSEL V1 PAGE/ARTICLE com até 10 slides imageId/alt/caption?/url?, seleção de imagem pronta da Biblioteca, renderer SSR + interação Client sem autoplay, controles acessíveis, Registry/builder/testes/checks/documentação. Sem MAP, HTML/CSS livre, URL física em JSONB, Preview/publicação/persistência antecipados.

Entregue: schema Zod strict/versionado com 1–10 slides, UUID de mídia, alt/legenda e URL segura; editor Client para selecionar imagens READY, adicionar/editar/remover/reordenar slides, validar alt/URL e reter falha async; renderer SSR com projeções de mídia pública validadas e falha fechada se qualquer imagem/alt faltar, interação Client por botões, seleção direta e ArrowLeft/Right/Home/End, sem autoplay. Registry/PageBuilder permitem CAROUSEL em PAGE e ARTICLE. Sem endpoint, migration ou dependência nova; MediaUsage/publicação permanecem responsabilidade de loops/callers próprios.

Checks aprovados: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, pnpm build, pnpm ls --depth 0 e git diff --check. Suíte completa 520 testes (77 validation, 71 DB, 12 jobs, 3 storage, 122 API, 205 web, 30 Worker); typecheck e testes focados validation/web também aprovados. axe-core sem violações semânticas no editor/renderer (contraste desabilitado no jsdom).

QA real em 390×844 e 1280×900: imagens locais temporárias carregadas, um slide visível por vez, seleção por botões/teclado, anúncio de posição, legenda HTML literal, controles >=44 px e zero overflow; adicionar/reordenar/aplicar terceiro slide. Fixtures de rota/imagem removidas, viewport restaurado, aba fechada, servidor encerrado e porta 3100 sem listener. test:e2e inexistente; sem CI remota ou integração REST owner real.

Aceite cumprido. execute-loop/page-builder/architecture-guard mantiveram limite 10 e contextos canônicos; media-storage impediu URL física do MinIO e preservou referência por ID; nextjs-frontend/testing-qa/computer-use verificaram SSR, interação, responsividade, segurança básica e A11y. Commit: feat(builder): add carousel block v1. Próximo: 5.27 MAP.

## LOOP 5.25 — Concluído

Estado inicial: 5.24 concluído em edf7fb4, Git limpo. Escopo: STATISTICS V1 PAGE-only com até 12 itens value/label/description?, editor/renderer semânticos, Registry/builder/testes/checks/documentação. Sem CAROUSEL, MAP, animação obrigatória, HTML/CSS livre, Preview/publicação/persistência antecipados. Correção documental pendente ao encerrar: o plano canônico nomeia 5.26 CAROUSEL e 5.27 MAP, divergindo do próximo loop indicado por engano em CURRENT_LOOP.

Entregue: schema Zod strict/versionado com 1–12 indicadores textuais, editor Client para adicionar/editar/remover/reordenar com aplicação async isolada e falha retida; renderer SSR em seção/lista semântica, grid responsivo, texto escapado e sem animação obrigatória. Registry/PageBuilder permitem STATISTICS somente em PAGE. Sem endpoint, migration ou dependência nova. Apontamento do próximo loop corrigido para 5.26 CAROUSEL conforme o plano canônico.

Checks aprovados: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, pnpm build, pnpm ls --depth 0 e git diff --check. Suíte completa 510 testes (75 validation, 71 DB, 12 jobs, 3 storage, 122 API, 197 web, 30 Worker); typecheck e testes focados validation/web também aprovados. axe-core sem violações semânticas no editor/renderer (contraste desabilitado no jsdom).

QA real em 390×844 e 1280×900: grid de 1/3 colunas, texto HTML literal escapado, controles >=44 px, zero overflow, adicionar/reordenar/aplicar quatro indicadores. Fixture removida, viewport restaurado, aba fechada, servidor encerrado e porta 3100 sem listener. test:e2e inexistente; sem CI remota ou integração REST owner real.

Aceite cumprido. execute-loop/page-builder/architecture-guard mantiveram PAGE-only, limite 12 e texto controlado; nextjs-frontend/testing-qa/computer-use verificaram SSR, editor, responsividade, segurança básica e A11y. Commit: feat(builder): add statistics block v1. Próximo: 5.26 CAROUSEL.

## LOOP 5.24 — Concluído

Estado inicial: 5.23 concluído em be4a4b7, Git limpo. Escopo: TIMELINE V1 PAGE-only com title? e items[] de date?, title, description em texto simples, limite defensivo de itens, editor/renderer semânticos, Registry/builder/testes/checks/documentação. Sem STATISTICS, HTML/CSS livre, Preview/publicação/persistência antecipados.

Entregue: schema strict/versionado com 1–30 marcos e campos textuais controlados; editor Client para adicionar/editar/remover/reordenar marcos, aplicação async isolada e falha retida; renderer SSR em section nomeada, h2 opcional e lista ordenada com h3/descrição, fundo/tema compartilhados. Registry/PageBuilder permitem TIMELINE somente em PAGE. Sem endpoint, migration ou dependência nova.

Checks aprovados: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, pnpm build, pnpm ls --depth 0 e git diff --check. Suíte completa 501 testes (73 validation, 71 DB, 12 jobs, 3 storage, 122 API, 190 web, 30 Worker); typecheck e testes focados validation/web também aprovados. axe-core sem violações semânticas no editor/renderer (contraste desabilitado no jsdom).

QA real em 390×844 e 1280×900: lista ordenada, texto HTML literal escapado, controles >=44 px, zero overflow, adicionar/reordenar/aplicar três marcos. Fixture removida, viewport restaurado, aba fechada, servidor encerrado e porta 3100 sem listener. test:e2e inexistente; sem CI remota ou integração REST owner real.

Aceite cumprido. execute-loop/page-builder/architecture-guard mantiveram PAGE-only, texto controlado e escopo; nextjs-frontend/testing-qa/computer-use verificaram SSR, editor, responsividade, segurança básica e A11y. Commit: feat(builder): add timeline block v1. Próximo: 5.25.

## LOOP 5.23 — Concluído

Estado inicial: 5.22 concluído em c7d0112, Git limpo. Escopo: TABLE V1 estruturada (caption?, headers[], rows[][]), editor/renderer semânticos e responsivos, Registry/builder em PAGE e ARTICLE, testes, checks e documentação. Limites defensivos de quantidade/tamanho serão contratos V1 locais; sem HTML/CSS livre, células ricas, TIMELINE ou persistência/publicação antecipada.

Entregue: schema Zod strict/versionado com 1–12 colunas, 1–100 linhas retangulares, texto puro e limites de caracteres; editor Client de cabeçalhos, células e linhas com aplicação async, validação e falha retida; renderer SSR em table/caption/thead/th scope=col/tbody com texto escapado e rolagem local alcançável por teclado. Registry/PageBuilder permitem TABLE em PAGE e ARTICLE. Sem endpoint, migration ou dependência nova. A inspeção móvel revelou quebra excessiva das palavras; ajuste de largura mínima por coluna corrigiu o problema sem overflow da página.

Checks aprovados após o ajuste final: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, pnpm build, pnpm ls --depth 0 e git diff --check. Suíte completa 490 testes (71 validation, 71 DB, 12 jobs, 3 storage, 122 API, 183 web, 30 Worker); typecheck e suíte web focada também aprovados. A primeira rodada detectou expectativa antiga do catálogo ARTICLE e extensão ausente de import de teste; ambas corrigidas e verificadas novamente.

QA real em 390×844 e 1280×900: seis colunas com rolagem horizontal local, documento sem overflow, HTML literal escapado, controles >=44 px, inclusão/aplicação de linha e coluna; axe-core sem violações semânticas no renderer/editor (contraste desabilitado no jsdom). A fixture temporária foi removida, viewport restaurado, aba fechada e servidor encerrado. Erros iniciais da fixture de QA foram corrigidos antes das verificações; logs históricos permaneciam no tab até fechamento. test:e2e inexistente; sem CI remota ou integração REST owner real.

Aceite cumprido. execute-loop/page-builder/architecture-guard mantiveram TABLE estruturada e contextos canônicos; nextjs-frontend/testing-qa/computer-use verificaram SSR, editor, responsividade, segurança básica e A11y. Commit: feat(builder): add structured table block v1. Próximo: 5.24.

## LOOP 5.22 — Concluído

Estado inicial: 5.21 concluído em 485e832, Git limpo. Escopo: TABS V1 PAGE-only com até 8 abas label/content, conteúdo textual rico simples limitado a parágrafos e trechos seguros TEXT (negrito/itálico/links), editor de coleção, renderer com ARIA/teclado, Registry/builder/testes/checks/documentação. Sem ARTICLE, TABLE, blocos aninhados, HTML/CSS livre, Preview/publicação/persistência antecipados.

Entregue: schema Zod strict/versionado com 1 a 8 abas e conteúdo controlado, editor Client para adicionar/editar/remover/reordenar abas e parágrafos com validação e falha retida, renderer com semântica tablist/tab/tabpanel, navegação ArrowLeft/Right/Home/End e foco gerenciado. Registry e builder restringem TABS a PAGE. Sem endpoint, migration ou dependência nova.

Checks aprovados: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, pnpm build, pnpm ls --depth 0 e git diff --check. Suíte completa 483 testes (69 validation, 71 DB, 12 jobs, 3 storage, 122 API, 176 web, 30 Worker); testes focados e typecheck web aprovados.

QA real 390×844 e 1280×900 LIGHT/DARK: seleção inicial, painel inativo oculto, ArrowRight/Home/End e foco, edição/reordenação/aplicação de três abas, HTML literal escapado, controles interativos >=44 px, zero overflow e console limpo. Fixture removida, viewport restaurado, aba fechada, servidor encerrado e porta 3100 sem listener. test:e2e inexistente; sem CI remota ou integração REST owner real.

Aceite cumprido. execute-loop/page-builder/architecture-guard mantiveram PAGE-only, limite 8 e conteúdo controlado; nextjs-frontend/testing-qa verificaram SSR, interação, responsividade, segurança e A11y. Commit: feat(builder): add tabs block v1. Próximo: 5.23.

## LOOP 5.21 — Concluído

Estado inicial: 5.20 concluído em 8c5f69a, Git limpo. Escopo: FAQ V1 PAGE-only com title?, até 30 pares question/answer de texto simples, editor acessível de coleção, renderer SSR em accordion nativo details/summary, Registry/builder/testes/checks/documentação. Sem ARTICLE, TABS, HTML/CSS livre, Preview/publicação/persistência antecipados.

Entregue: schema strict/versionado para 1 a 30 itens textuais, editor Client de coleção com adicionar/editar/remover/reordenar, validação conjunta e callback async/ref/busy com falha retida; renderer SSR em details/summary nativos com estado aberto/fechado acessível, texto escapado e BlockBackground. Registry/PageBuilder permitem FAQ somente em PAGE. Sem endpoint, migration, dependência ou persistência antecipada.

Checks aprovados: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, pnpm build, pnpm ls --depth 0 e git diff --check. Suíte completa 474 testes (67 validation, 71 DB, 12 jobs, 3 storage, 122 API, 169 web, 30 Worker); validation/web focados e typecheck web aprovados. axe-core semântico zero violações; sem falhas pendentes.

QA real 390×844 e 1280×900 LIGHT/DARK: expansão por Enter, foco sólido em summary, adicionar/reordenar/aplicar três perguntas, texto HTML literal escapado, controles >=44 px, zero overflow e console limpo. Fixture removida, viewport restaurado, aba fechada, servidor encerrado e porta 3100 sem listener. test:e2e inexistente; sem CI remota, contraste global ou integração REST owner real.

Aceite cumprido. execute-loop/page-builder/architecture-guard mantiveram PAGE-only e limite 30; nextjs-frontend/testing-qa/computer-use verificaram acordeão, SSR, interação, responsividade, segurança e A11y. Commit: feat(builder): add FAQ block v1. Próximo: 5.22.

## LOOP 5.20 — Concluído

Estado inicial: 5.19 concluído em 0a9b65f, Git limpo. Escopo: SPACER V1 PAGE-only com enum SMALL/MEDIUM/LARGE, editor acessível, renderer SSR decorativo com altura fixa no Design System, Registry/builder/testes/checks/documentação. Sem pixels/CSS livres, ARTICLE, FAQ, Preview/publicação/persistência antecipados.

Entregue: schema strict/versionado com apenas três enums, editor Client de escolha nativa e callback async/ref/busy com falha retida, renderer SSR decorativo/aria-hidden que falha fechado, alturas fixas no CSS (1/2/4rem), BlockBackground e integração Registry/PageBuilder somente em PAGE. Sem endpoint, migration, dependência ou conteúdo indexável adicional.

Checks aprovados: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, pnpm build, pnpm ls --depth 0 e git diff --check. Suíte completa 464 testes (65 validation, 71 DB, 12 jobs, 3 storage, 122 API, 161 web, 30 Worker); validation/web focados e typecheck web aprovados. axe-core semântico zero violações; sem falhas pendentes.

QA real 390×844 e 1280×900 LIGHT/DARK: MEDIUM 32 px, LARGE 64 px, seletor/aplicação, controles de 44 px, foco sólido, zero overflow e console limpo. Fixture removida, viewport restaurado, aba fechada, servidor encerrado e porta 3100 sem listener. test:e2e inexistente; sem CI remota ou integração REST owner real.

Aceite cumprido. execute-loop/page-builder/architecture-guard mantiveram PAGE-only e espaçamento controlado; nextjs-frontend/testing-qa/computer-use verificaram SSR, interação, responsividade e A11y. Commit: feat(builder): add controlled spacer block v1. Próximo: 5.21.

## LOOP 5.19 — Concluído

Estado inicial: 5.18 concluído em e0739a7, Git limpo. Escopo: CTA V1 com title, text?, buttonLabel e buttonUrl, schema strict/versionado, editor Client, renderer SSR com BlockBackground, Registry/builder PAGE/ARTICLE, testes, checks e documentação. Sem SPACER, HTML/CSS livre, mídia, Preview/publicação ou persistência antecipados.

Entregue: contrato Zod strict com limites reutilizados do HERO e URL segura compartilhada, editor Client acessível de aplicação conjunta com snapshot clonado, falha retida e concorrência bloqueada, renderer SSR com heading/texto/link nomeado dentro de BlockBackground, tokens/foco/área mínima, Registry e criação em PAGE/ARTICLE. Sem endpoint, migration ou dependência nova. A primeira rodada web identificou expectativa antiga de tipos ARTICLE; corrigida, rodada focada repetida e aprovada.

Checks aprovados: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, pnpm build, pnpm ls --depth 0 e git diff --check. Suíte completa 455 testes (63 validation, 71 DB, 12 jobs, 3 storage, 122 API, 154 web, 30 Worker); validação/web focados e typecheck web também aprovados. axe-core semântico zero violações; sem falhas pendentes.

QA real 390×844 e 1280×900 LIGHT/DARK: aplicação de título/URL, HTML literal escapado, link seguro, controles de 44 px, foco sólido, zero overflow e console limpo. Fixture removida, viewport restaurado, aba fechada, servidor encerrado e porta 3100 sem listener. test:e2e inexistente; sem CI remota, contraste global ou integração REST owner real.

Aceite cumprido. execute-loop/page-builder/architecture-guard mantiveram campos/contextos canônicos e escopo; nextjs-frontend/testing-qa/computer-use verificaram SSR, interação, segurança, responsividade e A11y. Commit: feat(builder): add CTA block v1. Próximo: 5.20.

## LOOP 5.18 — Concluído

Estado inicial: 5.17 concluído em f16d7c4, Git limpo. Escopo: QUICK_LINKS V1 PAGE-only com title? e itens label/url/icon?, URLs seguras, catálogo fechado de ícones decorativos do sistema, editor de coleção acessível, renderer SSR responsivo/BlockBackground, Registry/builder/testes/checks/documentação. Sem CTA, SVG/HTML/ícones externos ou arbitrários, Preview/publicação/persistência antecipados.

Entregue: schemas strict/versionados para coleção não vazia, título/rótulos limitados e URLs seguras; como o cânone não fixa máximo de itens, nenhum limite arbitrário foi criado. Catálogo fechado com seis enums associa apenas SVGs internos decorativos, sem aceitar markup, URL, biblioteca ou nome livre do Editor. Editor Client adiciona, edita, remove e reordena links, seleciona somente ícones permitidos e aplica snapshot por callback async/ref/busy com falha retida. Renderer SSR valida envelope/visibilidade, escapa texto, nomeia a navegação com ou sem título e compõe links acessíveis dentro de BlockBackground. Registry/PageBuilder criam QUICK_LINKS somente em PAGE; ARTICLE preserva seu subconjunto canônico. Sem endpoints, migrations, Preview, publicação ou persistência antecipada.

Checks aprovados: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, pnpm build e git diff --check; inspeção de dependências com pnpm ls --depth 0. Suíte completa 445 testes (61 validation, 71 DB, 12 jobs, 3 storage, 122 API, 146 web, 30 Worker), além das rodadas focadas validation/web e typecheck web. axe-core semântico zero violações; sem falhas de teste/compilação pendentes.

QA real 390×844, 700×900 e 1280×900 LIGHT/DARK: 1/2/3 colunas, adicionar/reordenar/editar/aplicar quatro links, URLs corretas, HTML literal escapado, ícones internos decorativos, controles >=44px, foco solid, zero overflow e console limpo. Fixture removida, viewport restaurado, aba fechada, servidor encerrado e porta 3100 livre. test:e2e inexistente; sem CI remota, contraste global ou integração REST owner real.

Aceite cumprido. execute-loop/page-builder/architecture-guard mantiveram PAGE-only, contratos e catálogo fechado sem persistência; nextjs-frontend/testing-qa/computer-use verificaram coleção, SSR, responsividade, interação, segurança e A11y. Commit: feat(builder): add quick links block v1. Próximo: 5.19.

## LOOP 5.17 — Concluído

Estado inicial: 5.16 concluído em caa6a45, Git limpo. Escopo: CARDS V1 PAGE-only, itens imageId/title/description?/url?, somente imagens READY com alt válido da Biblioteca, máximo 12, editor de coleção acessível, renderer SSR em grid responsivo de três colunas desktop, Registry/builder/testes/checks/documentação. Sem QUICK_LINKS, ícones, Preview/publicação/persistência antecipados.

Entregue: schemas strict/versionados para coleção de 1 a 12 cards e campos canônicos seguros, sem ícone/HTML/CSS/layout livre. Editor Client adiciona, edita, remove e reordena itens por controles nativos, usa somente projeções IMAGE READY com alt padrão válido, valida URL e aplica snapshot conjunto por callback async/ref/busy com falha retida. Renderer SSR PAGE-only valida todo o envelope e descriptors READY/NONE/caminhos públicos, falha fechado se qualquer imagem/alt faltar, escapa texto e compõe links opcionais dentro de BlockBackground. Registry/PageBuilder criam CARDS só com mídia disponível; ARTICLE permanece no subconjunto canônico sem CARDS. MediaUsage futuro para imageIds distintos/background documentado, sem endpoint/migration/persistência antecipada.

Checks aprovados: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, pnpm build e git diff --check; inspeção de dependências com pnpm ls --depth 0. Suíte completa 434 testes (58 validation, 71 DB, 12 jobs, 3 storage, 122 API, 138 web, 30 Worker), além das rodadas focadas validation/web e typecheck. axe-core semântico zero violações; sem falhas de teste/compilação pendentes.

QA real 390×844, 700×900 e 1280×900 LIGHT/DARK: 1/2/3 colunas, adicionar/reordenar/editar/aplicar quatro cards, imagens carregadas com alt, HTML literal escapado, controles >=44px, foco solid, zero overflow e console limpo. A primeira abertura encontrou listener Next temporário remanescente; o PID foi confirmado pelo comando do repositório, encerrado de forma restrita e a segunda tentativa passou. Fixture removido, viewport restaurado, aba fechada, servidor encerrado e porta 3100 livre. test:e2e inexistente; sem CI remota, contraste global ou integração REST owner real.

Aceite cumprido. execute-loop/page-builder/architecture-guard/media-storage mantiveram PAGE-only, schema/Registry/Media.id e escopo sem persistência; nextjs-frontend/testing-qa/computer-use verificaram coleção, SSR, responsividade, interação, segurança e A11y. Commit: feat(builder): add cards block v1. Próximo: 5.18.

## LOOP 5.16 — Concluído

Estado inicial: 5.15 concluído em afd24b0, Git limpo. Escopo: IMAGE_TEXT V1 campos canônicos/title/text AST/imageId/imageAlt/imagePosition/button, IMAGE_LEFT/IMAGE_RIGHT, editor composto com aplicação conjunta, renderer SSR responsivo/Registry PAGE/ARTICLE/builder, mídia e texto seguros/testes/checks/documentação. Sem CARDS/Preview/publicação/persistência antecipados.

Entregue: schemas strict/versionados para IMAGE_TEXT e dados controlados; editor único compõe AST TEXT, imagem READY da Biblioteca, alt contextual/fallback ou decoração explícita, layout e CTA seguro com aplicação atômica do draft/callback async/falha retida. Renderer SSR reutiliza TEXT, IMAGE e BlockBackground validados, descriptor fresco correspondente, anchor somente externo e grid responsivo com ordem DOM estável. Registry completo PAGE/ARTICLE e PageBuilder criam IMAGE_TEXT apenas com imagem disponível. Contrato futuro de MediaUsage CONTENT_BLOCK/documentado, sem endpoints, migrations, Preview, publicação ou persistência antecipados.

Checks finais aprovados: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, pnpm build, pnpm ls --depth 0 e git diff --check. Suíte completa 423 testes (55 validation, 71 DB, 12 jobs, 3 storage, 122 API, 130 web, 30 Worker); testes focados de validation/web e typecheck web também aprovados. Primeira execução integral encontrou PostgreSQL desligado; Docker Desktop foi localizado, PostgreSQL/Redis/MinIO ficaram healthy e a repetição integral passou. axe-core semântico zero violações; sem falhas de teste/compilação pendentes.

QA real 390×844 e 1280×900 LIGHT/DARK: imagem PNG READY carregada com alt fallback, CTA seguro, uma/duas colunas, IMAGE_LEFT/IMAGE_RIGHT com ordem visual correta, HTML literal escapado, aplicação conjunta/status, sem overflow ou warnings/errors no console. Fixture removido, viewport restaurado, aba fechada, servidor encerrado e porta 3100 livre. test:e2e inexistente; sem CI remota, contraste global ou integração REST owner real.

Aceite cumprido. execute-loop/page-builder/architecture-guard/media-storage mantiveram contratos de mídia/versionamento/escopo; nextjs-frontend/testing-qa/computer-use verificaram composição, SSR, interação, responsividade, segurança e regressões. Commit: feat(builder): add image text block v1. Próximo: 5.17.

## LOOP 5.15 — Concluído

Estado inicial: 5.14 concluído em 909d600, Git limpo. Escopo: backgrounds DEFAULT/LIGHT/INSTITUTION/IMAGE controlados, imagem pronta da Biblioteca, callback validado/falha retida, wrapper SSR compartilhado com tema/descriptor resolvidos pelo caller e contraste por painel/tokens, testes/checks/documentação. Sem CSS livre, endpoints ou persistência antecipada.

Entregue: setBuilderBlockBackground valida modo/owner draft/Registry e seleção pronta para IMAGE, limpa backgroundMediaId ao trocar para fundo sem imagem. BackgroundEditor nomeado com labels/select/fieldset/44px/status/foco e callback clonado async/ref/busy, falha retém escolhas. BlockBackground SSR comum a TEXT/HERO/IMAGE: DEFAULT tokens, LIGHT par claro fixo, INSTITUTION exige tema público validado com contraste, IMAGE exige descriptor fresco compatível/READY/NONE e painel opaco legível/decorativo. Sem CSS/URL livres, endpoints/migrations/dependências. PAGE_BUILDER_BACKGROUNDS.md documenta contrato do caller e MediaUsage/transação futura.

Checks aprovados: pnpm --filter @fumep/web test (119 regressão inicial, 124 finais), pnpm --filter @fumep/web typecheck; pnpm format:check/lint/typecheck/test/build/peers check e git diff --check. Suíte completa 414 testes (52 validation, 71 DB, 12 jobs, 3 storage, 122 API, 124 web, 30 Worker). axe semântico zero violações, pares fixos/tema testados >=4.5:1; sem falhas de teste/compilação. QA real 390×844/1280×900 LIGHT/DARK: aplicação por teclado LIGHT/INSTITUTION/IMAGE/DEFAULT, pares computados corretos, imagem PNG carregada/decorativa e painel opaco, padrão escuro/remove imagem, foco solid/sem overflow/warnings. Fixtures removidos/viewport restaurado/aba fechada/servidor encerrado. Sem test:e2e, CI remota, contraste global ou integração REST owner.

Aceite cumprido. page-builder/architecture-guard/media-storage delimitaram modos/descriptor/MediaUsage sem persistência antecipada; nextjs-frontend/testing-qa/computer-use verificaram SSR/interação/legibilidade/A11y/regressões. Commit: feat(builder): add controlled block backgrounds. Próximo: 5.16.

## LOOP 5.14 — Concluído

Estado inicial: 5.13 concluído em 153b072, Git limpo. Escopo: anchor opcional como slug validado/único por owner inclusive ocultos, controle acessível async com falha retida, IDs nos renderers existentes, testes/checks/documentação. Sem backgrounds UI, novos endpoints ou persistência antecipada.

Entregue: setBuilderBlockAnchor aplica/remove apenas anchor (vazio → null), usando contrato comum de slug; parseBuilderBlocks recusa duplicatas inclusive em ocultos. AnchorEditor nomeado/label/help/foco/44px preserva valor na falha, com callback clonado async/ref/busy e editores estáveis. Renderers TEXT/HERO/IMAGE expõem id validado só em blocos visíveis. Constraint owner_anchor existente já testada no banco, sem migrations/endpoints/dependências. PAGE_BUILDER_ANCHORS.md documenta limites e responsabilidade do caller/backend na fase 6.

Checks aprovados: pnpm --filter @fumep/web test (118 inicial; 119 finais com teste TEXT), pnpm --filter @fumep/web typecheck; pnpm format:check/lint/typecheck/test/build/peers check e git diff --check. Suíte completa 409 testes (52 validation, 71 DB, 12 jobs, 3 storage, 122 API, 119 web, 30 Worker). axe semântico zero violações, sem contraste jsdom; sem falhas de teste/compilação. QA navegador 390×844 LIGHT /1280×900 DARK: duplicata oculta rejeitada com campo retido/foco status, aplicação/remoção por teclado com id gerado/removido, input 44px/foco solid, sem overflow/console warnings. Fixture removido, viewport restaurado/aba fechada/servidor encerrado. Sem test:e2e, CI remota, contraste global ou persistência REST owner real.

Aceite cumprido. page-builder/architecture-guard mantiveram unicidade/envelope/escopo; nextjs-frontend/testing-qa e computer-use verificaram contrato/interação/A11y/regressões. Commit: feat(builder): configure unique block anchors. Próximo: 5.15.

## LOOP 5.13 — Concluído

Estado inicial: 5.12 concluído em 957f7be, Git limpo. Escopo: exclusão do ContentBlock atual/usos CONTENT_BLOCK atômicos em repository interno condicionado ao owner resolvido, preservando outros usos/versões/Media; botão com confirmação local, callback validado/falha/concorrência/foco e testes reais PostgreSQL/UI/checks. Sem novos endpoints/salvamento amplo/Preview/publicação.

Entregue: removeBuilderBlock valida lista/contexto/Registry e normaliza posições sem mutação. PageBuilder confirma/cancela, bloqueia ações concorrentes, mantém estado na falha e edits de outros editores por IDs estáveis, permite draft vazio e devolve foco ao status. ContentBlockRepository interno valida owner/referências, serializa pelo parent e remove usos CONTENT_BLOCK e linha em transação, preservando mídia física/consumidores/snapshots/usos históricos. PAGE_BUILDER_DELETE.md explicita autorização pelo caller e integração futura na fase 6, sem novos endpoints/migrations/dependências.

Checks finais aprovados: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, pnpm build, pnpm peers check e git diff --check. Total 404 testes (52 validation, 71 DB, 12 jobs, 3 storage, 122 API, 114 web, 30 Worker). Testes focados web/DB e typecheck aprovados; axe semântico zero violações, sem contraste jsdom. Fixture inicial PostgreSQL com client.json falhou; primeira correção por inserts Drizzle resolveu. Formatação do teste corrigida e checks completos reexecutados. QA real local 390×844/1280×900 LIGHT/DARK: confirmação/cancelamento por teclado, foco solid, edição HERO retida após excluir TEXT, último bloco removido para draft vazio, sem overflow/console warnings. Fixture removido, viewport restaurado, aba fechada e servidor encerrado. test:e2e inexistente; sem CI remota, contraste global ou integração REST owner.

Aceite cumprido. page-builder/architecture-guard delimitaram exclusão atual versus histórico; drizzle-data-model/media-storage mantiveram atomicidade/compartilhamento; nextjs-frontend/testing-qa e computer-use verificaram interação/A11y/regressões. Commit: feat(builder): delete blocks with atomic media usage cleanup. Próximo: 5.14.

## LOOP 5.12 — Concluído

Estado inicial: 5.11 concluído em df5235d, Git limpo. Escopo: isVisible explícito com botão Ocultar/Exibir e indicação de oculto, editor mantido/Media.id preservado, snapshot validado/callback async/falha/concorrência, testes de renderers/teclado/foco/A11y/checks. Sem excluir/rotas/persistência própria/Preview/publicação.

Entregue: setBuilderBlockVisibility valida contexto/Registry/lista/boolean explícito e muda só isVisible, preservando dados/UUID/posição/mídia/versão/fundo/anchor. PageBuilder Ocultar/Exibir nomeado, aviso oculto com editor mantido, callback clonado async sem concorrência/lista muda só no sucesso/falha retém estado. Notificação revisada para devolver foco mesmo em falha repetida com mensagem idêntica. Renderers existentes continuam recusando blocos ocultos. PAGE_BUILDER_VISIBILITY.md documenta mídia ainda em uso e contrato do caller/fase 6. Sem novos endpoints/dependências.

Checks aprovados: pnpm --filter @fumep/web test (111) inicial/final, pnpm --filter @fumep/web typecheck, pnpm format:check/lint/typecheck/test/build/peers check e git diff --check. Suíte completa 397 testes (52 validation, 67 DB, 12 jobs, 3 storage, 122 API, 111 web, 30 Worker); recheck format/lint/typecheck integral após melhoria de foco/QA/remoção fixture. axe semântico zero violações sem contraste jsdom. Sem falhas de compilação/teste. QA real 390×844/1280×900 LIGHT/DARK: Ocultar/Exibir por teclado remove/restaura saída do renderer TEXT mantendo editor/edit não aplicado, aviso/ação/foco status visível, sem overflow/console warnings. Fixture removido/viewport restaurado/aba fechada/servidor encerrado e netstat sem listener 3100. test:e2e inexistente; sem CI remota/contraste global/integração owner real.

Aceite cumprido. page-builder/architecture-guard mantiveram conteúdo/mídia referenciados ao ocultar; nextjs-frontend/testing-qa e computer-use verificaram interação/renderer/falha repetida/A11y/regressões. Commit: feat(builder): control draft block visibility. Próximo: 5.13.

## LOOP 5.11 — Concluído

Estado inicial: 5.10 concluído em 802650e, Git limpo. Escopo: duplicação do conteúdo aplicado com novo UUID/posição final, deep clone/versionamento/contexto preservado, Media.id reutilizado/anchor limpo para unicidade, callback/falha/concorrência, botão acessível/teclado/foco/testes/checks. Sem persistência/rotas/controles de loops futuros.

Entregue: duplicateBuilderBlock valida Registry/contexto/lista, novo UUID/position final, deep clone de data/envelope, mesmas referências Media.id/visibilidade/fundo/versão e anchor limpo para unicidade. PageBuilder duplica conteúdo aplicado explicitamente informado, callback clonado async sem concorrência/falha altera original; keys mantêm edits não aplicados. Botão nomeado por bloco, status focável e nomes distintos dos formulários mediante ariaLabel contextual (defaults standalone preservados). PAGE_BUILDER_DUPLICATE.md documenta contrato/caller/limites, sem endpoints/dependências novas/MediaUsage sem owner persistido.

Checks aprovados: pnpm --filter @fumep/web test (109), pnpm --filter @fumep/web typecheck final, pnpm format:check/lint/typecheck/test/build/peers check e git diff --check finais. Total 395 testes (52 validation, 67 DB, 12 jobs, 3 storage, 122 API, 109 web, 30 Worker). axe detectou landmarks TEXT duplicados, primeira correção ariaLabel contextual resolveu; typecheck detectou cast de fixture de versão inválida, primeira correção por unknown resolveu, suíte completa reexecutada. Sem falhas/warnings React pendentes. axe semântico zero violações, sem contraste jsdom. QA real local 390×844/1280×900 LIGHT/DARK: duplicação/repetição por teclado, original manteve edit não aplicado/cópia conteúdo aplicado, formulários nomeados por posição, foco/status/botões 44px, sem overflow/console warnings. Fixture removido/viewport restaurado/aba fechada/servidor encerrado. test:e2e inexistente, sem CI remota/contraste global/integração owner real.

Aceite cumprido. page-builder/architecture-guard preservaram Media.id/contratos/anchor único; nextjs-frontend/testing-qa e computer-use verificaram interação/A11y/falhas/regressões. Commit: feat(builder): duplicate draft blocks safely. Próximo: 5.12.

## LOOP 5.10 — Concluído

Estado inicial: 5.9 concluído em 2a89681, Git limpo. Escopo: drag-and-drop nativo por handle, botões subir/descer, positions consecutivas/IDs estáveis e schemas/contexto validados, callback async sem concorrência/falha retida, preservação de editores locais/teclado/foco/A11y/checks. Sem controles dos próximos loops, persistência própria ou novos endpoints.

Entregue: reorderBuilderBlocks valida contratos/contexto/índices e preserva UUID/data/envelopes/Media.id, normalizando positions após movimento. PageBuilder tem handles HTML5 internos (drop externo ignorado), Subir/Descer nomeados/instruções/limites e callback clonado validado, ordem só muda após sucesso; falha mantém ordem/edits. IDs como keys preservam DOM/editores e conteúdo ainda não aplicado. Sem dependências novas, reorder de grid, endpoints ou persistência. PAGE_BUILDER_REORDER.md documenta contrato/limites.

Checks aprovados: pnpm --filter @fumep/web test (106), pnpm --filter @fumep/web typecheck, pnpm format:check/lint/typecheck/test/build/peers check e git diff --check. Total 392 testes (52 validation, 67 DB, 12 jobs, 3 storage, 122 API, 106 web, 30 Worker), axe semântico zero violações (sem contraste jsdom). Sem falhas de teste/build. QA real local 1280×900/390×844 LIGHT/DARK: arrasto entre handles e subir/descer por teclado alteraram ordem/callback, foco status visível, botões 44px/limites, sem overflow global ou erros/warnings. Fixture compacto ocultou formulários apenas para gesto; testes validaram identidade DOM/edit retido. Fixture removido, viewport restaurado, aba fechada, servidor encerrado. test:e2e inexistente; sem CI remota/integração owner/contraste global.

Aceite cumprido. page-builder/architecture-guard preservaram escopo/IDs/Media.id sem controles antecipados; nextjs-frontend/testing-qa e computer-use verificaram interação/gesto real/A11y/regressões. Commit: feat(builder): reorder blocks accessibly. Próximo: 5.11.

## LOOP 5.9 — Concluído

Estado inicial: 5.8 concluído em 8060074, Git limpo. Escopo: Page Builder básico Client com adição TEXT/HERO/IMAGE e edição por componentes registrados, contexto PAGE/ARTICLE, IDs/positions únicos, validação antes do callback async de draft, estado retido em falha, controles acessíveis/tokens/testes/checks. Sem endpoints/persistência própria/Preview/publicação/reordenação/duplicação/ocultação/exclusão.

Entregue: PageBuilder Client compartilhado, Registry exato para validação/contexto/editor, snapshots clonados e IDs/positions cumulativos/únicos. Adição configurada por editor existente, lista local só muda após sucesso do callback; falha mantém conteúdo e bloqueio concorrente. IMAGE depende de seleção disponível e alt válido/decoração explícita; HERO só PAGE. Sem salvamento/autoridade backend/rota antecipados; fase 6.1 implementa salvamento. PAGE_BUILDER_BASIC.md documenta montagem/caller/defaults de draft e limites.

Checks aprovados: pnpm --filter @fumep/web test (103), pnpm --filter @fumep/web typecheck, pnpm format:check/lint/typecheck/test/build/peers check e git diff --check. Total 389 testes (52 validation, 67 DB, 12 jobs, 3 storage, 122 API, 103 web, 30 Worker). Primeiro teste detectou chave inicial TEXT incorreta, corrigida de document para content; rodada seguinte detectou foco perdido ao desmontar adição, corrigido com foco após commit React. Terceira rodada verde, sem warnings/falha pendente. axe-core zero violações semânticas (sem contraste jsdom). QA real local LIGHT/DARK 390×844/1280×900 confirmou adição por teclado/callback/foco no status, foco visível/botões 44px/sem overflow/console limpo. Fixture removido, viewport restaurado, aba fechada/servidor encerrado. Sem test:e2e/CI remota/contraste global/integração owner real.

Aceite cumprido. execute-loop/page-builder/architecture-guard mantiveram escopo de draft sem controles futuros; nextjs-frontend/testing-qa e computer-use verificaram interação/SSR/A11y/regressões e foco. Commit: feat(builder): add basic page builder. Próximo: 5.10.

## LOOP 5.8 — Concluído

Estado inicial: 5.7 concluído em `ec8f2b5`, Git limpo. Escopo: IMAGE v1 schema/envelope, imageId obrigatório/alt/caption/link/decorative, editor Client sem persistência e renderer SSR com descriptor disponível/alt contextual ou fallback válido; registro completo PAGE/ARTICLE, testes/A11y/checks. Sem owner/endpoints/Preview/publicação ou outros blocos.

Entregue: contrato IMAGE strict/versionado e descriptor separado do JSONB, editor com seleção validada/alt contextual ou fallback seguro/decoração explícita/caption/link, callback validado async sem concorrência e recuperação de falha. Renderer SSR figure/figcaption/Next.Image, UUID correspondente e disponibilidade declarada no descriptor, alt contextual preferencial, fallback válido ou falha fechada; decoração com link exige caption como nome acessível. Texto escapado, links seguros, estilos responsivos por tokens e registro PAGE/ARTICLE. Helper de imagens disponíveis compartilhado com HERO, sem autoridade backend, endpoint ou persistência antecipados. IMAGE_BLOCK_V1.md/BLOCK_REGISTRY.md atualizados.

Checks aprovados: validation focado (52), web focado (97), pnpm format:check/lint/typecheck/test/build/peers check e git diff --check. Suíte completa: 383 testes (52 validation, 67 DB, 12 jobs, 3 storage, 122 API, 97 web, 30 Worker); axe-core semântico zero violações, contraste desativado em jsdom. QA local 390×844/1280×900 LIGHT/DARK: imagem sintética carregada, fallback/alt contextual, caption literal, link perigoso bloqueado, decoração/link nomeado, teclado/status/foco visível, controles 44px e sem overflow global/erros no console. Fixture removido, viewport restaurado, aba fechada e servidor encerrado (porta 3100 sem listener). A primeira tentativa de iniciar servidor encontrou a porta ocupada pelo fixture anterior; reutilização e encerramento resolveram. Nenhuma falha pendente. test:e2e inexistente; não certifica integração real/contraste global/CI remota.

Aceite cumprido. page-builder/architecture-guard preservaram referências Media.id e escopo isolado; nextjs-frontend/testing-qa verificaram SSR, interação, acessibilidade e regressões. computer-use orientou QA no navegador disponível. Commit: feat(builder): add image block v1. Próximo loop: 5.9.

## LOOP 5.7 — Concluído

Estado inicial: 5.6 concluído em `7f9ab6f`, Git limpo. Escopo: editor HERO Client controlado, seleção de imagens READY disponíveis fornecidas pelo caller, escolha informativa/decorativa explícita e CTA seguro; renderer SSR com descriptor de imagem resolvido pelo caller/URL same-origin do portal, definição completa PAGE no Registry, testes e checks. Sem rede/persistência própria, endpoints, Preview/publicação, lookup autorizado ou outros blocos.

Entregue: HeroBlockEditor com seleção validada/filtrada, alt contextual ou decoração explicitamente marcada, remoção pareada de imageId/alt, CTA opcional seguro, draft inválido retido, onApply validado/async sem concorrência e feedback/status focável. HeroBlockRenderer valida envelope/visibilidade e descriptor UUID correspondente IMAGE/READY/NONE/MIME/dimensões/src do portal, falha fechada sem conteúdo bruto, Next/Image unoptimized/escapado, sem vídeo ou endereço interno. Descriptor de transporte é separado do JSONB e não autoriza owner/publicação. Registry frontend inclui HERO v1 PAGE e mantém TEXT PAGE/ARTICLE. Layout controlado, tokens herdados, focus-visible e campos HERO 44px. HERO_EDITOR_RENDERER_V1.md documenta responsabilidades do caller/limitações.

Checks aprovados: `pnpm --filter @fumep/web test` (85), `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` final (366: 47 validation, 67 DB, 12 jobs, 3 storage, 122 API, 85 web, 30 Worker), `pnpm build`, `pnpm peers check`, `git diff --check`. Recheck integral após QA/ajuste CSS/remoção fixture. axe-core semântico em jsdom para alt informativo/decorativo/CTA/feedback: zero violações, sem contraste/layout. Primeiro prettier detectou chave CSS fora de lugar; primeira correção resolveu, warnings de variáveis não usadas também removidos. Nenhuma falha pendente/migration/dependência nova.

QA local via navegador: 1280×900/390×844 LIGHT/DARK; imagem sintética carregada, HERO duas/uma coluna, sem overflow global, tabelas roláveis localmente/por teclado, foco visível/status, CTA perigoso e alt vazio informativo bloqueados, decoração alt="" e aplicação TEXT por teclado. Fixture/pixel removidos, porta 3100 sem listener após encerrar servidor, viewport restaurado e aba fechada. Não certifica contraste global/E2E/integração real; test:e2e inexistente e CI remota não executada. computer-use orientou QA via navegador disponível (sem automação Windows nativa); inspeção mobile levou ao ajuste de espaçamento/campos 44px.

Aceite cumprido. page-builder/architecture-guard mantiveram UI/renderer sem autoridade/persistência/gateway antecipado; nextjs-frontend e testing-qa verificaram SSR, interação, segurança, A11y e regressões. Commit: `feat(builder): edit and render image-only hero`. Próximo loop: 5.8.

## LOOP 5.6 — Concluído

Estado inicial: 5.5 concluído em `7308e78`, Git limpo. Escopo: contrato Zod HERO v1 somente imagem, title/description/imageId/imageAlt/button, alt explícito informativo ou vazio decorativo, URLs seguras, envelope comum, limites, testes e documentação/checks. Sem editor/renderer, registro incompleto, I/O de mídia, endpoints/Preview/publicação ou outros blocos.

Entregue: heroBlockDataSchemaV1/heroBlockSchemaV1 e tipos/limites; title não branco, description opcional, imageId UUID opcional conforme exemplo canônico, imageAlt pareado (informativo não branco ou exatamente vazio decorativo), CTA com label não branco/URL segura. Objetos strict sem vídeo, URL física, flags duplicadas ou CSS; safeExtend preserva refinamentos comuns. HERO_BLOCK_V1.md documenta validações backend futuras. Registry operacional permanece somente TEXT completo.

Checks aprovados: `pnpm --filter @fumep/validation test` inicial/final (44), `pnpm format:check`, `pnpm lint`, `pnpm typecheck` final, `pnpm test` (353: 44 validation, 67 DB, 12 jobs, 3 storage, 122 API, 75 web, 30 Worker), `pnpm build`, `pnpm peers check`, `git diff --check`. Typecheck inicial detectou import ESM de teste sem extensão; corrigido para index.js na primeira correção e revalidado. Nenhuma falha pendente, dependência/migration/UI nova. Browser/E2E/CI remota não executados, script test:e2e inexistente; acessibilidade de UI pertence ao 5.7.

Aceite cumprido. page-builder/architecture-guard mantiveram contrato image-only/UUID/versionamento sem antecipar UI ou autorização de mídia; testing-qa cobriu alt/CTA, limites e regressões. Commit: `feat(builder): define image-only hero block v1`. Próximo loop: 5.7.

## LOOP 5.5 — Concluído

Estado inicial: 5.4 concluído em `97c28b8`, Git limpo. Escopo: renderer público TEXT v1 SSR com validação do envelope/versão, nós React escapados, semântica acessível e estilos institucionais controlados; definição TEXT completa no Registry frontend, testes e checks. Sem rota pública/Preview, endpoints, persistência, backgrounds/anchors UI, Page Builder básico ou outros blocos.

Entregue: TextBlockRenderer sem hooks/I/O/HTML interpretado, envelope/versão validados antes do rendering, dados inválidos/tipos ou versões desconhecidos/ocultos retornam null; nós semânticos para todos os recursos TEXT, escaping de strings, links validados na mesma aba e ausência de links sem nome em drafts incompletos. Tabela com headers scope=col/caption e região de rolagem focável; largura de leitura 75ch, wrapping/novas linhas, sublinhado/focus-visible e cores herdadas. frontendBlockRegistry compõe somente TEXT v1 completo nos contextos PAGE/ARTICLE, sem React no módulo compartilhado API; docs registram esta separação e reutilização pelo Preview futuro. Sem nova rota ou consumidor antecipado.

Checks aprovados: `pnpm --filter @fumep/web test` (75), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm test` (348: 39 validation, 67 DB, 12 jobs, 3 storage, 122 API, 75 web, 30 Worker), `pnpm build`, `pnpm peers check`, `git diff --check`; prettier CSS recheck após ajustar largura. axe-core: zero violações semânticas no fixture SSR em jsdom, sem contraste/layout. Browser/QA visual/E2E/CI remota não executados; script test:e2e inexistente. Sem dependência/migration nova ou falha pendente.

Aceite cumprido. page-builder/architecture-guard preservaram schema versionado/Registry e renderer compartilhável sem antecipar Preview/publicação; nextjs-frontend manteve SSR/tokens/semântica; testing-qa cobriu segurança/A11y/versões/bindings/regressões. Commit: `feat(builder): render structured text safely`. Próximo loop: 5.6.

## LOOP 5.4 — Concluído

Estado inicial: 5.3 concluído em `f17e3fd`, Git limpo. Escopo: componente editor visual estruturado TEXT v1 com trechos/formatação, links, parágrafos/títulos/destaques, listas e tabela simples, validação antes de emitir dados ao caller, desfazer/refazer local, controles acessíveis/teclado/foco/tokens, testes e checks. Sem JSON/HTML livre, persistência própria, endpoints, renderer público, registro incompleto ou Page Builder básico.

Entregue: componente Client TextBlockEditor e subeditores de conteúdo/trechos/tabela, reducer com histórico local limitado a 20 operações, validação Zod compartilhada antes de onApply, draft inválido retido para correção, callback async com bloqueio concorrente e recuperação de falha. Controles nativos/labels/fieldset, URLs com aria-invalid e ajuda, feedback/foco no status, tabela semântica com rolagem focável e estilos por tokens existentes. Dados iniciais inválidos não são substituídos. Nenhuma persistência/rede/autoridade sobre proprietário. TEXT_EDITOR_V1.md documenta montagem por key e responsabilidade futura do caller. Registry continua vazio até definição completa no 5.5.

Checks aprovados: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (342: 39 validation, 67 DB, 12 jobs, 3 storage, 122 API, 69 web, 30 Worker), `pnpm build`, `pnpm peers check`, `git diff --check`; web focado inicial 68 testes. axe-core nos testes ativos/com erro e desabilitados: zero violações em jsdom, contraste desativado por ausência de layout. Browser/QA visual/contraste/E2E/CI remota não executados; script test:e2e inexistente. Dependência dev axe-core instalada do cache existente; primeira tentativa falhou por store incompatível, segunda com store dos módulos existentes resolveu sem reinstalar. Nenhuma falha de teste/build pendente.

Aceite cumprido. page-builder/architecture-guard preservaram estrutura versionada sem HTML/CSS livre, publicação ou integração antecipada. nextjs-frontend manteve interação Client isolada, tokens/foco e controles nativos; testing-qa cobriu segurança/estado/A11y/regressões. Commit: `feat(builder): add structured text editor`. Próximo loop: 5.5.

## LOOP 5.3 — Concluído

Estado inicial: 5.2 concluído em `b61c1d9`, Git limpo. Escopo estrito: schemas Zod TEXT v1 com JSON estruturado para texto rico simples, título/estrutura/formatações canônicas e URLs seguras; composição type TEXT/schemaVersion 1 com contrato comum; testes, limites de segurança, documentação e checks. Sem HTML livre, registro incompleto, editor, renderer, endpoints, preview ou publicação.

Entregue: schemas/tipos TEXT v1 de data/documento/nós/inline/URLs e envelope composto com contrato comum; título opcional, parágrafos, headings 2/3/4, destaque, listas ordenadas/não ordenadas, links, tabela simples retangular com headers, marcas bold/italic controladas. Conteúdo JSON de profundidade fixa/whitelist strict, sem HTML interpretado, atributos/CSS/iframe/blocos/links aninhados. HTTP(S) sem credenciais, paths root-relative e anchors seguros; protocolos/ofuscações/controles perigosos bloqueados. TEXT_V1_LIMITS documenta tamanho/quantidade e limite agregado incluindo URLs/listas/tabelas. Draft vazio estrutural válido não é aprovação de publicação; Registry segue vazio, sem placeholders. Docs/TEXT_BLOCK_V1.md registra contrato versionado e obrigação futura de validação backend/renderer escapado.

Checks aprovados: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` final (334: 39 validation, 67 DB, 12 jobs, 3 storage, 122 API, 61 web, 30 Worker), `pnpm build`, `pnpm peers check`, `git diff --check` e validation focado (39). Recheck completo após fortalecer teste de limites agregados. Nenhuma falha de teste/build, migration, dependência ou interface nova. Acessibilidade de UI/rendering ainda pertence aos respectivos loops. Browser E2E/axe/CI remota não executados; script test:e2e inexistente.

Aceite cumprido. page-builder/architecture-guard mantiveram JSONB versionado/blocos predefinidos, segurança por estrutura controlada sem antecipar editor/renderer/publicação; testing-qa cobriu recursos, URLs, limites e regressões. Commit: `feat(builder): define safe structured text block v1`. Próximo loop: 5.4.

## LOOP 5.2 — Concluído

Estado inicial: 5.1 concluído em `35ad5d9`, Git limpo. Escopo: schema Zod comum id/type/position/isVisible/schemaVersion/background/anchor e backgroundMediaId exigido para fundo IMAGE pelo contrato especializado; catálogo de tipos canônicos como identificadores sem registrar blocos; contratos estritos sem CSS/grid/URL física, testes, checks e documentação. Sem schemas de data dos blocos, editor, renderer, persistência, preview ou publicação.

Entregue: contentBlockCommonSchema e tipos inferidos, enum dos 23 identificadores canônicos e quatro fundos; UUID/INTEGER PostgreSQL/boolean explícitos, schemaVersion obrigatório e positivo, anchor nullable/opcional slug até 100, backgroundMediaId UUID requerido para IMAGE por refinamento com path de erro. Objeto strict, sem coerção/defaults silenciosos ou propriedades livres. safeExtend preserva refinamentos e prepara composição versionada futura; Registry permanece vazio. Docs/CONTENT_BLOCK_COMMON.md documenta limites do contrato e regras ainda dependentes de consumidores backend.

Checks aprovados: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (327: 32 validation, 67 DB, 12 jobs, 3 storage, 122 API, 61 web, 30 Worker), `pnpm build`, `pnpm peers check`, `git diff --check` e validation focado (32). Sem falhas, migration, dependência ou interface nova. Acessibilidade visual não se aplica ao schema puro; Browser E2E/axe/CI remota não executados, script test:e2e inexistente.

Aceite cumprido. page-builder/architecture-guard seguiram a precedência especializada para IMAGE+Media.id sem antecipar backgrounds/anchors UI, validação de existência de mídia ou autorização/publicação. testing-qa cobriu contrato estrito, ausência de coerção e safeExtend, além de regressões da suíte completa. Commit: `feat(builder): define common content block contract`. Próximo loop: 5.3.

## LOOP 5.1 — Concluído

Estado inicial: 4.17 concluído em `d4c4b6e`, Git limpo. Escopo estrito: BlockRegistry central vazio e infraestrutura agnóstica de UI para definições versionadas com schema Zod, renderer/editor, label e allowedContexts; lookup por tipo/versão/contexto, proteção contra registro duplicado/inválido e testes. Sem schema comum, blocos concretos, endpoints, renderer público, editor, preview ou publicação.

Entregue no entrypoint @fumep/validation: tipos BlockDefinition/BlockContext/BlockRegistry, factory createBlockRegistry e blockRegistry vazio. Definições são controladas pelo código, versionadas, validadas, sem UI/banco/I/O no pacote compartilhado. Lookup exato sem fallback implícito de versão, filtros PAGE/ARTICLE, duplicações proibidas e metadados/contextos/listas frozen com cópia dos inputs. Bindings renderer/editor opacos/genéricos preservam importação segura pela API sem React/Next/browser. Testes sintéticos não registram blocos V1. Docs/BLOCK_REGISTRY.md explica escopo e composição futura.

Checks aprovados: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (322: 27 validation, 67 DB, 12 jobs, 3 storage, 122 API, 61 web, 30 Worker), `pnpm build`, `pnpm peers check`, `git diff --check` e suíte validation focada (27) após reforçar lookup fail-closed para versão/contexto inválidos. Nenhuma migration/dependência/interface nova; acessibilidade visual não se aplica à infraestrutura pura. Browser E2E/axe/CI remota não executados, script test:e2e inexistente. Nenhuma falha pendente.

Aceite cumprido. page-builder/architecture-guard mantiveram contrato canônico e catálogo vazio sem antecipar blocos; testing-qa verificou isolamento, versões, metadados, Zod e bindings, além da suíte existente. Commit: `feat(builder): add empty versioned block registry`. Próximo loop: 5.2.

## LOOP 4.17 — Concluído

Estado inicial: 4.16 concluído em `30ec18d`, Git limpo. Escopo: Institution.logo_light_id/logo_dark_id nullable via migration, seleção administrativa pela biblioteca sem duplicação, MediaUsage transacional/idempotente e remoção com owner, validação IMAGE READY/disponível, logo público same-origin/fallback escuro, interface/testes/checks/documentação. Sem Page Builder.

Entregue: migration aditiva 0019/FKs RESTRICT; InstitutionLogoRepository com lock do proprietário/usos/mídias e validação IMAGE READY/NONE/MIME permitido, atualização/auditoria atômicas; remoção dos usos na transação de exclusão da instituição com rollback se dependências impedirem delete; GET/PATCH logos ADMIN/sessão/CSRF/contrato estrito/OpenAPI/projeção de IDs; seletor de logos nos resultados da Biblioteca sem cópia/upload; paths públicos seguros por instituição ativa e proxy Next same-origin, leitura limitada/sem credenciais/MIME permitido/no-store/nosniff; thumbnail WEBP quando existente, fallback original; SSR logo responsivo/clicável para home com variantes LIGHT/DARK/SYSTEM selecionadas por CSS e fallback dark ausente. Documentação em INSTITUTION_LOGOS.md. Não houve dependências novas, SVG editorial liberado, login frontend, seed de credenciais, header completo ou Page Builder antecipado.

Checks aprovados: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (318: 23 validation, 67 DB, 12 jobs, 3 storage, 122 API, 61 web, 30 Worker), `pnpm build`, `pnpm peers check` e `git diff --check`. Testes focados DB/API/web e recheck API após documentação OpenAPI. Todas as migrations em banco novo `portal_fumep_loop_4_17_test` + suíte DB final (67); migration aditiva aplicada também à fixture existente do Worker 4.16. Fixtures preservadas; registros/objetos de testes UUID limpos. Browser E2E/axe/QA visual/CI remota não executados; script test:e2e inexistente. Nenhum preview foi iniciado.

Falhas resolvidas: import Drizzle indevido na API movido para repository DB; declaração OpenAPI corrigida; nome de variável do teste vedado pelo lint e inferência UUID do helper ajustados; fixture FAILED corrigida para incluir a data obrigatória do lifecycle e reposicionada para não mascarar o teste SVG. Rechecks verdes, nenhuma falha pendente.

Aceite cumprido. Skills architecture-guard/security-access preservaram configuração ADMIN e entrega pública sem MinIO exposto; drizzle-data-model/media-storage garantiram FKs e MediaUsage transacional; nestjs-api/nextjs-frontend mantiveram contratos, SSR e foco; testing-qa verificou PostgreSQL/MinIO reais e testes web. Commit: `feat(media): configure institutional logos from library`. Próximo loop: 5.1.

## LOOP 4.16 — Concluído

Entregue na retomada: migration aditiva 0018/lifecycle com constraints/índice/FK; MediaDeletionRepository/locks dedicados/reserva de tentativa persistida/cleanup/auditoria final atômicos no PostgreSQL; bloqueio transacional de usos/busca/duplicatas/seleção/processamento; DELETE 202 e retry ADMIN com sessão/CSRF/escopo/contratos Zod/OpenAPI; DELETE_MEDIA no Worker separado e reconciler startup/60s com cursor/locks/shutdown; confirmação acessível na biblioteca e recuperação explícita por UUID. Docs/MEDIA_DELETION.md e CI com provisionamento de banco de fixture isolado. Sem dependências novas, outbox genérico, JWT, lixeira/restauração ou logos antecipados.

Checks finais aprovados: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (300: 22 validation, 62 DB, 12 jobs, 3 storage, 118 API, 53 web, 30 worker), `pnpm build`, `pnpm peers check`, testes focados DB/web/API/Worker e `git diff --check`. Migration 0018 gerada/aplicada localmente; todas as migrations do zero em `portal_fumep_loop_4_16_test` + 62 testes DB. Recheck Worker com 30 testes após fortalecer quedas de processo filho em duas fronteiras (variante/original). Banco de fixture preservado; triggers temporárias de falha de auditoria removidas, chaves UUID limpas, recursos Redis exclusivos. Prettier workflow aprovado. Browser E2E/axe/QA visual/CI remota não executados; script test:e2e inexistente.

Falhas resolvidas: ReservedSql sem options/begin de runtime exigidos pelo Drizzle, substituído por cliente dedicado max=1 sem reciclagem até unlock/end; tipos do mock fetch e formatação corrigidos. Injeção de desconexão do backend no mesmo processo expôs falha interna do driver e timeout; cenário de queda real passou a rodar em processo filho isolado, com saída esperada e verificação do estado/objetos/replay no processo pai. Isso valida recuperação após crash, não promete que toda queda de dependência seja tratada sem reiniciar o Worker. Nenhuma falha de check pendente. Logs ERROR de enqueue são fixtures esperadas de indisponibilidade.

Aceite cumprido. architecture-guard manteve MEDIA-002 nos contratos autorizados; drizzle-data-model orientou durabilidade/constraints/concorrência; media-storage/jobs-worker orientaram idempotência/ordem/recuperação/limite persistido; security-access/nestjs-api mantiveram autorização/CSRF/projeções seguras; nextjs-frontend preservou foco/status/SSR; testing-qa cobriu PostgreSQL/Redis/MinIO reais e processos isolados. Commit: `feat(media): implement durable deletion and recovery lifecycle`. Próximo loop: 4.17.

### Histórico da entrega parcial e autorização

Retomada de implementação: estado inicial `c8284ec`, Git limpo. Escopo estrito: migration/lifecycle, bloqueio de seleção/usos/processamento, solicitação/retry REST autorizados, DELETE_MEDIA/recuperação separados, interface mínima de confirmação e testes/checks aplicáveis. Não antecipar 4.17.

Estado inicial: 4.15 concluído em `ab0f177`, Git limpo.
Escopo independente entregue antes da autorização: guard interno transacional com autorização fresca por categoria, MediaUsage, auditoria de bloqueio, proteção contra processamento/concurrência e testes. Exclusão física/endpoint/avanço dependiam da decisão MEDIA-002; sem novo estado/fila/soft delete silencioso.

Entregue: MediaDeletionGuard interno com lock FOR UPDATE, autorização sobre a categoria persistida, rejeição de mídia em uso/PROCESSING antes de qualquer operação e auditoria MEDIA_DELETE_BLOCKED transacional sem expor owners. A operação autorizada permanece dentro da transação/lock, não como preflight reutilizável. Testes PostgreSQL reais comprovam bloqueio, autorização, ausência e espera concorrente de MediaUsage pelo lock efetivo. Nenhum endpoint ou exclusão física foi disponibilizado.

Checks aprovados: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (278: 21 validation, 56 DB, 12 jobs, 3 storage, 117 API, 49 web, 20 worker), `pnpm build`, `pnpm peers check` e `git diff --check`. Falhas resolvidas: formatação do guard; teste intermitente de categorias por diferença entre relógios da aplicação/PostgreSQL, corrigido usando SQL now() também em updated_at, sem migration. Recheck completo verde. Browser E2E/axe/QA visual/CI remota não executados; script test:e2e inexistente.

Aceite completo ainda pendente. Na entrega parcial anterior, architecture-guard exigiu pausa da exclusão física: uma queda após remover arquivos e antes do commit deixa Media selecionável sem arquivos; locks e compensação em memória não recuperam esse cenário. MEDIA-002 solicitou autorização para lifecycle durável separado do processamento, DELETE_MEDIA no Worker e recuperação/reconciliação, agora concedida conforme registro abaixo. CURRENT_LOOP permanece 4.16; 4.17 não iniciado. Commit parcial: `feat(media): guard deletion and document durable lifecycle blocker`.

Fechamento documental em 2026-09-17: responsável autorizou MEDIA-002. architecture-guard orientou formalização consistente no Storage, Jobs, modelo lógico e plano. Contrato define NONE/REQUESTED/FAILED, intenção/auditoria antes do enqueue, indisponibilidade de novos usos, advisory lock com conexão pinned e row lock de cleanup, orçamento de três tentativas persistido, reconciliação startup/60s com cursor e retry explícito ADMIN após FAILED. Respostas REST, constraints, erros sanitizados, auditoria, falhas/crash e matriz de testes fechados. Nenhuma alteração de código/schema/migration/job/endpoint nesta etapa; loop ainda parcial, não avançado. Commit documental: `docs(media): close authorized deletion lifecycle and recovery contract`.

Checks repetidos no fechamento documental: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (278 testes), `pnpm build`, `pnpm peers check` e `git diff --check`, todos verdes. Log ERROR de enqueue pertence à fixture esperada de indisponibilidade simulada. Sem falha de check pendente; testes do novo lifecycle ainda devem ser implementados no 4.16. Browser E2E/axe/CI remota não executados.

## LOOP 4.15 — Concluído

Estado inicial: 4.14 concluído em `2754173`, Git limpo.
Escopo: tabela canônica media_usages UUID/TIMESTAMPTZ/FK/índices, sincronização interna transacional/idempotente por entidade, consulta/remoção de uso, concorrência/integridade/migration limpa e checks. Sem endpoint de escrita de ownership arbitrário nem consumidores futuros.

Entregue: schema/migration 0017 media_usages com FK RESTRICT, índices, checks de campos não vazios e unicidade da referência; MediaUsageRepository interno com synchronize/findForMedia/hasUsage/removeEntity. Validação/deduplicação/normalização, advisory transaction lock por owner e lock ordenado das mídias, preservação de IDs/datas dos usos mantidos e remoção apenas da entidade alvo. Compatível com transação externa do consumidor; não aceita ownership de navegador como autorização. Consumidores devem resolver/autorizar a entidade real; integração de logos/Builder permanece nos loops próprios.

Checks aprovados: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (275: 21 validation, 53 DB, 12 jobs, 3 storage, 117 API, 49 web, 20 worker), `pnpm build`, `pnpm peers check`, `pnpm --filter @fumep/db typecheck`, `pnpm --filter @fumep/db test`, Prettier workflow e `git diff --check`. Drizzle gerou/aplicou 0017 localmente. Todas as migrations aplicadas do zero em `portal_fumep_loop_4_15_test` + 53 testes de banco; fixture preservada, nenhuma base existente sobrescrita. Testes cobrem FK/checks/unicidade/IDs estáveis/isolamento/referência ausente/remoção/concorrência/rollback externo. Sem dependências novas. Browser E2E/axe/QA visual/CI remota não executados; script test:e2e inexistente.

Aceite cumprido, nenhuma falha pendente. drizzle-data-model/media-storage orientaram modelo polimórfico canônico/integridade/idempotência, testing-qa validou migrations e concorrência real. Nenhum endpoint externo inseguro ou consumidor antecipado. Commit: `feat(db): track media usages with transactional synchronization`.

## LOOP 4.14 — Concluído

Estado inicial: 4.13 concluído em `6b8eb39`, Git limpo.
Escopo: busca administrativa parametrizada por nome/alt/caption/categoria, filtro de categoria, paginação limitada, projeção autorizada sem storage interno e interface SSR mínima; contratos/testes/checks. Sem MediaUsage/exclusão/logos/biblioteca pública.

Entregue: GET media com contrato Zod/OpenAPI/no-store, Drizzle parametrizado com escape literal de wildcards, nome/alt/caption/nome de categoria e filtro UUID, paginação limitada/ordenação determinística, itens/total igualmente escopados. Projeção explícita sem chave/checksum/uploader/erro interno/URL MinIO. Interface SSR /admin/media/library com formulário GET, labels, resultados escapados/estado vazio e links de paginação preservando filtros. Sem preview físico ou mutações de mídia.

Checks aprovados: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (271: 21 validation, 49 DB, 12 jobs, 3 storage, 117 API, 49 web, 20 worker), `pnpm build`, `pnpm peers check`, `pnpm --filter @fumep/db --filter @fumep/api --filter @fumep/web test`, Prettier workflow e `git diff --check`. Falha de tipo Record no helper de testes corrigida em uma tentativa, rechecks completos verdes. Testes reais cobrem quatro campos/categoria/paginação/isolamento/total, queries inválidas/literais/injeção/sem auditoria de leitura; SSR/transporte cobrem labels/escape/links/no-store. Sem schema/migration/dependências novas. Browser E2E/axe/QA visual/CI remota não executados; script test:e2e inexistente.

Aceite cumprido, nenhuma falha pendente. drizzle-data-model/security-access mantiveram consultas parametrizadas/escopo; nestjs-api definiu projeção pública administrativa; nextjs-frontend orientou SSR com searchParams assíncrono e GET nativo; testing-qa cobriu campos e isolamento. Commit: `feat(media): search authorized library with bounded pagination`.

## LOOP 4.13 — Concluído

Estado inicial: 4.12 concluído em `b180f40`, Git limpo.
Escopo: completar MediaCategory com contratos, listagem/criação/edição de nome/slug/exclusão sem uso, auditoria transacional, escopo institucional imutável, formulário administrativo mínimo e testes. Preservar schema canônico existente, sem busca/MediaUsage.

Entregue: contratos Zod, GET/POST categories e PATCH/DELETE categories/:id com OpenAPI, sessão/CSRF/escopo e projeção sem metadados internos; criação/edição/exclusão com auditoria transacional, lock/reautorização da categoria e FK RESTRICT preservando mídias. Instituição imutável; conflitos 409. Interface /admin/media/manage-categories com labels, foco, confirmação de exclusão, status amigável e proxy same-origin. Fluxo mínimo upload-categories preservado/auditado; conflito de slug agora 409. Schema/semântica canônica UNIQUE(institution_id,slug) preservados, sem inventar unicidade global NULL.

Checks aprovados: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (265: 20 validation, 48 DB, 12 jobs, 3 storage, 116 API, 46 web, 20 worker), `pnpm build`, `pnpm peers check`, `pnpm --filter @fumep/db --filter @fumep/api --filter @fumep/web test`, Prettier workflow, ESLint/Prettier focados na última anotação OpenAPI e `git diff --check`. Falha de formatação media.store.ts corrigida; rechecks completos verdes. Sem schema/migration/dependências novas. Testes reais cobrem CRUD/auditoria/CSRF/escopo/conflito/instituição imutável/exclusão referenciada; jsdom cobre criação/edição/confirmar exclusão/conflito/foco. Browser E2E/axe/QA visual/CI remota não executados; script test:e2e inexistente.

Aceite cumprido, nenhuma falha pendente. drizzle-data-model/security-access orientaram lock, integridade e escopo imutável; nestjs-api orientou contratos/erros; nextjs-frontend reaproveitou estilo e transporte; testing-qa cobriu gestão e regressões. Commit: `feat(media): manage institution-scoped media categories`.

## LOOP 4.12 — Concluído

Estado inicial: 4.11 concluído em `bde4c2d`, Git limpo.
Escopo: consolidar rejeição backend de SVG por EDITOR autorizado nas rotas de imagem/PDF, extensões/MIME disfarçados, ausência de gravação/auditoria/enqueue e documentação. Sem novos formatos ou categorias.

Entregue: regressões Supertest com EDITOR autorizado e 16 combinações (SVG verdadeiro, uppercase, conteúdo SVG disfarçado como PNG/PDF, extensão dupla e bytes válidos com extensão SVG). Rejeição 400 antes de MinIO, Media, auditoria e enqueue, confirmada por spies/contagens reais. Allowlists de produção já atendiam o bloqueio; não foram alteradas. Política SVG editorial V1 documentada.

Checks aprovados: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (258: 19 validation, 47 DB, 12 jobs, 3 storage, 115 API, 42 web, 20 worker), `pnpm build`, `pnpm peers check`, Prettier workflow e `git diff --check`. Nenhuma falha pendente; ERROR do enqueue pertence à fixture de indisponibilidade esperada. Browser E2E/axe/QA visual/CI remota não executados; script test:e2e inexistente.

Aceite cumprido. media-storage/security-access mantiveram bloqueio SVG V1 sem exceção editorial; testing-qa comprovou rejeição por backend independente do HTML. Commit: `test(media): prove editorial SVG rejection without side effects`.

## LOOP 4.11 — Concluído

Estado inicial: 4.10 concluído em `f042488`, Git limpo.
Escopo: PDF até 30 MB com extensão/MIME/magic bytes, SHA-256, original UUID no MinIO, Media DOCUMENT READY sem fila Sharp, autorização institucional/CSRF/duplicidade, formulário mínimo e testes/checks. Sem gestão completa de categorias, MediaUsage ou visualizador PDF.

Entregue: POST media/documents com contratos Zod/OpenAPI, validação inclusiva de 30 MiB, extensão/MIME/assinatura PDF, checksum obrigatório, original documents/UUID.pdf e auditoria transacional; READY sem enfileirar Sharp. Duplicidade por tipo/checksum/escopo, escolha existente reautorizada e confirmação de cópia independente. Formulário PDF/proxy same-origin reutilizam o fluxo acessível de imagem com IDs distintos, CSRF e foco restaurado.

Checks aprovados: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (256: 19 validation, 47 DB, 12 jobs, 3 storage, 113 API, 42 web, 20 worker), `pnpm build`, `pnpm peers check`, `pnpm --filter @fumep/api --filter @fumep/web test`, Prettier workflow e `git diff --check`. Sem schema/migration/dependências novas. Testes MinIO/PostgreSQL reais cobrem bytes/checksum/auditoria, exato máximo/excesso, extensão/MIME/assinatura, CSRF/escopo/duplicidade e compensação/falhas. Vitest/jsdom cobrem labels/IDs, transporte, duplicata e foco. Browser E2E/axe/QA visual/CI remota não executados; não existe script test:e2e.

Aceite cumprido, nenhuma falha pendente. media-storage orientou limites e assinatura (não parser completo/antivírus); jobs-worker restringiu fila a imagens; security-access/nestjs-api preservaram autorização; nextjs-frontend orientou reaproveitamento sem IDs duplicados; testing-qa cobriu limites e regressões. Commit: `feat(media): support authorized PDF uploads without image jobs`.

## LOOP 0.1 — Concluído

Implementado:
- estrutura `apps/`;
- estrutura `packages/`;
- estrutura `infra/`;
- estrutura `docs/`;
- estrutura `.github/`;
- README;
- `.gitignore`;
- Git inicial.

Commit original:
```text
chore: initialize portal fumep monorepo
```

## LOOP 0.2 — Concluído

Escopo atual:
- configurar `pnpm-workspace.yaml` para `apps/*` e `packages/*`;
- criar o `package.json` privado da raiz;
- disponibilizar scripts comuns mínimos que tolerem pacotes ainda vazios;
- validar a instalação sem antecipar ferramentas dos loops seguintes.

Implementado:
- `pnpm-workspace.yaml` cobrindo `apps/*` e `packages/*`;
- `package.json` raiz privado com scripts comuns mínimos;
- `pnpm-lock.yaml` gerado pela instalação;
- `.pnpm-store/` ignorado pelo Git.

Ambiente observado:
- Node.js `v24.20.0`;
- pnpm `11.19.0`.

Checks executados com sucesso:
- `pnpm install`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test`;
- `pnpm build`.

Observação:
- os scripts comuns concluíram sem erros e informaram que ainda não há projetos com scripts próprios, comportamento esperado neste estágio.

Commit:
```text
chore: configure pnpm workspace
```

## LOOP 0.3 — Concluído

Escopo atual:
- criar `tsconfig.base.json` na raiz;
- habilitar modo estrito;
- definir alias básico para os pacotes `@fumep/*`;
- disponibilizar e validar `pnpm typecheck` sem criar aplicações ou configurar lint.

Implementado:
- `tsconfig.base.json` central com alvo ES2022, resolução de módulos para bundlers e emissão desabilitada;
- modo estrito habilitado;
- alias `@fumep/*` direcionado aos fontes dos pacotes do workspace;
- declaração sentinela neutra para validar a configuração antes da criação das aplicações;
- TypeScript `7.0.2` como dependência de desenvolvimento da raiz;
- script raiz `typecheck` executando o compilador com a configuração central.

Checks executados com sucesso:
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm test`;
- `pnpm build`;
- `pnpm install --frozen-lockfile`;
- `git diff --check`.

Observação:
- lint, testes e build ainda não encontram projetos com scripts próprios, comportamento esperado antes da criação das aplicações.

Commit:
```text
chore: configure central typescript
```

## LOOP 0.4 — Concluído

Escopo atual:
- criar o pacote mínimo `apps/web` com Next.js e App Router;
- fornecer layout, página padrão e estilos globais mínimos;
- manter renderização no servidor e HTML semântico;
- validar que a página abre localmente, sem antecipar Design System, temas ou integrações.

Implementado:
- pacote privado `@fumep/web` com Next.js `16.3.4`, React `19.2.8` e App Router;
- layout raiz em português do Brasil com metadados mínimos;
- página inicial renderizada no servidor com HTML semântico;
- estilos globais mínimos, incluindo skip link com foco visível;
- configuração TypeScript estendendo a base central;
- scripts `dev`, `build`, `start` e `typecheck` do frontend;
- script raiz `typecheck` ampliado para validar os projetos do workspace;
- regras locais do agente geradas e mantidas pelo Next.js 16;
- artefatos gerados do TypeScript e `next-env.d.ts` ignorados pelo Git.

Checks executados com sucesso:
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm test`;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `git diff --check`.

Critério de aceite validado:
- servidor de desenvolvimento iniciado em `http://127.0.0.1:3100`;
- `GET /` respondeu HTTP `200`;
- resposta continha `<title>Portal FUMEP</title>`, `<h1>Portal FUMEP</h1>` e `main-content`.

Commit:
```text
feat(web): create minimal nextjs app
```

## LOOP 0.5 — Concluído

Escopo atual:
- criar o pacote mínimo `apps/api` com NestJS;
- expor `GET /api/v1/health` por controller fino e service dedicado;
- documentar o endpoint no contrato OpenAPI;
- validar o endpoint com Vitest e Supertest;
- não criar domínio, persistência, autenticação ou integrações.

Implementado:
- pacote privado `@fumep/api` com NestJS `12.0.1` em ESM;
- bootstrap HTTP com prefixo global `/api/v1`;
- endpoint `GET /api/v1/health` com controller fino e service dedicado;
- resposta determinística `{ "status": "ok" }`;
- contrato OpenAPI e Swagger disponíveis em `/api/docs` e `/api/docs-json`;
- teste HTTP com Vitest `5.0.0` e Supertest `7.2.2`;
- build NestJS e configuração TypeScript baseada em `NodeNext`;
- TypeScript central ajustado para `6.0.3`, versão compatível com a API programática exigida pelo Nest CLI 12;
- script transitivo opcional de `@scarf/scarf` explicitamente bloqueado na política pnpm.

Checks executados com sucesso:
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm test` — 1 arquivo e 1 teste aprovados;
- `pnpm build` — API e frontend compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `git diff --check`.

Critério de aceite validado:
- servidor NestJS iniciado localmente na porta `3001`;
- `GET /api/v1/health` respondeu HTTP `200` com `{ "status": "ok" }`;
- `GET /api/docs-json` respondeu HTTP `200` e incluiu `/api/v1/health`.

Commit:
```text
feat(api): create minimal nestjs health endpoint
```

## LOOP 0.6 — Concluído

Escopo atual:
- criar o pacote mínimo `apps/worker` em TypeScript;
- manter o Worker como processo independente da API;
- sinalizar inicialização e suportar encerramento controlado;
- validar que o processo inicia sem erro;
- não instalar ou configurar BullMQ, Redis, filas ou jobs.

Implementado:
- pacote privado `@fumep/worker` como aplicação independente;
- processo Node.js em TypeScript e ESM;
- configuração de typecheck e build baseada no TypeScript central;
- scripts `build`, `start` e `typecheck`;
- sinalização explícita de prontidão;
- manutenção do processo ativo e handlers de encerramento para `SIGINT` e `SIGTERM`;
- somente tipos de Node como dependência de desenvolvimento.

Checks executados com sucesso:
- `pnpm typecheck` — API, web e Worker aprovados;
- `pnpm lint`;
- `pnpm test` — teste existente da API aprovado;
- `pnpm build` — API, web e Worker compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `git diff --check`.

Critério de aceite validado:
- `pnpm --dir apps/worker start` iniciou o artefato compilado sem erro;
- processo emitiu `Worker FUMEP iniciado.` e permaneceu ativo;
- processo de validação encerrado após a comprovação.

Observação:
- nenhum teste específico de jobs foi criado porque BullMQ e jobs estão explicitamente fora deste loop.

Commit:
```text
feat(worker): create minimal typescript worker
```

## LOOP 0.7 — Concluído

Escopo atual:
- criar o pacote mínimo `packages/db` preparado para Drizzle ORM;
- expor uma entrada TypeScript/ESM sem schema, migration ou conexão;
- declarar o pacote como dependência workspace da API;
- validar a importação de `@fumep/db` pela API em tempo de compilação.

Implementado:
- pacote privado ESM `@fumep/db` com entrada pública e artefatos em `dist`;
- configuração TypeScript e build baseada no padrão central;
- Drizzle ORM `0.45.2` como dependência de runtime do pacote;
- marcador de tipo mínimo exportado, sem representar entidade de domínio;
- dependência workspace `@fumep/db` declarada em `apps/api`;
- importação de tipo pela API para validar resolução e contrato entre pacotes.

Checks executados com sucesso:
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm typecheck` — db, API, web e Worker aprovados;
- `pnpm lint`;
- `pnpm test` — teste existente da API aprovado;
- `pnpm build` — pacote db e aplicações compilados em ordem topológica;
- `git diff --check`.

Critério de aceite validado:
- vínculo workspace `apps/api/node_modules/@fumep/db` aponta para `packages/db`;
- API compilou com importação de tipo de `@fumep/db`;
- importação ESM do artefato compilado a partir de `apps/api` retornou `DB_IMPORT=ok`.

Observação:
- nenhum schema, migration, repository ou conexão com PostgreSQL foi criado neste loop.

Commit:
```text
feat(db): prepare drizzle package
```

## LOOP 0.8 — Concluído

Escopo atual:
- criar o pacote mínimo `packages/validation` com Zod;
- definir somente o schema da resposta de health já existente;
- testar payloads válido e inválido;
- consumir o tipo inferido pelo schema em `apps/api` e `apps/web`;
- não antecipar schemas completos de domínio ou ContentBlocks.

Implementado:
- pacote privado ESM `@fumep/validation` com Zod `4.5.4`;
- schema estrito `healthResponseSchema` para o contrato existente `{ status: "ok" }`;
- tipo `HealthResponse` inferido diretamente do schema;
- dependência workspace declarada em `apps/api` e `apps/web`;
- API usando o tipo compartilhado em `HealthService`;
- web usando o tipo compartilhado na página inicial;
- build TypeScript e entrada pública do pacote.

Testes adicionados:
- payload `{ status: "ok" }` é aceito;
- status inválido é rejeitado.

Checks executados com sucesso:
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm typecheck` — validation, db, API, web e Worker aprovados;
- `pnpm lint`;
- `pnpm test` — 2 testes do schema e 1 teste da API aprovados;
- `pnpm build` — pacote de validação e aplicações compilados;
- `git diff --check`.

Critério de aceite validado:
- importação runtime do schema a partir de `apps/api` retornou `API_SCHEMA=ok`;
- importação runtime do mesmo schema a partir de `apps/web` retornou `WEB_SCHEMA=ok`.

Observação:
- nenhum schema completo de domínio ou ContentBlock foi criado.

Commit:
```text
feat(validation): add shared health schema
```

## LOOP 0.9 — Concluído

Escopo atual:
- criar o pacote mínimo `packages/ui` para React;
- expor um componente apresentacional simples e server-compatible;
- declarar o pacote como dependência workspace da web;
- renderizar o componente na página inicial do Next.js;
- não antecipar Design System completo, temas, tokens ou componentes interativos.

Implementado:
- pacote privado ESM `@fumep/ui` para componentes React compartilhados;
- componente apresentacional `Message`, sem estado ou dependência de cliente;
- configuração TypeScript voltada a bundlers e build com declarações;
- React como peer dependency e tipos React para compilação isolada;
- dependência workspace `@fumep/ui` declarada no app web;
- parágrafo da home renderizado pelo componente compartilhado.

Checks executados com sucesso:
- `pnpm typecheck` — UI, validation, db, API, web e Worker aprovados;
- `pnpm lint`;
- `pnpm test` — 3 testes existentes aprovados;
- `pnpm build` — pacote UI e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `git diff --check`.

Critério de aceite validado:
- servidor Next.js iniciado localmente;
- `GET /` respondeu HTTP `200`;
- HTML continha `<p>Projeto institucional em construção.</p>` renderizado por `Message`.

Observação:
- uma porta ocupada por servidor de validação anterior foi identificada e o processo correspondente foi encerrado antes da prova final;
- nenhum Design System completo, tema, token ou componente interativo foi criado.

Commit:
```text
feat(ui): add shared message component
```

## LOOP 0.10 — Concluído

Escopo atual:
- configurar ESLint flat config na raiz para TypeScript e Next.js;
- adotar Prettier como formatter comum;
- adicionar scripts raiz de lint, correção e formatação;
- formatar e validar somente código/configuração do workspace;
- não antecipar regras específicas de funcionalidades futuras.

Implementado:
- configuração ESLint flat na raiz com regras recomendadas de Next.js, TypeScript e compatibilidade com Prettier;
- Prettier adotado como formatter comum, com configuração e exclusões explícitas;
- scripts raiz `lint`, `lint:fix`, `format` e `format:check`;
- arquivos existentes normalizados pelo formatter e import não utilizado removido;
- builds opcionais de dependências nativas não necessárias mantidos desabilitados pelo pnpm.

Checks executados com sucesso:
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck` — UI, validation, db, API, web e Worker aprovados;
- `pnpm test` — 2 testes do schema e 1 teste da API aprovados;
- `pnpm build` — pacotes e aplicações compilados, incluindo build estático do Next.js;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check` — nenhuma incompatibilidade de peer dependency;
- `git diff --check`.

Critério de aceite validado:
- `pnpm lint` concluído sem erros ou avisos.

Observação:
- nenhuma regra específica de funcionalidades futuras foi adicionada.

Commit:
```text
chore: configure lint and formatter
```

## LOOP 0.11 — Concluído

Escopo atual:
- criar o primeiro `docker-compose.dev.yml`;
- adicionar somente PostgreSQL, Redis e MinIO;
- limitar portas publicadas ao host local de desenvolvimento;
- manter credenciais reais fora do Git;
- não antecipar volumes, healthchecks, persistência ou bucket inicial dos loops 0.12 a 0.14.

Implementado:
- composição de desenvolvimento nomeada `portal-fumep-dev`;
- PostgreSQL 17, Redis 8 e MinIO com versão explícita;
- credenciais parametrizadas por variáveis obrigatórias, documentadas em `.env.example`;
- portas publicadas exclusivamente em `127.0.0.1` para uso local;
- arquivo `.env` local ignorado pelo Git para a validação dos containers.

Checks executados com sucesso:
- `docker compose --env-file .env -f docker-compose.dev.yml config --quiet`;
- `docker compose --env-file .env -f docker-compose.dev.yml up -d`;
- inspeção Docker dos três containers;
- logs de inicialização dos três serviços;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `git diff --check`.

Critério de aceite validado:
- `portal-fumep-dev-postgres-1` em estado `running` e aceitando conexões;
- `portal-fumep-dev-redis-1` em estado `running` e aceitando conexões;
- `portal-fumep-dev-minio-1` em estado `running`, com API e console inicializados.

Observação:
- volumes, healthchecks, persistência do Redis e bucket inicial permanecem reservados aos loops seguintes.

Commit:
```text
chore: add development infrastructure compose
```

## LOOP 0.12 — Concluído

Escopo atual:
- adicionar volume persistente ao PostgreSQL;
- adicionar healthcheck nativo com `pg_isready`;
- documentar e consumir `DATABASE_URL`;
- comprovar a conexão a partir do workspace da API com uma consulta mínima;
- não antecipar configuração Drizzle, migrations, schema ou domínio.

Implementado:
- volume nomeado `postgres_data` montado no diretório de dados do PostgreSQL;
- healthcheck com `pg_isready`, usando usuário e banco do ambiente;
- `DATABASE_URL` documentada em `.env.example` e configurada apenas no `.env` local ignorado;
- driver PostgreSQL mínimo no workspace da API;
- comando `db:check` que abre conexão, executa `SELECT 1` e a encerra corretamente.

Checks executados com sucesso:
- validação do Docker Compose;
- `docker compose ... up -d --wait postgres`;
- PostgreSQL confirmado como `healthy`;
- `pnpm --filter @fumep/api db:check`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `git diff --check`.

Critério de aceite validado:
- a API conectou ao PostgreSQL pela `DATABASE_URL` e executou consulta mínima com sucesso.

Observação:
- a integração com Drizzle e migrations permanece reservada ao loop 1.1.

Commit:
```text
feat(db): add postgres development connection check
```

## LOOP 0.13 — Concluído

Escopo atual:
- exigir senha no Redis de desenvolvimento;
- habilitar persistência AOF em volume nomeado;
- adicionar healthcheck autenticado;
- documentar e consumir `REDIS_URL`;
- comprovar `PING` a partir do workspace da API;
- não antecipar sessões, BullMQ ou cache.

Implementado:
- senha obrigatória do Redis recebida exclusivamente pelo ambiente;
- persistência AOF habilitada em volume nomeado `redis_data`;
- healthcheck autenticado com `redis-cli`;
- `REDIS_URL` documentada em `.env.example` e configurada apenas no `.env` ignorado;
- cliente Redis mínimo e comando `redis:check` no workspace da API.

Checks executados com sucesso:
- validação do Docker Compose;
- `docker compose ... up -d --wait redis`;
- Redis confirmado como `healthy`;
- PING sem senha rejeitado com `NOAUTH`;
- `pnpm --filter @fumep/api redis:check`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `git diff --check`.

Critério de aceite validado:
- a API conectou ao Redis autenticado e recebeu `PONG`.

Observação:
- sessões, BullMQ e cache permanecem fora deste loop.

Commit:
```text
feat(auth): secure development redis
```

## LOOP 0.14 — Concluído

Escopo atual:
- adicionar volume persistente ao MinIO;
- adicionar healthcheck HTTP nativo;
- criar idempotentemente os buckets canônicos `portal-public` e `portal-private`;
- documentar a configuração de acesso local;
- comprovar acesso a partir do workspace da API;
- não antecipar uploads, processamento ou Biblioteca de Mídia.

Implementado:
- volume nomeado `minio_data` para persistência dos objetos;
- healthcheck HTTP no endpoint interno de saúde do MinIO;
- hook pós-inicialização idempotente com o cliente `mc` já presente na imagem;
- buckets canônicos `portal-public` e `portal-private`;
- configuração local do endpoint documentada em `.env.example`;
- cliente MinIO mínimo e comando `storage:check` no workspace da API.

Checks executados com sucesso:
- validação do Docker Compose;
- `docker compose ... up -d --wait minio`;
- MinIO confirmado como `healthy`;
- listagem dos buckets pelo cliente `mc`;
- `pnpm --filter @fumep/api storage:check`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `git diff --check`.

Critério de aceite validado:
- a API acessou o MinIO e confirmou os dois buckets iniciais.

Observação:
- uploads, metadados, processamento e Biblioteca de Mídia permanecem fora deste loop.

Commit:
```text
feat(media): initialize development minio storage
```

## LOOP 0.15 — Concluído

Escopo atual:
- auditar o endpoint público `GET /api/v1/health` já criado no bootstrap;
- confirmar resposta estritamente igual a `{ "status": "ok" }`;
- validar contrato compartilhado, documentação OpenAPI e teste Supertest existentes;
- não expor dependências, versões, credenciais ou topologia interna;
- não antecipar health administrativo detalhado.

Implementado/auditado:
- rota pública `GET /api/v1/health` sob o prefixo global da API;
- controller fino delegando ao `HealthService`;
- resposta tipada pelo contrato compartilhado `HealthResponse`;
- documentação OpenAPI com exemplo público mínimo;
- teste Supertest que exige resposta exatamente igual a `{ "status": "ok" }`.

Checks executados com sucesso:
- execução HTTP real em porta isolada: status `200`;
- corpo real exatamente `{"status":"ok"}`;
- `Content-Type: application/json; charset=utf-8`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — contrato e endpoint aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `git diff --check`.

Critério de aceite validado:
- o corpo estritamente mínimo não contém hostname, versões, credenciais, topologia ou detalhes de dependências.

Observação:
- o endpoint havia sido criado no bootstrap inicial e não precisou de alteração artificial; este loop auditou e comprovou formalmente seu contrato público.

Commit:
```text
docs: validate minimal public health endpoint
```

## LOOP 0.16 — Concluído

Escopo atual:
- criar um workflow único de CI para Pull Requests direcionados à `main`;
- instalar pnpm e Node.js com cache de dependências;
- executar instalação congelada, lint, typecheck, testes e build;
- aplicar permissões mínimas e cancelamento de execuções obsoletas;
- não implementar deploy, publicação de imagens ou branch protection.

Implementado:
- workflow `.github/workflows/ci.yml` acionado em Pull Requests para `main`;
- job único em Ubuntu e Node.js 24, com cache do pnpm;
- pnpm obtido a partir da versão declarada pelo projeto;
- instalação com lockfile congelado;
- etapas separadas de lint, typecheck, testes e build;
- permissões `contents: read`, timeout e cancelamento de execuções obsoletas.

Checks executados com sucesso:
- `pnpm exec prettier --check .github/workflows/ci.yml` — YAML válido e formatado;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `git diff --check`.

Critério de aceite validado:
- o gatilho `pull_request` direcionado à `main` executa o job com toda a sequência canônica da CI.

Observação:
- deploy, imagens e branch protection não foram configurados.

Commit:
```text
ci: add initial pull request checks
```

## LOOP 0.17 — Concluído

Escopo atual:
- configurar a proteção da branch `main` no GitHub;
- exigir o check `Lint, types, tests and build` antes do merge;
- exigir que a branch esteja atualizada antes do merge;
- não adicionar reviews obrigatórios ou outras regras de governança.

Implementado:
- repositório publicado em `https://github.com/teusmoura/fumep`;
- proteção clássica habilitada na branch `main`;
- status check obrigatório `Lint, types, tests and build`;
- política estrita habilitada para exigir branch atualizada;
- force-push e exclusão da branch desabilitados.

Checks executados com sucesso:
- leitura da proteção pela API do GitHub;
- `required_status_checks.strict` confirmado como `true`;
- contexto obrigatório confirmado como `Lint, types, tests and build`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `git diff --check`.

Critério de aceite validado:
- merges na `main` ficam bloqueados enquanto o check obrigatório não for aprovado.

Observação:
- nenhuma exigência adicional de review, assinatura ou histórico linear foi adicionada.

Commit:
```text
docs: record main branch protection
```

## LOOP 1.1 — Concluído

Escopo atual:
- configurar o cliente Drizzle PostgreSQL em `packages/db`;
- adicionar configuração do Drizzle Kit;
- criar schema inicial vazio e diretório versionado de migrations;
- gerar e executar uma migration vazia no banco de desenvolvimento;
- não criar tabelas, dados iniciais ou repositories de domínio.

Implementado:
- cliente Drizzle sobre `postgres-js` exportado por `@fumep/db`;
- schema TypeScript inicial explicitamente vazio;
- `drizzle.config.ts` com dialeto PostgreSQL e carregamento seguro da `DATABASE_URL` local;
- scripts `db:generate` e `db:migrate` no pacote de banco;
- migration custom vazia `0000_initialize.sql` e metadados do Drizzle versionados;
- autorização explícita apenas dos scripts do `esbuild` necessários ao Drizzle Kit.

Checks executados com sucesso:
- `pnpm --filter @fumep/db db:generate` — 0 tabelas e nenhuma alteração adicional;
- `pnpm --filter @fumep/db db:migrate` — migration aplicada com sucesso e reaplicação idempotente;
- PostgreSQL de desenvolvimento confirmado como `healthy`;
- tabela interna `drizzle.__drizzle_migrations` com 1 registro;
- schema `public` confirmado com 0 tabelas;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `git diff --check`.

Critério de aceite validado:
- a migration vazia foi executada e registrada no banco de desenvolvimento.

Observação:
- nenhuma tabela, entidade, seed ou repository de domínio foi criado.

Commit:
```text
feat(db): configure drizzle migrations
```

## LOOP 1.2 — Concluído

Escopo atual:
- criar a tabela `institutions` somente com os campos essenciais do loop;
- preservar UUID, TIMESTAMPTZ e snake_case;
- implementar repository com create, read, update e delete;
- testar o CRUD contra PostgreSQL isolado;
- preparar a CI para executar migrations e testes de banco;
- não antecipar tema, settings, mídia ou outras entidades.

Implementado:
- tabela `institutions` com UUID gerado no banco, `name`, `slug` único, `is_active` e timestamps com fuso;
- migration aditiva `0001_sudden_juggernaut.sql` gerada pelo Drizzle Kit;
- tipos inferidos `Institution` e `NewInstitution`;
- `InstitutionRepository` com criação, consulta por id, listagem ordenada, atualização e exclusão;
- teste de integração cobrindo o ciclo CRUD e exclusão inexistente;
- serviço PostgreSQL efêmero e etapa de migration adicionados à CI antes dos testes.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_2_test`;
- `pnpm --filter @fumep/db test` — CRUD aprovado em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 4 testes aprovados entre validation, db e API;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- repository criou, leu, listou, atualizou e excluiu uma instituição em PostgreSQL real.

Observação:
- nenhum campo de tema, setting, logo ou relacionamento futuro foi criado.

Commit:
```text
feat(db): add institution repository
```

## LOOP 1.3 — Concluído

Escopo atual:
- criar enum `user_role` com `ADMIN` e `EDITOR`;
- criar a tabela `users` com os campos definidos no loop;
- garantir unicidade case-insensitive do e-mail;
- testar migration, defaults, papéis e constraint de e-mail em PostgreSQL;
- não implementar login, hash, sessão ou vínculo institucional.

Implementado:
- enum PostgreSQL `user_role` restrito a `ADMIN` e `EDITOR`;
- tabela `users` com UUID, nome, e-mail, hash de senha, papel, estado ativo e timestamps com fuso;
- índice único funcional sobre `lower(email)`;
- índices de consulta para `role` e `is_active`;
- migration aditiva `0002_unusual_energizer.sql`;
- testes de schema para ambos os papéis, valor padrão ativo e unicidade case-insensitive;
- configuração Vitest restrita aos testes-fonte de `packages/db`, evitando coleta de artefatos compilados.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_3_test`;
- `pnpm --filter @fumep/db test` — 2 arquivos e 4 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 7 testes aprovados entre validation, db e API;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- tabela e modelagem de usuário foram aplicadas e testadas em PostgreSQL real.

Observação:
- nenhum login, serviço de hash, sessão ou vínculo institucional foi implementado.

Commit:
```text
feat(db): add user schema
```

## LOOP 1.4 — Concluído

Escopo atual:
- criar a tabela associativa `user_institutions`;
- definir chaves estrangeiras para usuário e instituição e chave primária composta;
- provar em PostgreSQL que um usuário pode pertencer a múltiplas instituições;
- não implementar autorização, login, sessão ou outras relações de domínio.

Implementado:
- tabela `user_institutions` com `user_id`, `institution_id` e timestamp com fuso;
- chave primária composta que impede vínculos duplicados;
- chaves estrangeiras com `ON DELETE CASCADE` para usuário e `ON DELETE RESTRICT` para instituição;
- migration aditiva `0003_broad_hulk.sql`;
- testes de associação múltipla e rejeição de vínculo duplicado;
- execução serial dos arquivos de integração do pacote de dados para preservar o isolamento das fixtures.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_4_test`;
- `pnpm --filter @fumep/db test` — 3 arquivos e 6 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 9 testes aprovados entre validation, db e API;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- um único usuário foi associado a duas instituições distintas em PostgreSQL real.

Observação:
- nenhuma regra de autorização, login, sessão ou relação de domínio futura foi implementada.

Commit:
```text
feat(db): add user institution relation
```

## LOOP 1.5 — Concluído

Escopo atual:
- criar a tabela `pages` com os oito campos mínimos definidos pelo plano;
- criar o enum canônico `publication_status` e validar seu padrão `DRAFT`;
- vincular autoria opcional a usuários e testar a estrutura em PostgreSQL;
- não implementar instituição, SEO, agendamento, blocos, versões ou publicação.

Implementado:
- enum PostgreSQL `publication_status` com `DRAFT`, `SCHEDULED`, `PUBLISHED` e `EXPIRED`;
- tabela `pages` com os oito campos mínimos, UUID e timestamps com fuso;
- estado padrão `DRAFT`, índice de status e autoria opcional referenciada em `users`;
- migration aditiva `0004_glorious_lockjaw.sql`;
- testes do padrão, campos mínimos, autoria e todos os estados do enum.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_5_test`;
- `pnpm --filter @fumep/db test` — 4 arquivos e 10 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 13 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- a estrutura mínima de `Page` foi criada e exercitada em PostgreSQL real.

Observação:
- `institution_id` e sua unicidade composta permanecem reservados ao loop 1.6; nenhum campo futuro foi antecipado.

Commit:
```text
feat(db): add minimum page schema
```

## LOOP 1.6 — Concluído

Escopo atual:
- adicionar a instituição obrigatória à página com relação N:1;
- garantir unicidade de slug por instituição;
- validar em PostgreSQL slugs iguais entre instituições e duplicidade proibida na mesma instituição;
- não criar associação N:N nem antecipar campos ou funcionalidades futuras.

Implementado:
- coluna obrigatória `pages.institution_id` com chave estrangeira para `institutions` e exclusão restrita;
- índice de consulta por instituição;
- índice único composto `pages_institution_slug_unique` sobre instituição e slug;
- migration aditiva `0005_old_mongu.sql`;
- teste que aceita o mesmo slug em instituições diferentes e rejeita repetição na mesma instituição;
- fixtures existentes de Page ajustadas para respeitar a nova relação obrigatória.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_6_test`;
- `pnpm --filter @fumep/db test` — 4 arquivos e 11 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 14 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- toda página exige exatamente uma instituição, com slug único no respectivo escopo institucional.

Observação:
- nenhuma tabela associativa Page–Institution ou funcionalidade de loops futuros foi criada.

Commit:
```text
feat(db): scope pages by institution
```

## LOOP 1.7 — Concluído

Escopo atual:
- criar `content_blocks` com os campos definidos no plano atual;
- restringir proprietários a `PAGE` e `ARTICLE`, persistir `data` em JSONB e ordenar por posição;
- aplicar defaults estruturais e unicidade de anchor por proprietário;
- não implementar Registry, schemas de blocos, renderização, preview, publicação ou versões.

Implementado:
- enum PostgreSQL `block_owner_type` limitado a `PAGE` e `ARTICLE`;
- tabela `content_blocks` com UUID, proprietário polimórfico, tipo, posição, visibilidade, versão de schema, fundo, mídia de fundo, anchor, JSONB e timestamps com fuso;
- defaults `is_visible = true`, `schema_version = 1` e `background = DEFAULT`;
- índice composto para leitura ordenada por proprietário;
- unicidade de anchor por proprietário;
- migration aditiva `0006_brainy_monster_badoon.sql`;
- testes para dados estruturados, ordenação, visibilidade, defaults, versões e anchor duplicado.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_7_test`;
- `pnpm --filter @fumep/db test` — 5 arquivos e 14 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 17 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- ContentBlock armazenou dados JSONB estruturados, visibilidade e posições ordenadas para um proprietário.

Observação:
- `background_media_id` permanece UUID sem chave estrangeira até a criação canônica da entidade de mídia; Registry, schemas Zod por bloco, renderização, preview, publicação e versões não foram antecipados.

Commit:
```text
feat(builder): add content block schema
```

## LOOP 1.8 — Concluído

Escopo atual:
- criar `page_versions` com snapshots JSONB numerados por página;
- garantir unicidade de versão e exclusão em cascata com a página;
- validar que alterações posteriores na página não modificam snapshots persistidos;
- não implementar restauração, versionamento por bloco, endpoints, preview ou publicação.

Implementado:
- tabela `page_versions` com UUID, referência à página, número, snapshot JSONB, autoria opcional e timestamp com fuso;
- exclusão em cascata das versões quando a página é removida;
- índice de consulta por página e unicidade composta de página e número de versão;
- migration aditiva `0007_open_leper_queen.sql`;
- testes que preservam o snapshot após alteração da página e rejeitam número duplicado na mesma página.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_8_test`;
- `pnpm --filter @fumep/db test` — 6 arquivos e 16 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 19 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- PageVersion preservou um snapshot numerado mesmo após a alteração dos dados vivos da página.

Observação:
- não há `updated_at`, restauração automática, versionamento individual de bloco, endpoint, preview ou publicação.

Commit:
```text
feat(builder): add immutable page versions
```

## LOOP 1.9 — Concluído

Escopo atual:
- criar `audit_logs` com ator opcional, ação, entidade, metadados, IP e timestamp;
- preservar eventos ao excluir fisicamente o usuário, anulando apenas a referência;
- testar a estrutura inicial em PostgreSQL;
- não implementar catálogo completo, instrumentação, endpoints ou interface de consulta.

Implementado:
- tabela `audit_logs` com UUID, usuário opcional, ação, tipo/id da entidade, metadata JSONB, endereço INET e timestamp com fuso;
- referência ao usuário com `ON DELETE SET NULL`, preservando integralmente o evento;
- índices para ator, entidade e ordenação temporal;
- migration aditiva `0008_fixed_sheva_callister.sql`;
- testes de persistência do evento e preservação após exclusão física do usuário.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_9_test`;
- `pnpm --filter @fumep/db test` — 7 arquivos e 18 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 21 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- AuditLog registrou evento administrativo e permaneceu armazenado após a exclusão física do ator.

Observação:
- nenhum catálogo completo, instrumentação, endpoint ou interface de auditoria foi antecipado.

Commit:
```text
feat(db): add initial audit log schema
```

## LOOP 1.10 — Concluído

Escopo atual:
- criar `redirects` com origem única, destino, código HTTP e timestamp;
- usar 301 como padrão e restringir códigos a 301, 302, 307 e 308;
- testar defaults, unicidade e constraint em PostgreSQL;
- não implementar resolução HTTP, geração automática, endpoints ou interface administrativa.

Implementado:
- tabela `redirects` com UUID, origem única, destino, código HTTP e timestamp com fuso;
- código padrão 301 e constraint PostgreSQL limitada a 301, 302, 307 e 308;
- migration aditiva `0009_eager_pestilence.sql`;
- testes de valor padrão, unicidade de origem, todos os códigos permitidos e rejeição de código inválido.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_10_test`;
- `pnpm --filter @fumep/db test` — 8 arquivos e 24 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 27 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- Redirect armazenou origem única, destino e apenas códigos HTTP canônicos, usando 301 por padrão.

Observação:
- resolução HTTP, geração automática, endpoints e interface administrativa não foram antecipados.

Commit:
```text
feat(db): add redirect schema
```

## LOOP 2.1 — Concluído

Escopo atual:
- adicionar Argon2 ao backend com build nativo explicitamente permitido;
- criar serviço de geração e verificação de hashes Argon2id;
- testar hash diferente do texto, senha válida, senha inválida e salt distinto;
- não implementar login, sessão, cookies, recuperação, guards ou endpoints.

Implementado:
- dependência `argon2` adicionada à API e build nativo autorizado explicitamente no workspace;
- `PasswordHasherService` injetável com geração Argon2id e verificação pelo formato PHC do hash;
- testes confirmando prefixo Argon2id, ausência do texto original, senha válida, senha inválida e salts distintos.

Checks executados com sucesso:
- `pnpm rebuild argon2`;
- `pnpm --filter @fumep/api typecheck`;
- `pnpm --filter @fumep/api test` — 2 arquivos e 4 testes aprovados;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 30 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm ignored-builds` — `argon2` não aparece entre os builds explicitamente ignorados;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- a senha gerou hash Argon2id diferente do texto original e foi verificada corretamente sem exposição do segredo.

Observação:
- login, sessão, cookie, recuperação de senha, guards, autorização e endpoints não foram implementados.

Commit:
```text
feat(auth): add Argon2id password hashing
```

## LOOP 2.2 — Concluído

Escopo atual:
- implementar `POST /api/v1/auth/login` com validação Zod e OpenAPI;
- autenticar somente usuário ativo por e-mail normalizado e Argon2id;
- criar sessão Redis e cookie HttpOnly, SameSite=Lax e Secure em produção;
- testar sucesso, falhas e persistência Redis sem implementar guards, logout ou recuperação.

Implementado:
- contrato Zod compartilhado para login com normalização de e-mail e rejeição de campos extras;
- `AuthUserRepository` para localizar somente usuário ativo e carregar seu escopo institucional;
- `AuthService` com verificação Argon2id e payload server-side contendo usuário, papel, instituições e limites temporais;
- `RedisSessionStore` com identificador opaco aleatório, chave `session:{id}` e TTL de inatividade de 30 minutos;
- `POST /api/v1/auth/login` documentado no OpenAPI, com resposta neutra de credenciais inválidas;
- cookie `fumep_session` HttpOnly, SameSite=Lax, Path `/`, Secure em produção e Max-Age de 30 minutos;
- decisão AUTH-001 registrada como resolvida em favor da implementação Redis/cookie no loop 2.2;
- build pré-teste do contrato compartilhado para funcionamento em checkout limpo.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_2_2_test`;
- `pnpm test` com PostgreSQL isolado e Redis real — 38 testes aprovados;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 38 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm ignored-builds`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- credenciais válidas criaram sessão server-side e cookie seguro; senha incorreta, usuário ausente/inativo e payload inválido foram rejeitados.

Observação:
- guards, leitura e logout de sessão, recuperação de senha e autorização institucional não foram implementados.

Commit:
```text
feat(auth): implement login with Redis session
```

## LOOP 2.3 — Concluído

Escopo atual:
- tornar configuráveis os limites de inatividade e duração absoluta da sessão;
- consolidar uso dessas configurações no Redis, payload e cookie;
- validar defaults, overrides, modo produção, TTL e encerramento do cliente;
- não implementar leitura de sessão, logout, recuperação, guards ou autorização.

Implementado:
- `SessionConfig` central com inatividade e duração absoluta configuráveis por ambiente;
- defaults canônicos de 30 minutos e 8 horas, com rejeição de valores inválidos;
- cookie Secure derivado do ambiente e Max-Age derivado do limite de inatividade;
- payload com expiração absoluta derivada da configuração;
- TTL Redis derivado da mesma configuração;
- encerramento gracioso da conexão Redis no ciclo de vida do módulo;
- testes de defaults, overrides, produção, configurações inválidas, TTL e payload persistido.

Checks executados com sucesso:
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 41 testes aprovados entre validation, db e API, incluindo Redis real;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- a sessão permanece somente no Redis, usa limites temporais configuráveis e expõe ao navegador apenas cookie com flags canônicas.

Observação:
- leitura de sessão, logout, recuperação de senha, guards e autorização não foram implementados.

Commit:
```text
feat(auth): harden Redis session configuration
```

## LOOP 2.4 — Concluído

Escopo atual:
- implementar `GET /api/v1/auth/session` a partir do cookie opaco;
- consultar, validar e renovar a inatividade da sessão no Redis;
- rejeitar sessão ausente, desconhecida, corrompida ou absolutamente expirada;
- não implementar logout, recuperação, guards ou autorização institucional.

Implementado:
- contrato Zod estrito para o payload interno de sessão;
- leitura e validação do payload Redis por identificador opaco recebido no cookie;
- renovação do timestamp de atividade e do TTL de inatividade em sessão válida;
- remoção automática de payload corrompido ou absolutamente expirado;
- `GET /api/v1/auth/session` documentado no OpenAPI;
- resposta pública limitada a id, papel e instituições do usuário, sem session ID ou timestamps internos;
- testes Redis e E2E para sessão válida, ausente, desconhecida, corrompida e expirada.

Checks executados com sucesso:
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 45 testes aprovados entre validation, db e API, incluindo Redis real;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- uma sessão Redis válida foi consultada pelo cookie sem expor identificador ou dados internos; sessões inválidas foram rejeitadas.

Observação:
- logout, recuperação de senha, guards e autorização institucional não foram implementados.

Commit:
```text
feat(auth): expose current session endpoint
```

## LOOP 2.5 — Concluído

Escopo atual:
- implementar `POST /api/v1/auth/logout` de forma idempotente;
- remover do Redis a sessão indicada pelo cookie atual;
- invalidar `fumep_session` com as flags canônicas;
- testar remoção real, expiração do cookie e ausência de sessão;
- não implementar recuperação, guards, CSRF ou autorização institucional.

Implementado:
- contrato do armazenamento de sessão ampliado com remoção idempotente;
- exclusão da chave `session:{sessionId}` no adapter Redis;
- contrato do cookie centralizado para login, leitura e logout;
- `POST /api/v1/auth/logout` documentado no OpenAPI;
- cookie invalidado com Path `/`, HttpOnly, SameSite=Lax e Secure em produção;
- resposta idempotente mesmo quando o cookie ou a sessão já não existem;
- testes E2E e Redis para exclusão, cookie expirado e repetição segura.

Checks executados com sucesso:
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm --filter @fumep/api test` — 18 testes aprovados;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 48 testes aprovados entre validation, db e API, incluindo Redis real;
- `pnpm build`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- logout removeu a sessão do Redis e enviou ao navegador a expiração do cookie com as flags canônicas.

Observação:
- recuperação de senha, guards, CSRF e autorização institucional não foram implementados.

Commit:
```text
feat(auth): implement logout
```

## LOOP 2.6 — Concluído

Escopo atual:
- implementar `SessionGuard` com leitura do cookie e validação da sessão server-side;
- anexar a identidade autenticada à requisição;
- proteger `GET /api/v1/auth/session` como endpoint autenticado de prova;
- testar sessão válida, ausente e inválida via Supertest;
- não implementar regras de papel, instituição ou recuperação de senha.

Implementado:
- `SessionGuard` NestJS que lê o cookie canônico e valida a sessão pelo `AuthService`;
- identidade autenticada anexada como `request.auth` somente após validação;
- `GET /api/v1/auth/session` protegido pelo guard e simplificado para consumir a identidade da requisição;
- esquema de autenticação por cookie declarado no OpenAPI e associado ao endpoint protegido;
- guard registrado e exportado pelo módulo de autenticação para reutilização em endpoints futuros.

Checks executados com sucesso:
- `pnpm --filter @fumep/api typecheck`;
- `pnpm --filter @fumep/api test` — 18 testes aprovados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 48 testes aprovados entre validation, db e API, incluindo Redis real;
- `pnpm build`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- endpoint protegido aceitou sessão válida, expôs sua identidade e rejeitou cookie ausente ou sessão desconhecida com HTTP 401.

Observação:
- regras de papel, instituição e recuperação de senha não foram implementadas.

Commit:
```text
feat(auth): add session guard
```

## LOOP 2.7 — Concluído

Escopo atual:
- implementar `RoleGuard` com metadados declarativos de papéis permitidos;
- suportar somente os papéis canônicos `ADMIN` e `EDITOR`;
- executar o guard depois do `SessionGuard` em um controller de teste;
- testar papel permitido e papel autenticado não permitido;
- não implementar escopo institucional ou recuperação de senha.

Implementado:
- decorator `@Roles()` tipado pelos papéis presentes na sessão;
- `RoleGuard` com leitura de metadados no método ou controller;
- suporte estrito aos papéis canônicos `ADMIN` e `EDITOR`;
- rejeição HTTP 401 defensiva quando o guard recebe requisição sem identidade autenticada;
- registro e exportação do guard pelo módulo de autenticação;
- controller exclusivo de teste com cadeia `SessionGuard` seguida de `RoleGuard`.

Checks executados com sucesso:
- `pnpm --filter @fumep/api typecheck`;
- `pnpm --filter @fumep/api test` — 20 testes aprovados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 50 testes aprovados entre validation, db e API, incluindo Redis real;
- `pnpm build`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- endpoint protegido por `ADMIN` aceitou a sessão administrativa com HTTP 200 e rejeitou a sessão `EDITOR` com HTTP 403.

Observação:
- escopo institucional, conteúdo multi-institucional e recuperação de senha não foram implementados.

Commit:
```text
feat(auth): add role guard
```

## LOOP 2.8 — Concluído

Escopo atual:
- implementar `InstitutionGuard` com instituição-alvo declarada por parâmetro de rota;
- permitir acesso global a `ADMIN`;
- limitar `EDITOR` às instituições presentes na identidade autenticada;
- testar a regra isolada do guard;
- não implementar conteúdo multi-institucional nem a matriz E2E do próximo loop.

Implementado:
- decorator `@InstitutionParam()` para declarar explicitamente o parâmetro de rota que identifica a instituição-alvo;
- `InstitutionGuard` com leitura da identidade produzida pelo `SessionGuard`;
- acesso global para `ADMIN` independentemente de vínculo institucional;
- acesso de `EDITOR` limitado à presença da instituição-alvo em `institutionIds`;
- rejeição defensiva de requisição sem identidade autenticada;
- registro e exportação do guard pelo módulo de autenticação;
- testes unitários da regra institucional simples.

Checks executados com sucesso:
- `pnpm --filter @fumep/api typecheck`;
- `pnpm --filter @fumep/api test` — 22 testes aprovados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 52 testes aprovados entre validation, db e API, incluindo Redis real;
- `pnpm build`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- o guard permitiu acesso de Editor à instituição atribuída, negou instituição fora do escopo e preservou acesso global do Administrador.

Observação:
- conteúdo multi-institucional, matriz E2E de permissão e recuperação de senha não foram implementados.

Commit:
```text
feat(auth): add institution guard
```

## LOOP 2.9 — Concluído

Escopo atual:
- criar prova E2E da cadeia `SessionGuard`, `RoleGuard` e `InstitutionGuard`;
- representar um Editor vinculado somente à ETMSL;
- validar acesso à ETMSL com HTTP 200;
- validar tentativa de acesso ao CRAMAM com HTTP 403;
- não alterar a lógica dos guards nem implementar conteúdo multi-institucional.

Implementado:
- controller disponível somente na suíte E2E para representar um recurso institucional;
- sessão determinística de Editor vinculada exclusivamente à ETMSL;
- cadeia real `SessionGuard`, `RoleGuard` e `InstitutionGuard` aplicada à rota de teste;
- cenário ETMSL autorizado com HTTP 200;
- cenário CRAMAM rejeitado com HTTP 403.

Checks executados com sucesso:
- `pnpm --filter @fumep/api typecheck`;
- `pnpm --filter @fumep/api test` — 24 testes aprovados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 54 testes aprovados entre validation, db e API, incluindo Redis real;
- `pnpm build`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- Editor ETMSL recebeu HTTP 200 ao acessar ETMSL e HTTP 403 ao tentar acessar CRAMAM.

Observação:
- nenhuma lógica de produção foi alterada; conteúdo multi-institucional e recuperação de senha não foram implementados.

Commit:
```text
test(auth): cover simple institution permissions
```

## LOOP 2.10 — Concluído

Escopo atual:
- estender o metadado institucional para múltiplos parâmetros-alvo;
- exigir que `EDITOR` possua todas as instituições vinculadas;
- preservar acesso global de `ADMIN` e compatibilidade com escopo simples;
- testar Editor com escopo completo e parcial;
- não implementar entidades de conteúdo, CSRF, rate limiting ou recuperação de senha.

Implementado:
- novo decorator `@InstitutionParams()` para declarar múltiplas instituições-alvo;
- `@InstitutionParam()` simples preservado como atalho compatível;
- `InstitutionGuard` ampliado para exigir correspondência de todos os parâmetros declarados;
- regra de acesso global de `ADMIN` preservada;
- testes para Editor com todas as instituições exigidas e Editor com escopo parcial.

Checks executados com sucesso:
- `pnpm --filter @fumep/api typecheck`;
- `pnpm --filter @fumep/api test` — 25 testes aprovados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 55 testes aprovados entre validation, db e API, incluindo Redis real;
- `pnpm build`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- Editor com escopo completo foi autorizado e Editor sem uma das instituições vinculadas foi rejeitado.

Observação:
- nenhuma entidade de conteúdo, proteção CSRF, rate limiting ou recuperação de senha foi implementada.

Commit:
```text
feat(auth): enforce multi-institution scope
```

## LOOP 2.11 — Bloqueado

Escopo analisado:
- proteção CSRF em métodos mutáveis autenticados;
- token CSRF, `SameSite=Lax` e validação de `Origin`/`Referer`;
- integração com sessão Redis e logout idempotente.

Bloqueio:
- os documentos canônicos não definem o padrão e armazenamento do token, seu canal de entrega, a configuração de origens confiáveis nem o tratamento do logout;
- a decisão afeta o contrato público da API, o payload de sessão Redis e a compatibilidade com o aceite do loop 2.5;
- o caso foi registrado como `AUTH-002` em `docs/ISSUES_ARCHITECTURE.md`, com uma proposta concreta de resolução.

Resultado:
- nenhuma alteração de código foi feita no loop 2.11;
- `docs/CURRENT_LOOP.md` permanece no loop 2.11 até decisão explícita.

## LOOP 2.11 — Concluído

Decisão AUTH-002 autorizada:
- token sincronizado e armazenado na sessão Redis;
- entrega por login e consulta de sessão, com envio em `X-CSRF-Token`;
- origem confiável configurada por `APP_ORIGIN`;
- logout sem cookie permanece idempotente e sessão válida exige token e origem.

Implementado:
- token criptográfico por sessão persistido e validado pelo schema Redis;
- token entregue no login e em `GET /auth/session` para uso no header `X-CSRF-Token`;
- validação com comparação em tempo constante;
- origem exata configurada por `APP_ORIGIN`, obrigatória em produção, aceitando `Origin` ou `Referer`;
- `CsrfGuard` reutilizável para `POST`, `PUT`, `PATCH` e `DELETE` autenticados;
- logout autenticado protegido, mantendo limpeza idempotente quando não existe sessão.

Checks executados com sucesso:
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 57 testes aprovados;
- `pnpm build`;
- `pnpm peers check`;
- `git diff --check`.

Critério de aceite validado:
- mutação autenticada rejeitou token ausente e origem hostil, preservando a sessão, e aceitou token/origem válidos.

Commit:
```text
feat(auth): add csrf protection
```

## LOOP 2.12 — Concluído

Escopo atual:
- limitar login a 5 tentativas por minuto por IP e por conta normalizada;
- manter contadores compartilhados e expiração atômica no Redis;
- contar payloads inválidos por IP e retornar HTTP 429 acima do limite;
- testar concorrência, expiração, isolamento e rejeição HTTP;
- não implementar recuperação de senha ou funcionalidades futuras.

Implementado:
- contadores Redis separados por IP e conta normalizada, com identificadores SHA-256 nas chaves;
- política inicial de 5 tentativas por janela de 60 segundos;
- incremento e expiração inicial atômicos por Lua, inclusive entre instâncias concorrentes;
- janela fixa sem renovação por tentativas bloqueadas;
- payloads inválidos também consomem o limite por IP;
- rejeição HTTP 429 antes de consultar credenciais, sem criar cookie ou sessão, com `Retry-After: 60` e OpenAPI;
- testes Redis reais de concorrência, isolamento, normalização, expiração e limites independentes;
- testes Supertest de limite HTTP e rejeição de spoofing de `X-Forwarded-For`.

Checks executados com sucesso:
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 62 testes aprovados;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Observação:
- uma incompatibilidade de inferência de tipos Redis foi corrigida antes do typecheck final;
- o endereço usado é o IP da conexão, sem confiar em headers de proxy fornecidos pelo cliente; configuração de proxy confiável permanece no escopo de deployment;
- recuperação de senha não foi implementada.

Critério de aceite validado:
- cinco tentativas foram permitidas e a sexta foi bloqueada, por IP ou conta, com retorno à janela inicial após expiração.

Commit:
```text
feat(auth): limit login attempts with Redis
```

## LOOP 2.13 — Concluído

Escopo atual:
- implementar solicitação inicial `POST /api/v1/auth/forgot-password` com contrato Zod;
- normalizar o e-mail e devolver resposta neutra sem consultar a existência de conta;
- limitar a 5 solicitações por hora por IP e conta com contadores Redis separados dos de login;
- testar validação, neutralidade, limites e isolamento entre políticas;
- reservar tokens e redefinição aos loops 2.14–2.15; não enviar e-mail nesta etapa.

Implementado:
- schema Zod estrito para e-mail normalizado da solicitação;
- endpoint REST e OpenAPI com resposta pública neutra em português;
- nenhuma consulta de usuário, cookie ou token na resposta desta etapa inicial;
- política Redis de 5 solicitações por hora por IP e conta, com namespace independente de login;
- adapter atômico existente reutilizado por políticas, sem duplicar acesso ao Redis;
- testes de validação, neutralidade, limites HTTP, janela de uma hora e isolamento de login.

Checks executados com sucesso:
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 68 testes aprovados;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- e-mails válidos receberam a mesma resposta e pedidos acima do limite receberam HTTP 429; payloads inválidos foram rejeitados e contados por IP.

Observação:
- o endpoint estabelece o contrato inicial previsto neste loop; tokens, envio de link e redefinição ainda não estão disponíveis.

Commit:
```text
feat(auth): add neutral password recovery request
```

## LOOP 2.14 — Concluído

Escopo atual:
- criar `password_reset_tokens` com UUID, hash único, datas com fuso e FK em cascata;
- emitir token aleatório de alta entropia, armazenando somente SHA-256;
- aplicar validade de 30 minutos e disponibilizar emissão apenas como serviço interno;
- testar migration limpa, repository, hash, expiração e cascata;
- não implementar reset, envio de e-mail ou invalidação de sessões.

Implementado:
- tabela canônica com UUID, `token_hash` único, datas TIMESTAMPTZ e referência a usuário com `ON DELETE CASCADE`;
- índices por usuário e expiração;
- migration aditiva `0010_groovy_meggan.sql`;
- repository Drizzle de persistência, sem campo para token original;
- serviço interno de emissão com 32 bytes aleatórios, representação base64url e hash SHA-256;
- expiração de 30 minutos e retorno do token apenas ao chamador interno;
- adapter lazy de banco com encerramento da conexão no ciclo de vida do módulo;
- build pré-teste dos pacotes db e validation para checkout limpo.

Checks executados com sucesso:
- todas as migrations aplicadas do zero em `portal_fumep_loop_2_14_test`;
- `pnpm --filter @fumep/db test` — 29 testes aprovados no banco isolado;
- migration aplicada no banco local;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 73 testes aprovados;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- tokens distintos de alta entropia foram emitidos com somente hash persistido e validade de 30 minutos; unicidade, FK e cascata foram comprovadas no PostgreSQL.

Observação:
- o gerador Drizzle foi repetido fora do sandbox após erro de runtime e concluiu sem alterar migrations anteriores;
- emissão é interna e ainda não está conectada ao envio de e-mail; reset e invalidação de sessões não foram antecipados.

Commit:
```text
feat(auth): add secure password reset tokens
```

## LOOP 2.15 — Concluído

Escopo autorizado (AUTH-003):
- endpoint Zod/OpenAPI e Argon2id;
- transação de senha, consumo e auditoria, condicionada à revogação Redis;
- testes de validade, concorrência e falha de revogação;
- reforço do ciclo de vida no loop 2.16.

Escopo analisado:
- reset por token único e expirável;
- atualização Argon2id e consumo atômico;
- exigência canônica de revogar sessões após o sucesso.

Implementado:
- contrato Zod estrito e endpoint REST documentado em OpenAPI;
- token SHA-256 validado por expiração e consumo, com bloqueio de linha para uso único concorrente;
- Argon2id, senha mínima de 10 caracteres e rejeição de conta desativada;
- senha, consumo e PASSWORD_RESET em transação; falha Redis faz rollback e permite retry;
- remoção atômica das sessões do usuário, incluindo sessões legadas; refresh condicional não recria sessão revogada;
- testes PostgreSQL e Supertest de sucesso, rejeição, concorrência, rollback, auditoria e revogação real Redis.

Checks aprovados:
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- `pnpm test`: 80 testes (6 validation, 32 db, 42 API);
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Aceite: token válido redefine a senha uma única vez; tokens desconhecidos, expirados ou consumidos falham. Revogação obrigatória comprovada.

Observações:
- AUTH-003 resolvida por autorização; 2.16 reforçará o ciclo de vida;
- falhas iniciais de import no teste, lint e formato corrigidas e checks repetidos;
- sem alteração de schema/migration; banco local de desenvolvimento;
- a revogação percorre sessões Redis em um script atômico (custo proporcional ao keyspace); apropriada ao escopo V1, sem índice adicional;
- emissão/envio de e-mail não antecipados; sem UI, acessibilidade visual não aplicável.

Commit: `feat(auth): reset passwords and revoke sessions`.

## LOOP 2.16 — Concluído

Escopo atual:
- múltiplas sessões, isolamento e sessão legada;
- refresh concorrente sem ressurreição e revogação idempotente;
- reset rejeitado preserva sessões; reset válido exige novo login.

Implementado e comprovado:
- duas sessões anteriores rejeitadas com HTTP 401 após reset;
- sessão de outro usuário preservada;
- novo login com nova senha e consulta de sessão aprovados;
- reset inválido não revoga sessões;
- sessão legada removida e revogação repetida segura;
- vinte refreshes concorrentes não ressuscitam sessão removida.

Checks aprovados:
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 82 testes: 6 validation, 32 db e 44 API;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Sem mudanças de produção, schema, migrations ou UI; aceite cumprido sem falhas. AUTH-003 orientou o loop a reforçar testes, pois a revogação já integra o 2.15.

Commit: `test(auth): verify password reset session lifecycle`.

## LOOP 3.1 — Concluído

Escopo atual:
- CRUD REST/OpenAPI de Institution usando repository existente;
- Zod estrito, ADMIN obrigatório e CSRF;
- testes de CRUD, validação, acesso e conflitos.

Implementado:
- módulo/controller/service NestJS e adapter lazy Drizzle;
- GET/POST `/api/v1/institutions` e GET/PATCH/DELETE por UUID;
- contratos Zod estritos, nomes com limite 150, slugs com limite 100 e updates não vazios;
- SessionGuard, ADMIN e CSRF; respostas 400/401/403/404/409 e exclusão 204;
- conflitos PostgreSQL mapeados sem SQL, nomes de constraints ou segredos;
- OpenAPI das cinco operações e seis testes Supertest;
- exportações do AuthModule ajustadas para reutilização dos guards entre módulos.

Checks aprovados:
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 88 testes: 6 validation, 32 db e 50 API;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Aceite cumprido: ADMIN opera CRUD, EDITOR/visitante bloqueados em todas as rotas, CSRF e conflitos comprovados em PostgreSQL. Falha inicial de injeção corrigida e checks repetidos. Sem schema/migration nova ou UI; campos de settings/tema/logo não antecipados.

Commit: `feat(api): add admin institution CRUD`.

## LOOP 3.2 — Concluído

Escopo atual:
- settings 1:1 em PostgreSQL com cascata;
- contato, links e aparência SYSTEM/LIGHT/DARK;
- contratos, repository, API ADMIN/CSRF e testes.

Implementado:
- tabela 1:1, FK cascata, contato e JSONB de links, enum de aparência com padrão SYSTEM;
- repository upsert parcial com preservação de campos e isolamento;
- GET/PATCH `/api/v1/institutions/:id/settings` com ADMIN/CSRF e OpenAPI;
- `email` da API mapeado a `contact_email` canônico no banco;
- URLs HTTP(S) sem credenciais, limites e entradas estritas;
- limpeza de campos com null e validação de aparência;
- migration `0011_small_caretaker.sql`, três testes DB, dois de contrato e cenário Supertest.

Checks aprovados:
- todas as migrations do zero em `portal_fumep_loop_3_2_test`, 35 testes DB aprovados;
- migration aplicada no banco local;
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 94 testes: 8 validation, 35 db e 51 API;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Aceite completo. ENOMEM do gerador no sandbox resolvido fora dele; tipagem de URL corrigida no pacote compartilhado. Sem UI, temas ou logos antecipados. O banco isolado foi preservado para diagnóstico.

Commit: `feat(institutions): add contact and appearance settings`.

## LOOP 3.3 — Concluído

Escopo atual:
- quatro tokens de cor de Theme incorporados a Institution;
- formato hexadecimal e contraste validado;
- persistência/configuração ADMIN e testes.

Implementado:
- Theme incorporado a Institution conforme permissão explícita do domínio canônico;
- primary, primary_foreground, accent, accent_foreground, com padrão neutro preto/branco;
- PATCH `/api/v1/institutions/:id/theme` protegido por ADMIN/CSRF e documentado;
- cores hexadecimais normalizadas, sem CSS livre, contraste mínimo 4.5:1 nos dois pares;
- migration `0012_free_havok.sql`, testes de repository, contrato e Supertest.

Checks aprovados:
- migrations do zero em `portal_fumep_loop_3_3_test`, 35 testes DB;
- migration aplicada no banco local;
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 97 testes: 10 validation, 35 db e 52 API;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Aceite cumprido. Arquitetura conforme com observação: Theme incorporado em Institution, sem tabela adicional; tokens mínimos neutros, não definição final de branding. Sem logos, frontend ou CSS livre. Sem falhas nesta rodada.

Commit: `feat(institutions): add controlled theme colors`.

## LOOP 3.4 — Concluído

Escopo atual:
- contrato opcional de referências futuras light/dark;
- instituição válida sem logos, com teste de ausência;
- sem upload, tabela Media, FK, consulta ou vínculo funcional.

Implementado:
- schema Zod estrito e tipo compartilhado de configuração de logo;
- variantes light/dark opcionais e nullable, referências futuras UUID;
- dois testes comprovam ausência permitida e rejeição de URLs/campos arbitrários;
- nenhum campo/API funcional de mídia criado.

Checks aprovados:
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 99 testes: 12 validation, 35 db e 52 API;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Aceite cumprido sem falhas: instituições válidas sem logo e contrato preparado sem dependência funcional Media. Sem schema/migration/UI.

Commit: `feat(validation): prepare optional institution logo configuration`.

## LOOP 3.5 — Concluído

Escopo atual:
- enum compartilhado SYSTEM/LIGHT/DARK;
- padrão e transições, sem duplicar persistência do 3.2;
- testes de preservação dos demais settings.

Implementado:
- enum Zod e tipo AppearanceDefault compartilhados;
- schema de settings reutiliza o enum;
- testes PostgreSQL do padrão SYSTEM e transições LIGHT/DARK/SYSTEM sem perda de contato;
- teste de contrato rejeita aliases, valores nulos e tipos inválidos.

Checks aprovados:
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 101 testes: 13 validation, 36 db e 52 API;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Aceite completo sem falhas; persistência já exigida no 3.2 foi reutilizada, sem migration duplicada. Sem frontend ou UI.

Commit: `test(institutions): consolidate appearance defaults and transitions`.

## LOOP 3.6 — Concluído

Escopo autorizado THEME-001:
- GET público restrito de tema por slug para instituições ativas;
- contrato compartilhado e OpenAPI, sem contatos/dados administrativos;
- consumo server-only Next.js e ThemeContext compartilhado;
- SSR, aparência e testes da fronteira pública.

Implementado:
- THEME-001 resolvido por autorização explícita; GET `/api/v1/public/institutions/:slug/theme` expõe somente identidade, quatro cores e aparência;
- instituições ausentes/inativas retornam 404 neutro; CRUD ADMIN/CSRF permanece protegido;
- contrato Zod estrito, OpenAPI e repository por slug, sem alteração de schema/migration;
- loader server-only sem credenciais, com timeout e validação; `API_INTERNAL_URL` obrigatório em produção;
- ThemeContext compartilhado, SSR e aparência LIGHT/DARK/SYSTEM; raiz FUMEP mantém fallback neutro quando a fonte está indisponível;
- testes de fronteira pública, loader, provider e semântica da página; sem rotas institucionais ou preferência manual dos próximos loops.

Checks aprovados:
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 109 testes: 13 validation, 36 db, 53 API e 7 frontend;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`, `pnpm peers check`;
- Prettier do workflow e `git diff --check`;
- sem script Playwright/axe disponível nesta etapa; testes SSR preservam main, heading e fallback, com foco/skip link existentes.

Falhas corrigidas: typings DOM, schema Swagger e transformação JSX OXC. Instalação concorrente foi refeita sequencialmente; suites API serializadas para eliminar timeout de inicialização sob contenção. Checks finais verdes, sem bloqueios.

Aceite cumprido. execute-loop disciplinou escopo/status; architecture-guard condicionou a fronteira pública à decisão THEME-001, agora autorizada. Loop anterior commitado e worktree inicialmente limpo.

Commit: `feat(theme): expose public themes and add server-loaded context`.

## LOOP 3.7 — Concluído

Escopo atual:
- InstitutionContext por rota: `/` FUMEP, `/etmsl` ETMSL e `/cramam` CRAMAM;
- página compartilhada com loader público e ThemeContext existentes;
- SSR, isolamento entre instituições e fallback sem dados privados;
- sem preferência manual de tema, menus ou conteúdo dos próximos loops.

Estado inicial: loop 3.6 concluído no commit `56ed3e0`, Git limpo.

Implementado:
- resolver por segmentos completos e identidade compartilhada (slug, nome institucional e rota da Home);
- InstitutionProvider/useInstitution sem estado global mutável, identidade disponível também no fallback;
- três entradas de rota usam uma única página server-rendered e carregam somente o tema da instituição atual;
- proteção adicional contra tema de slug divergente; fallback neutro não expõe detalhes internos;
- testes do contexto, rotas reais, retorno à FUMEP, isolamento e indisponibilidade; main/heading e skip link/foco existentes preservados.

Checks aprovados:
- `pnpm --filter @fumep/web test` (17 testes) e `pnpm --filter @fumep/web typecheck`;
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 119 testes: 13 validation, 36 db, 53 API e 17 frontend;
- `pnpm peers check`, `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml` e `git diff --check`;
- build confirma `/`, `/etmsl` e `/cramam` dinâmicas com renderização no servidor;
- Playwright/axe ainda sem script disponível; não executados nem declarados como aprovados.

Aceite cumprido sem falhas de execução/testes. Sem alteração de API, schema, dependências ou funcionalidades futuras. execute-loop manteve o escopo; nextjs-frontend orientou reutilização e SSR; testing-qa orientou fixtures determinísticas e testes de isolamento.

Commit: `feat(institutions): resolve public route context`.

## LOOP 3.8 — Concluído

Escopo atual:
- prioridade preferência manual → ADMIN → sistema nos três temas;
- controle LIGHT/DARK acessível compartilhado;
- cookie somente visual, lido no SSR para evitar flash da preferência persistida;
- testes de prioridade, SSR e interação, sem funcionalidades futuras.

Estado inicial: loop 3.7 concluído no commit `360cf6c`, Git limpo.

Implementado:
- prioridade centralizada manual → ADMIN → sistema, sem duplicação por instituição;
- ThemeSwitcher compartilhado com botão nativo, nome acessível estável no SSR, foco visível e tokens institucionais;
- cookie `fumep_appearance` apenas LIGHT/DARK, Path=/, SameSite=Lax, um ano e Secure em HTTPS; não acessa sessão/credenciais;
- leitura server-only via cookies async do Next.js; preferência manual já determina data-appearance no HTML inicial;
- SYSTEM mantém media query CSS antes da hidratação e acompanha mudanças do dispositivo; ADMIN explícito e manual não são sobrescritos;
- armazenamento bloqueado não impede alternância em memória;
- jsdom somente de desenvolvimento para testes de interação/foco e hidratação.

Checks aprovados:
- `pnpm --filter @fumep/web test` (25 testes antes do teste adicional de armazenamento) e `pnpm --filter @fumep/web typecheck`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 128 testes finais: 13 validation, 36 db, 53 API e 26 frontend;
- `pnpm peers check`, `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml` e `git diff --check`;
- testes cobrem prioridades completas, três instituições, cookie inválido, Secure, storage bloqueado, foco, sistema e hidratação sem divergência;
- Playwright/axe e QA visual em navegador não executados; ainda sem script E2E disponível.

Aceite cumprido, checks verdes e sem falhas nesta rodada. Resolução inicial da preferência persistida no SSR e SYSTEM por CSS evitam troca visual tardia. Fallback neutro existente sem fonte de tema foi preservado. Sem API/migration ou funcionalidades futuras. execute-loop manteve escopo/status; nextjs-frontend orientou SSR sem flash e controle compartilhado; testing-qa orientou testes determinísticos de prioridade/interação.

Commit: `feat(theme): add persistent visitor dark mode preference`.

## LOOP 3.9 — Concluído

Escopo atual:
- reutilizar validação de contraste do 3.3;
- testar referências numéricas, limites, normalização e independência dos pares;
- Supertest comprova rejeição sem persistir alteração;
- testar tokens nos temas LIGHT/DARK das três instituições;
- sem alteração de branding, schema/migration ou escopo de mídia.

Estado inicial: loop 3.8 concluído no commit `520f2f1`, Git limpo.

Implementado:
- testes de referência sRGB (preto/branco, canais RGB e cinzas adjacentes ao limite), simetria e rejeição sem arredondar para 4.5;
- pares primary/foreground e accent/foreground testados independentemente, com posições invertidas;
- normalização dos quatro tokens e manutenção da validação no contrato público LIGHT/DARK/SYSTEM;
- Supertest/PostgreSQL comprova que quatro configurações inválidas retornam 400 sem alterar registro, timestamp ou projeção pública;
- testes SSR dos quatro tokens validados em FUMEP, ETMSL e CRAMAM LIGHT/DARK;
- validação de produção do 3.3 reutilizada sem duplicar regras, alterar branding ou criar migrations.

Checks aprovados:
- `pnpm --filter @fumep/validation test` (16 testes), `pnpm --filter @fumep/web test` (27 testes);
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 133 testes finais: 16 validation, 36 db, 54 API e 27 frontend;
- `pnpm peers check`, `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml` e `git diff --check`;
- sem mudanças de dependências/lockfile; Playwright/axe e QA visual não executados, ainda sem script E2E disponível.

Aceite cumprido sem falhas nesta rodada. Contraste mínimo 4.5:1 aplicado aos dois pares e rejeição antes da persistência comprovada. Não é auditoria completa de acessibilidade visual. execute-loop manteve o escopo; testing-qa orientou referências determinísticas e prova de não persistência; nextjs-frontend orientou a matriz SSR das instituições.

Commit: `test(theme): verify contrast boundaries and persistence safety`.

## LOOP 4.1 — Concluído

Escopo atual:
- tabela Media e migration aditiva, metadados canônicos, checksum e status;
- repository mínimo create/findById e testes de constraints;
- migration em banco local e do zero, checks disponíveis;
- sem upload, Worker, categorias, variantes, MediaUsage ou logos.

Estado inicial: loop 3.9 concluído no commit `e40bc01`, Git limpo.
Observação de precedência: Storage §21/modelo lógico §8.2 definem stored_filename, size_bytes e uploaded_by; são usados em vez dos aliases filename, size e created_by do plano. category_id/FK/índice ficam no loop 4.13, sem tabela futura antecipada.

Implementado:
- Media com UUID, TIMESTAMPTZ, nomes canônicos, storage_key relativo e metadados de acessibilidade/dimensões;
- enums media_type e media_processing_status, padrão PENDING;
- SHA-256 obrigatório hexadecimal minúsculo, índice não único permite duplicidade;
- BIGINT preservado como bigint, tamanho não negativo e dimensões opcionais positivas;
- uploaded_by nullable com ON DELETE SET NULL e índices de tipo/uploader/data/checksum;
- repository somente create/findById, sem exclusão insegura antes de MediaUsage;
- migration aditiva `0013_windy_juggernaut.sql`, sem alterações nas tabelas anteriores.

Checks aprovados:
- geração e aplicação local da migration;
- todas as migrations do zero em `portal_fumep_loop_4_1_test`, com 40 testes DB aprovados;
- `pnpm --filter @fumep/db test` (40 testes também no ambiente local);
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 137 testes finais: 16 validation, 40 db, 54 API e 27 frontend;
- `pnpm peers check`, Prettier do workflow e `git diff --check`;
- sem alteração de dependências/lockfile; E2E/axe não disponíveis nesta etapa; acessibilidade de metadados apenas, sem UI nova.

Falha resolvida: drizzle-kit no sandbox retornou uv_os_get_passwd ENOMEM; geração repetida com execução autorizada fora dessa restrição passou. Sem falhas pendentes.

Aceite cumprido. architecture-guard: conforme com observação de nomenclatura e categoria futura; drizzle-data-model orientou UUID/TIMESTAMPTZ, constraints e migration limpa; media-storage orientou metadados sem arquivos no banco e checksum não único; execute-loop manteve escopo/commit.

Commit: `feat(db): add canonical media metadata model`.

## LOOP 4.2 — Concluído (MEDIA-001 autorizado)

Escopo retomado em 2026-09-16:
- upload de imagem Browser → Next.js → NestJS → MinIO → PostgreSQL, sessão/CSRF;
- antecipação explicitamente autorizada de MediaCategory mínimo/category_id e escopo institucional de EDITOR;
- ADMIN global; EDITOR somente categorias de instituições atribuídas;
- validações básicas, SHA-256 obrigatório, nomes internos seguros, compensação de falhas;
- testes, migration limpa, checks e commit; sem gestão completa de categorias/Worker/variantes/PDF.

Git inicialmente limpo; HEAD `96c8c4b` registra o bloqueio anterior. Loop 4.1 concluído em `ef3b1d0`.

Implementado:
- `/admin/media`: formulário com labels, categoria obrigatória para EDITOR, estado de envio e status acessível; leitura SSR da sessão e categorias sem cache;
- proxy streaming Next.js com timeout, preservando origem/CSRF/cookie para validação no NestJS, sem credenciais em localStorage;
- POST `/api/v1/media/images`: sessão Redis/CSRF antes do multipart, validação de JPEG/PNG/WebP/AVIF e limite inclusivo de 15 MiB;
- arquivo original no MinIO com nome UUID e chave relativa; SHA-256 e metadados Media PENDING no PostgreSQL;
- transação Media + MEDIA_UPLOADED; compensação da chave recém-gerada em falhas, sem expor detalhes internos;
- modelo/repository mínimo MediaCategory, FK category_id RESTRICT e migration aditiva `0014_nostalgic_peter_parker.sql`;
- GET/POST de categorias mínimas para seleção/provisionamento de uploads, com escopo institucional no backend; sem edição/exclusão ou interface completa do 4.13;
- adapter MinIO reutilizado pelo diagnóstico storage:check; tipos multipart apenas de desenvolvimento;
- instruções e limites em `docs/MEDIA_UPLOAD.md`; MEDIA-001 resolvido com autorização explícita.

Checks aprovados:
- migration aplicada localmente e todas as migrations do zero em `portal_fumep_loop_4_2_test`, com 41 testes DB;
- sete testes Supertest do upload com MinIO/PostgreSQL reais: bytes originais, checksum, auditoria, permissões cruzadas/globais, CSRF, falhas e compensação;
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 152 testes finais: 16 validation, 41 DB, 61 API, 34 frontend;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false` aprovado;
- `pnpm --filter @fumep/api storage:check`, `pnpm peers check`, Prettier do workflow, `git diff --check`;
- SSR/jsdom/proxy cobrem labels, foco, FormData/CSRF, sucesso/erro e ausência de categoria;
- Playwright/axe e QA visual não executados; não existe script E2E nesta etapa.

Falhas corrigidas: tipos ambientais Multer, aceitação de transaction no repository, import do diagnóstico, nome de variável reservado pelo lint, limite multipart exato do Busboy e resolução de export relativo .js pelo Turbopack. Rechecks completos verdes; nenhuma falha pendente.

Aceite cumprido. architecture-guard: conforme com antecipação mínima autorizada; drizzle-data-model orientou FK/migration limpa; media-storage/security-access orientaram validação, checksum e escopo persistido; nextjs-frontend/testing-qa orientaram SSR, interação e provas de consistência. Gestão completa de categorias permanece no 4.13; fila/Sharp/variantes/PDF/MediaUsage não antecipados.

Commit: `feat(media): add institution-scoped image upload`.

## LOOP 4.3 — Concluído

Estado inicial: loop 4.2 concluído em `058c5c8`, Git limpo.

Escopo atual:
- testar extensão/MIME/magic bytes em JPEG/PNG/WebP/AVIF;
- testar assinatura truncada, inconsistências, tipos proibidos e nomes inválidos;
- comprovar limite inclusivo de 15 MiB e ausência de gravação para rejeições;
- reutilizar validação do 4.2, sem duplicidade/filas/processamento ou funcionalidades futuras.

Implementado:
- 19 testes unitários de formatos, extensão/MIME/assinatura independentes, nomes, arquivo vazio e limites;
- AVIF testa major/compatible brand, caixas BMFF inválidas/truncadas e rejeição de HEIC;
- Supertest testa inconsistências, dupla extensão, assinatura incompleta, múltiplos arquivos e campos duplicados;
- envio real de exatamente 15 MiB passa; +1 e +2 bytes retornam 413 antes de put/create;
- spies e PostgreSQL comprovam que rejeições não persistem mídia;
- nenhum código de validação de produção, contrato, schema ou dependência precisou mudar.

Checks aprovados:
- Vitest focado `src/media/image-validation.spec.ts test/media.e2e.spec.ts --fileParallelism=false`: 28 testes;
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 173 testes finais: 16 validation, 41 DB, 82 API, 34 frontend;
- `pnpm peers check`, Prettier do workflow e `git diff --check`;
- sem migration nova; sem script E2E disponível, Playwright/axe não executados.

Aceite cumprido, nenhuma falha nesta rodada. Fixtures de assinaturas não afirmam decodificação completa; essa etapa pertence ao Sharp/Worker. media-storage/testing-qa orientaram matriz e prova de não persistência; execute-loop manteve escopo.

Commit: `test(media): cover upload signatures and size boundaries`.

## LOOP 4.4 — Concluído

Estado inicial: loop 4.3 concluído em `199665b`, Git limpo.
Escopo atual:
- consolidar cálculo SHA-256 obrigatório no backend e testar vetores conhecidos/binários;
- provar igualdade por bytes, independência do nome/categoria e rejeição de hash do cliente;
- preservar constraints/índice não único existentes, sem antecipar fluxo de duplicidade.

Implementado:
- helper puro mediaChecksum centraliza SHA-256 já obrigatório, sem conversão textual ou estado compartilhado;
- cálculo antes de MinIO e persistência canônica existente preservada;
- quatro testes unitários com vetores fixos (vazio, abc, byte nulo), binários, mutação e independência entre chamadas;
- Supertest comprova mesmos bytes/nome e categoria diferentes → mesmo hash, byte diferente → hash diferente;
- checksum do cliente rejeitado antes de put/create; constraints/índice não único e formato de resposta preservados;
- documentação do fluxo atualizada, sem migration/dependência ou aviso de duplicidade futuro.

Checks aprovados:
- Vitest focado `src/media/media-checksum.spec.ts test/media.e2e.spec.ts --fileParallelism=false`: 15 testes;
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 179 testes finais: 16 validation, 41 DB, 88 API, 34 frontend;
- `pnpm peers check`, Prettier do workflow e `git diff --check`;
- E2E/axe não disponíveis, sem nova UI nesta etapa.

Aceite cumprido sem falhas de código/checks. media-storage/testing-qa orientaram checksum dos bytes e vetores de referência; execute-loop preservou escopo e constraints existentes.

Commit: `test(media): consolidate mandatory server-side SHA-256`.

## LOOP 4.5 — Concluído

Estado inicial: loop 4.4 concluído em `b56b480`, Git limpo.
Escopo atual:
- consultar checksum antes do novo original e avisar sobre mídia existente autorizada;
- formulário oferece usar existente ou enviar assim mesmo explicitamente;
- seleção revalida autorização no backend e não cria arquivo/Media/MediaUsage;
- EDITOR consulta apenas categorias institucionais atribuídas, preservando MEDIA-001; não abrir mídia global/estrangeira;
- contratos Zod/OpenAPI, testes, checks, status e commit; sem fila/Worker/variantes ou busca futura.

Implementado:
- lookup determinístico de checksum no repository, usando o índice existente e escopo institucional por categoria;
- POST images responde 200 com aviso/projeção estrita de duplicata autorizada antes de put/create; evento MEDIA_DUPLICATE_DETECTED;
- `uploadAnyway: "true"` confirma registro/UUID/chave separados, sem constraint UNIQUE ou bloqueio automático;
- POST selection revalida mídia/categoria/sessão/CSRF e retorna referência autorizada sem novo objeto/Media/MediaUsage;
- formulário preserva FormData, oferece as duas escolhas, invalida escolha após alteração de campos e apresenta sucesso/erro acessível;
- foco no primeiro controle de escolha e retorno ao campo após sucesso, respeitando estado disabled;
- EDITOR não consulta mídia global/estrangeira no aviso, nem seleciona por autoria; ADMIN global;
- contratos Zod/OpenAPI, proxy Next.js de seleção com endpoint fixo e documentação do fluxo;
- ausência de novo schema/migration/dependência ou funcionalidades futuras.

Checks aprovados:
- `pnpm --filter @fumep/db --filter @fumep/validation test`: 42 DB + 18 validation;
- Vitest/Supertest focado `test/media.e2e.spec.ts`: 15 testes com MinIO/PostgreSQL reais;
- `pnpm --filter @fumep/web test`: 38 testes;
- todas as migrations do zero em `portal_fumep_loop_4_5_test` + 42 testes DB;
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 190 testes finais: 18 validation, 42 DB, 92 API, 38 frontend;
- `pnpm peers check`, Prettier do workflow e `git diff --check`;
- cenários: aviso sem gravação, seleção, confirmação, concorrência, mídia global/estrangeira com mesmo uploader, mudança de categoria após aviso, CSRF e payload estrito;
- Playwright/axe/QA visual não executados; script E2E ainda inexistente.

Falhas resolvidas: teste encontrou foco chamado antes de reabilitar o input; retorno movido para efeito após busy=false. Formatação de media.store.ts corrigida. Rechecks completos verdes, nenhuma falha pendente.

Aceite cumprido. security-access manteve menor privilégio; drizzle-data-model orientou lookup/fixture e banco limpo; media-storage orientou aviso sem bloquear confirmação; nextjs-frontend/testing-qa orientaram escolhas e foco. Seleção não é associação a conteúdo nem processamento concluído.

Commit: `feat(media): offer authorized duplicate reuse or explicit upload`.

## LOOP 4.6 — Concluído

Estado inicial: loop 4.5 concluído em `cecce38`, Git limpo.
Escopo atual:
- biblioteca compartilhada mínima da fila media BullMQ/Redis e lifecycle de conexão;
- provedor NestJS e diagnóstico da fila, sem consumidor PROCESS_MEDIA ou processamento antecipado;
- retries limitados, retention configurável e namespace bull:media;
- testes reais de configuração/conexão/persistência da fila e fechamento;
- ajustar provisionamento CI de Redis/MinIO para os testes de infraestrutura existentes, sem pular testes ou expor serviços;
- checks, documentação e commit.

Observação: CI atual provisiona apenas PostgreSQL, mas testes de sessão já exigem REDIS_URL e testes de upload exigem MinIO. O loop de fila adiciona provisionamento explícito dessas dependências de teste no workflow, sem alterar arquitetura de produção.

Entregue: pacote @fumep/jobs, configuração Redis/TLS, retries/backoff/retention, producer lazy com fechamento, provedor NestJS, diagnóstico queue:check, testes isolados reais e docs/MEDIA_QUEUE.md. Nenhum upload enfileirado nem consumidor antecipado.

Checks aprovados: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (202: 18 validation, 42 DB, 12 jobs, 92 API, 38 web), `pnpm build`, `pnpm peers check`, `pnpm --filter @fumep/api queue:check`, `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`, Prettier do workflow e `git diff --check`.

Falhas resolvidas: política de build do addon opcional msgpackr-extract explicitamente false; diagnóstico usava ping ausente na interface pública BullMQ, substituído por leitura suportada. Rechecks completos verdes. Docker CLI indisponível em Windows/WSL; Compose/CI remota não executados. Playwright/axe não executados (script E2E inexistente).

Aceite cumprido. jobs-worker manteve fila sem processamento no request; testing-qa orientou isolamento/limpeza de fixtures. Commit: `feat(media): configure shared BullMQ media queue`.

## LOOP 4.7 — Concluído

Estado inicial: 4.6 concluído em `97ec6b4`, Git limpo.
Escopo: contrato PROCESS_MEDIA mínimo, producer após commit Media, preservação do original/registro se Redis falhar, consumidor separado com lookup PostgreSQL e logs seguros, testes de recepção/repetição/retry/falha/shutdown. Sem Sharp, variantes ou marcação READY.

Entregue: payload Zod estrito mediaId, ID determinístico compatível BullMQ, enqueue após persistência (fora da compensação), consumer real apps/worker, lookup PostgreSQL, logs sanitizados, concorrência configurável e SIGINT/SIGTERM com fechamento. Recepção é checkpoint incremental, não processamento concluído; Media permanece PENDING.

Checks aprovados: `pnpm format:check`, `pnpm lint` sem warnings finais, `pnpm typecheck`, `pnpm test` (209: 18 validation, 42 DB, 12 jobs, 93 API, 38 web, 6 worker), `pnpm build`, `pnpm peers check`, `pnpm --filter @fumep/worker test`, `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`, Prettier workflow e `git diff --check`.

Cenários: lookup real PostgreSQL, recepção Redis, dedupe, reexecução sem alteração de estado, retry temporário, três tentativas exauridas, payload inválido sem secrets, fechamento de consumidor/conexões, preservação do original/registro na falha Redis e ausência de enqueue no aviso/seleção. Log ERROR de enqueue no teste é falha simulada esperada. Warning de argumento não usado corrigido. Nenhuma falha pendente. E2E browser/axe/CI remota não executados.

Aceite cumprido. jobs-worker orientou consumer separado e retry; nestjs-api/media-storage preservaram transação principal e original; testing-qa orientou fixtures isoladas. Commit: `feat(media): deliver PROCESS_MEDIA to dedicated worker`.

## LOOP 4.8 — Concluído

Estado inicial: 4.7 concluído em `724ee0a`, Git limpo.
Escopo: adapter MinIO compartilhado, leitura limitada do original, integridade SHA-256/tamanho, decodificação Sharp e orientação/dimensões, persistência apenas de width/height existentes, testes de formatos/corrupção/recursos/repetição e integração real. Sem variantes, READY ou mudanças de schema.

Entregue: @fumep/storage extraído do adapter API, leitura por stream limitada/encerrada, Sharp no Worker com failOn=warning, limite de pixels/timeout, orientação EXIF, checksum/tamanho antes de decode, updateDimensions idempotente. Sem alteração de schema/migration, original ou estado final. Pipeline continua checkpoint PENDING documentado.

Checks aprovados: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (222: 18 validation, 43 DB, 12 jobs, 3 storage, 93 API, 38 web, 15 worker), `pnpm build`, `pnpm peers check`, `pnpm --filter @fumep/worker --filter @fumep/storage test`, `pnpm --filter @fumep/api storage:check`, install frozen, Prettier workflow e `git diff --check`. Todas as migrations do zero em `portal_fumep_loop_4_8_test` + 43 testes DB. Banco de fixture preservado.

Falhas resolvidas: update tentou timestamp ausente em Media, removido sem alterar schema; Drizzle no sandbox retornou uv_os_get_passwd ENOMEM, reexecução autorizada aplicou migrations e passou. Nenhuma falha pendente. Browser E2E/axe/QA visual/CI remota não executados.

Aceite cumprido. media-storage orientou preservação/integridade; drizzle-data-model restringiu persistência aos campos existentes; jobs-worker manteve Sharp fora do request; testing-qa cobriu quatro formatos, EXIF, corrupção, pixel limit, integridade, storage indisponível, stream limitado e integração real/repetição. Commit: `feat(media): decode originals with Sharp in worker`.

## LOOP 4.9 — Concluído

Estado inicial: 4.8 concluído em `207ebd5`, Git limpo.
Escopo: MediaVariant canônico com storage_key relativo, migration/repository idempotente, geração WebP/AVIF sem upscale e thumbnail reutilizando menor WebP (até 320px), objetos/metadados e testes reais de repetição/concorrência/falhas/migrations. Tamanhos sugeridos canônicos 320/640/960/1280/1920, incluindo largura original se menor que 1920. Sem READY/UI de biblioteca.

Entregue: media_variants UUID/FK CASCADE/TIMESTAMPTZ/BIGINT/storage_key, constraints/unique media-format-width, repository upsert estável/concorrente; Sharp WebP/AVIF sequenciais, sRGB/orientação/timeout/sem upscale, thumbnail compartilhada e integração do consumer. Original e derivados válidos preservados em falhas. Sem status final.

Checks aprovados: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (230: 18 validation, 47 DB, 12 jobs, 3 storage, 93 API, 38 web, 19 worker), `pnpm build`, `pnpm peers check`, `pnpm --filter @fumep/db --filter @fumep/worker test`, Prettier workflow e `git diff --check`. Migrations 0015/0016 geradas pelo Drizzle/aplicadas localmente; todas as migrations do zero em `portal_fumep_loop_4_9_test` + 47 testes DB. Banco de fixture preservado; nenhuma dependência/lockfile nova.

Falhas resolvidas: tipo OutputInfo importado explicitamente do Sharp; escape literal '..' no CHECK corrigido em 0016 aditiva após 0015 aplicada. Teste garante segmento legítimo de dois caracteres e rejeita traversal/URL. Rechecks verdes, nenhuma falha pendente. Browser E2E/axe/QA visual/CI remota não executados.

Aceite cumprido. drizzle-data-model orientou constraints/idempotência e precedência storage_key; media-storage orientou tamanhos sugeridos, thumbnail compartilhada/preservação; jobs-worker manteve processamento separado; testing-qa cobriu codecs/aspecto/imagem pequena/integridade/repetição/concorrência/falhas/objetos reais. Commit: `feat(media): persist responsive WebP and AVIF variants`.

## LOOP 4.10 — Concluído

Estado inicial: 4.9 concluído em `89fa52a`, Git limpo.
Escopo: transições condicionais PENDING/PROCESSING/READY/FAILED, resumo de erro allowlisted, auditoria transacional da falha, integração do pipeline e leitura autorizada do estado. Falha temporária permanece PROCESSING até retry/final; READY preservado em repetição. Sem novas tabelas/migrations, PDF ou UI completa de biblioteca.

Entregue: MediaProcessingRepository com transições condicionais; PROCESSING antes do processamento, READY após todos os derivados, FAILED em erro permanente/última tentativa; resumo allowlisted e MEDIA_PROCESSING_FAILED transacional. Reexecução READY sem leitura/encoding; falha tardia não desfaz READY. GET media/:id/processing com sessão/autorização fresca, contrato Zod/OpenAPI, mensagem amigável e no-store.

Checks aprovados: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (232: 18 validation, 47 DB, 12 jobs, 3 storage, 94 API, 38 web, 20 worker), `pnpm build`, `pnpm peers check`, `pnpm --filter @fumep/worker test`, ESLint focado nos últimos arquivos API, Prettier workflow e `git diff --check`. Nenhuma alteração de schema/migration/dependência. Pipeline real Redis/MinIO/PostgreSQL/Sharp chega a READY com variantes; testes persistidos cobrem falhas permanentes/temporárias/exauridas, reexecução e auditoria.

Falhas resolvidas: formatação de media-processing.repository.ts corrigida; rechecks verdes. Log ERROR do enqueue é fixture de falha simulada esperada. Nenhuma falha pendente. UI completa de acompanhamento/retry, varredura/outbox, browser E2E/axe/QA visual e CI remota não entregues/executados neste loop.

Aceite cumprido. drizzle-data-model orientou transições/auditoria atômicas no PostgreSQL; jobs-worker/media-storage mantiveram READY dependente dos derivados e original preservado; security-access/nestjs-api revalidaram escopo e projeção segura; testing-qa cobriu integração e estados. Commit: `feat(media): persist processing lifecycle and authorized status`.
