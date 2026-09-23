# CTA V1 — 5.19

Contrato canônico/versionado: `data.title` obrigatório e não branco (até 200 caracteres), `data.text?` texto simples opcional (até 2.000), `data.buttonLabel` obrigatório e não branco (até 120) e `data.buttonUrl` segura (HTTP(S), caminho absoluto do portal ou anchor, até 2.048). Os limites reutilizam as regras do HERO e o schema de URL de TEXT. O schema é strict; não há HTML, CSS, imagem, segundo botão ou layout editorial livre. CTA pertence a PAGE e ARTICLE conforme o subconjunto canônico.

O editor Client contém campos rotulados, indicação de invalidade, controles nativos de teclado e status focalizável. Aplicar valida todos os campos juntos, envia snapshot clonado por callback async/ref/busy e conserva as alterações na falha. O caller remonta o editor por owner/bloco/versão e continua responsável por autorização e persistência.

O renderer SSR valida envelope, versão, visibilidade e URL antes de renderizar; dados inválidos falham fechado. Usa heading, parágrafo opcional e um link nomeado pelo rótulo, com texto escapado pelo React. BlockBackground recebe tema/imagem de transporte previamente resolvidos pelo caller. A apresentação usa tokens do Design System, largura de leitura, wrapping, foco visível e área de link de pelo menos 44 px.

Este loop não cria endpoints, migrations, mídia, Preview, publicação, busca, cache ou persistência. A futura indexação considera title/text/buttonLabel conforme a regra de publicação, não URL como estilo ou autoridade.

Vitest cobre contrato strict/limites/URLs, editor com erro, retry e concorrência, renderer fail-closed, Registry/contextos e axe semântico. `test:e2e` ainda não existe; axe em jsdom não certifica contraste global. QA real em 390/1.280 px LIGHT/DARK validou aplicação, HTML literal escapado, link, controles de 44 px, foco, ausência de overflow e console limpo. A fixture temporária foi removida.
