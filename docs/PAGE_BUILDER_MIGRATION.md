# MIG 5.1 — Page Builder básico isolado

O Nuxt expõe `/builder-demo` para editar em memória uma página com TEXT, HERO e IMAGE: adicionar, editar, mover por botões acessíveis, ocultar e remover. A prévia valida o conjunto e usa `BuilderBlocks.vue`, o mesmo componente da rota `/builder-demo/public`. Zod valida schemas v1 estritos, posições/IDs/âncoras, alt contextual, mídias selecionáveis e links internos. Conteúdo textual é interpolado como texto, sem HTML livre; não há CSS ou grid editável.

As duas ilustrações SVG são **assets estáticos da aplicação usados como fixture visual**, não uploads editoriais nem registros `Media`. O bloqueio de upload SVG editorial permanece. O estado do editor se perde ao recarregar; a rota pública usa sempre a fixture fixa, não as mudanças locais do editor. Não há autenticação, salvamento, PageVersion, publicação, MediaUsage persistente ou integração FastAPI/PostgreSQL. Não usar essas rotas como painel de produção.

Para experimentar localmente: `pnpm --filter @fumep/portal dev` e abrir `http://localhost:3002/builder-demo`. A página pública fixa fica em `/builder-demo/public`.

## MIG 5.2 — composição editorial avançada

A mesma demonstração incorpora IMAGE_TEXT (imagem à esquerda/direita), CARDS (1–12 itens somente com imagem), QUICK_LINKS (ícones do sistema, sem SVG fornecido pelo Editor) e CTA. Cada tipo tem schema v1 estrito, campos controlados, renderer no registry e fixture pública. Destinos aceitam somente caminhos internos; mídia continua restrita aos IDs da fixture. A prévia inteira é bloqueada por dados inválidos. O limite de 12 QUICK_LINKS é uma proteção desta demonstração, não uma decisão de persistência canônica. Não há novas integrações nem salvamento.
