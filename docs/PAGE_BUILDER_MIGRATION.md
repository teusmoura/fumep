# MIG 5.1 — Page Builder básico isolado

O Nuxt expõe `/builder-demo` para editar em memória uma página com TEXT, HERO e IMAGE: adicionar, editar, mover por botões acessíveis, ocultar e remover. A prévia valida o conjunto e usa `BuilderBlocks.vue`, o mesmo componente da rota `/builder-demo/public`. Zod valida schemas v1 estritos, posições/IDs/âncoras, alt contextual, mídias selecionáveis e links internos. Conteúdo textual é interpolado como texto, sem HTML livre; não há CSS ou grid editável.

As duas ilustrações SVG são **assets estáticos da aplicação usados como fixture visual**, não uploads editoriais nem registros `Media`. O bloqueio de upload SVG editorial permanece. O estado do editor se perde ao recarregar; a rota pública usa sempre a fixture fixa, não as mudanças locais do editor. Não há autenticação, salvamento, PageVersion, publicação, MediaUsage persistente ou integração FastAPI/PostgreSQL. Não usar essas rotas como painel de produção.

Para experimentar localmente: `pnpm --filter @fumep/portal dev` e abrir `http://localhost:3002/builder-demo`. A página pública fixa fica em `/builder-demo/public`.

## MIG 5.2 — composição editorial avançada

A mesma demonstração incorpora IMAGE_TEXT (imagem à esquerda/direita), CARDS (1–12 itens somente com imagem), QUICK_LINKS (ícones do sistema, sem SVG fornecido pelo Editor) e CTA. Cada tipo tem schema v1 estrito, campos controlados, renderer no registry e fixture pública. Destinos aceitam somente caminhos internos; mídia continua restrita aos IDs da fixture. A prévia inteira é bloqueada por dados inválidos. O limite de 12 QUICK_LINKS é uma proteção desta demonstração, não uma decisão de persistência canônica. Não há novas integrações nem salvamento.

## MIG 5.3 — FAQ, abas e tabela estruturada

FAQ aceita de 1 a 30 perguntas/respostas, usando `details`/`summary` nativos para expansão por teclado. TABS aceita de 1 a 8 abas de texto simples, com `tablist`/`tab`/`tabpanel`, foco navegável por setas, Home e End, sem blocos aninhados. TABLE usa legenda opcional, cabeçalhos de coluna e matriz de células; a quantidade de células de cada linha deve corresponder à de cabeçalhos. O renderer emite `table`, `caption`, `thead`, `th scope="col"` e `tbody` sem HTML fornecido pelo Editor. Os limites demonstrativos de 12 colunas e 50 linhas protegem o editor em memória; não estabelecem uma decisão de persistência canônica.

Os três tipos compartilham o registry entre editor/preview e rota pública, têm schema v1 estrito e fixture fixa. Todo texto é interpolado, sem `v-html`. Permanecem sem salvamento, API, PageVersion ou publicação. O smoke SSR e axe automatizado não verificam contraste de cores em jsdom nem substituem um teste E2E de interação real no navegador.

## MIG 5.4 — linha do tempo, indicadores e carrossel

TIMELINE apresenta uma lista ordenada de marcos (data opcional, título e descrição), com título de seção opcional. STATISTICS apresenta até 12 indicadores (valor, rótulo e descrição opcional) em lista semântica, sem animação de contagem. CAROUSEL apresenta até 10 imagens selecionadas da fixture, cada qual com alt obrigatório, legenda e caminho interno opcionais. Controles manuais de anterior/próximo, setas e Home/End mudam a imagem ativa; não há avanço automático. Apenas a imagem ativa é exibida. Como proteção do editor em memória, a linha do tempo aceita até 50 marcos nesta demonstração, sem estabelecer limite de persistência canônica.

Os três novos tipos têm schema v1 estrito, campos controlados, fixture pública e renderer compartilhado entre prévia e SSR. A validação rejeita mídia inexistente, alt vazio e URL externa no carrossel. Nenhum conteúdo HTML livre é aceito. As rotas continuam demonstrativas, sem persistência, publicação ou integração FastAPI/PostgreSQL.

## MIG 5.5 — mapa, vídeo e documento controlados

MAP mantém título opcional, endereço obrigatório, latitude/longitude e zoom validados em campos numéricos. O SSR mostra endereço/coordenadas e gera um link fixo para OpenStreetMap; não consulta mapas externos a cada visita nem aceita HTML do Editor. VIDEO aceita exclusivamente URL HTTPS restrita de vídeo YouTube/Vimeo, transforma-a em endereço de player conhecido e só carrega o iframe após clique; título obrigatório, descrição opcional, sem iframe/HTML livre. DOCUMENT seleciona um único PDF de fixture local por ID fixo, com título, descrição e rótulo opcionais. A rota `/builder/demo-document.pdf` entrega um PDF válido apenas para demonstração. O bloco informa que ele **não** é um registro persistido na Media Library. A verificação de existência/tipo de PDF da biblioteca real e sua autorização ficam para a fase de integração aprovada.

Os três blocos têm schema v1, editor, renderer e registro compartilhado entre prévia e rota pública. Nenhuma parte deste loop implementa publicação, PageVersion ou integração FastAPI/PostgreSQL/MinIO. O smoke SSR/axe não substitui teste E2E de teclado nem verifica contraste de cores em jsdom.

## MIG 5.6 — inventário do registry V1 demonstrativo

Os 23 tipos do catálogo canônico têm entrada de schema v1, editor e renderer no registry Nuxt: TEXT, HERO, IMAGE, IMAGE_TEXT, CAROUSEL, CARDS, QUICK_LINKS, FAQ, TABS, TABLE, TIMELINE, STATISTICS, MAP, VIDEO, DOCUMENT, NEWS_FEED, EVENT_FEED, COURSE_FEED, CONTEST_FEED, SELECTION_PROCESS_FEED, GALLERY_FEED, CTA e SPACER. Teste de catálogo compara esse conjunto explicitamente; `Record<BlockType, ...>` exige registro para cada tipo no typecheck. Prévia e rota pública usam o mesmo renderer.

Os seis feeds guardam somente configuração validada: título opcional, filtros de instituições/categorias selecionáveis quando aplicáveis, limite de 1 a 12, estado demonstrativo para concursos/seleções e galeria selecionável. Seus itens são fixtures locais filtradas em memória, claramente rotuladas como demonstração; não são cópias persistidas de notícia/evento/curso nem resultados de integração externa. SPACER aceita apenas SMALL, MEDIUM ou LARGE, sem pixels livres. Os controles de edição e schemas rejeitam IDs de filtro/galeria desconhecidos, conteúdo arbitrário inserido no bloco e limites inválidos.

Isto fecha o **catálogo demonstrativo**, não a paridade de produção: feeds reais, MediaUsage, escopo ARTICLE, publicação/PageVersion, texto rico controlado e fundos institucionais/imagem canônicos ainda não estão implementados no Nuxt. A interface de demonstração continua com texto simples e fundos NONE/SURFACE. Esses itens exigem fases funcionais posteriores e integração aprovada; não devem ser interpretados como concluídos pelo registro dos tipos.

## MIG 5.7 — PageTemplate isolado

Dois modelos locais exemplificam escopo global e institucional. O contrato Zod valida metadados do modelo lógico V1, snapshot completo de blocos, IDs/posições/âncoras e o conjunto via schemas do registry. No editor `/builder-demo`, escolher instituição e modelo disponível e aplicar substitui **somente o rascunho em memória**. A aplicação copia o snapshot, gera novos IDs de bloco, normaliza posições e não altera o template nem outra cópia; modelos inativos, de outra instituição ou inválidos são rejeitados.

Os modelos não são registros `page_templates` no PostgreSQL; `createdBy` é nulo e datas são fixas de fixture. Não há CRUD persistido, ADMIN/EDITOR real, autorização de backend, PageVersion ou publicação. Essas capacidades dependem da fase de integração e da escolha pendente de ORM/migrations Python com baseline segura do schema legado.
