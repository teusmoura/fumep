# FAQ V1 — 5.21

Contrato canônico/versionado: `data.title?` é texto não branco de até 200 caracteres; `data.items` contém de 1 a 30 objetos strict `{question, answer}`. Pergunta é texto não branco de até 200 caracteres e resposta é texto não branco de até 2.000. Esses limites textuais reutilizam as regras do HERO; o máximo 30 é canônico. Não há HTML, CSS, rich text ou blocos aninhados. FAQ pertence somente a PAGE, porque não integra o subconjunto de ARTICLE.

O editor Client adiciona, edita, remove e reordena itens por botões nativos, com máximo 30 e validação conjunta. Aplicar envia snapshot clonado por callback async/ref/busy; falha conserva campos e ordem. O caller remonta por owner/bloco/versão e continua responsável por autorização e persistência.

O renderer SSR valida envelope, versão, visibilidade e dados antes de renderizar; conteúdo inválido falha fechado. Usa `details/summary` nativos para um acordeão sem JavaScript público: teclado Enter/Espaço e estado expandido/recolhido são fornecidos pelo navegador e expostos à tecnologia assistiva. Com título, a seção usa heading associado; sem título recebe nome acessível próprio. React escapa pergunta/resposta como texto. `BlockBackground` recebe tema/imagem já resolvidos pelo caller. O Design System usa tokens, largura de leitura, wrapping, foco visível e área de resumo de pelo menos 44 px.

Este loop não cria endpoints, migrations, mídia, Preview, publicação, busca, cache ou persistência. A futura indexação considera title/question/answer conforme a regra de publicação.

Vitest cobre mínimo/máximo 30, schema strict/limites, editor/ordem/falha/concorrência, renderer fail-closed, Registry/contexto e axe semântico. `test:e2e` ainda não existe; axe em jsdom não certifica contraste global. QA real em 390/1.280 px LIGHT/DARK validou expansão por Enter, foco, aplicação após adicionar/reordenar, texto escapado, controles de 44 px, ausência de overflow e console limpo. A fixture temporária foi removida.
