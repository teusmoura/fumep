# QUICK_LINKS V1 — 5.18

Contrato canônico/versionado: `data.title?` é texto não branco de até 200 caracteres e `data.items` contém ao menos um item strict com `label` não branco de até 120 caracteres, `url` segura HTTP(S), caminho do portal ou anchor, e `icon?` limitado ao enum do sistema. A documentação canônica não fixa máximo de itens para QUICK_LINKS; portanto este loop não inventa um limite. O bloco é permitido somente em PAGE, porque não integra o subconjunto canônico de ARTICLE.

O catálogo fechado V1 contém `ARROW_RIGHT`, `EXTERNAL_LINK`, `DOWNLOAD`, `DOCUMENT`, `CALENDAR` e `LOCATION`. O Editor persiste somente esses nomes estáveis; não aceita SVG, HTML, CSS, URL de ícone, biblioteca externa ou identificador arbitrário. O renderer associa cada enum a SVG interno versionado no código. Os ícones são complementos visuais decorativos (`aria-hidden="true"`, `focusable="false"`); o nome acessível do link vem sempre do rótulo textual.

O editor Client permite título opcional e adicionar, editar, remover e reordenar links por controles nativos. O seletor oferece apenas o catálogo fechado. Aplicar envia um snapshot clonado por callback async/ref/busy; falha conserva campos, ordem e seleção para correção ou nova tentativa. A lista não pode ficar vazia. O caller remonta o editor por owner/bloco/versão e continua responsável por autorização e persistência.

O renderer SSR valida envelope, versão, visibilidade, dados e URLs antes de renderizar; conteúdo inválido falha fechado. Com título, o `nav` é nomeado por `aria-labelledby`; sem título, recebe nome acessível próprio. React trata título/rótulo como texto, nunca como marcação. Links permanecem semanticamente nomeados e usam `BlockBackground`, tema e background resolvidos pelo caller.

O Design System fixa uma coluna no mobile, duas a partir de 640 px e três a partir de 1.024 px, com área interativa mínima de 44 px, tokens herdados, wrapping e foco visível. O Editor não controla grid, breakpoints, ícone SVG, cores, margens, animações ou CSS livre.

Este loop não cria endpoints, migrations, persistência, Preview, publicação, busca, cache, CTA ou gateways. A indexação futura considera title/label/url conforme a regra de publicação; icon e layout não são conteúdo indexável.

Vitest cobre schema strict, catálogo completo, ausência de item, limites textuais, URLs inseguras, editor/ordem/falha/concorrência, renderer fail-closed, Registry/contexto e axe semântico com e sem título. `test:e2e` ainda não existe; axe em jsdom não certifica contraste/layout global. QA real validou uma, duas e três colunas em 390/700/1.280 px, quatro links após adicionar/reordenar/editar, HTML literal escapado, ícones decorativos controlados, controles de 44 px, foco sólido, LIGHT/DARK, ausência de overflow e console limpo. A fixture temporária foi removida.
