# SPACER V1 — 5.20

Contrato canônico/versionado: `data.size` aceita exclusivamente `SMALL`, `MEDIUM` ou `LARGE`. O schema é strict e recusa pixels, CSS e campos extras. SPACER pertence somente a PAGE, pois não integra o subconjunto canônico de ARTICLE.

O editor Client oferece um `select` nativo com três escolhas nomeadas. Aplicar valida e envia snapshot clonado por callback async/ref/busy; falha conserva a escolha. O caller remonta por owner/bloco/versão e continua responsável por autorização e persistência.

O renderer SSR valida envelope, versão, visibilidade e enum antes de renderizar; dados inválidos falham fechado. O espaço é decorativo (`aria-hidden="true"`), não cria conteúdo editorial nem elemento focalizável. As alturas são tokens fixos do Design System: SMALL 1rem, MEDIUM 2rem, LARGE 4rem. O conteúdo usa `BlockBackground`, tema e background resolvidos pelo caller. O editor não informa pixels, estilos ou cores.

Este loop não cria endpoints, migrations, mídia, Preview, publicação, busca, cache ou persistência. SPACER não adiciona texto à indexação futura.

Vitest cobre enum/envelope estritos, rejeição de valores livres, editor/falha/concorrência, renderer fail-closed, Registry/contexto e axe semântico. `test:e2e` ainda não existe; axe em jsdom não certifica layout. QA real confirmou MEDIUM 32 px em 390 px e LARGE 64 px em 1.280 px, seletor/teclado/foco, tema LIGHT/DARK, controles de 44 px, ausência de overflow e console limpo. A fixture temporária foi removida.
