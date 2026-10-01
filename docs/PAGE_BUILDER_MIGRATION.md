# MIG 5.1 — Page Builder básico isolado

O Nuxt expõe `/builder-demo` para editar em memória uma página com TEXT, HERO e IMAGE: adicionar, editar, mover por botões acessíveis, ocultar e remover. A prévia valida o conjunto e usa `BuilderBlocks.vue`, o mesmo componente da rota `/builder-demo/public`. Zod valida schemas v1 estritos, posições/IDs/âncoras, alt contextual, mídias selecionáveis e links internos. Conteúdo textual é interpolado como texto, sem HTML livre; não há CSS ou grid editável.

As duas ilustrações SVG são **assets estáticos da aplicação usados como fixture visual**, não uploads editoriais nem registros `Media`. O bloqueio de upload SVG editorial permanece. O estado do editor se perde ao recarregar; a rota pública usa sempre a fixture fixa, não as mudanças locais do editor. Não há autenticação, salvamento, PageVersion, publicação, MediaUsage persistente ou integração FastAPI/PostgreSQL. Não usar essas rotas como painel de produção.

Para experimentar localmente: `pnpm --filter @fumep/portal dev` e abrir `http://localhost:3002/builder-demo`. A página pública fixa fica em `/builder-demo/public`.

## MIG 5.2 — composição editorial avançada

A mesma demonstração incorpora IMAGE_TEXT (imagem à esquerda/direita), CARDS (1–12 itens somente com imagem), QUICK_LINKS (ícones do sistema, sem SVG fornecido pelo Editor) e CTA. Cada tipo tem schema v1 estrito, campos controlados, renderer no registry e fixture pública. Destinos aceitam somente caminhos internos; mídia continua restrita aos IDs da fixture. A prévia inteira é bloqueada por dados inválidos. O limite de 12 QUICK_LINKS é uma proteção desta demonstração, não uma decisão de persistência canônica. Não há novas integrações nem salvamento.

## MIG 5.3 — FAQ, abas e tabela estruturada

FAQ aceita de 1 a 30 perguntas/respostas, usando `details`/`summary` nativos para expansão por teclado. TABS aceita de 1 a 8 abas de texto simples, com `tablist`/`tab`/`tabpanel`, foco navegável por setas, Home e End, sem blocos aninhados. TABLE usa legenda opcional, cabeçalhos de coluna e matriz de células; a quantidade de células de cada linha deve corresponder à de cabeçalhos. O renderer emite `table`, `caption`, `thead`, `th scope="col"` e `tbody` sem HTML fornecido pelo Editor. Os limites demonstrativos de 12 colunas e 50 linhas protegem o editor em memória; não estabelecem uma decisão de persistência canônica.

Os três tipos compartilham o registry entre editor/preview e rota pública, têm schema v1 estrito e fixture fixa. Todo texto é interpolado, sem `v-html`. Permanecem sem salvamento, API, PageVersion ou publicação. O smoke SSR e axe automatizado não verificam contraste de cores em jsdom nem substituem um teste E2E de interação real no navegador.
