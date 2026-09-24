# BlockRegistry

Após 5.22, TABS v1 completo está registrado somente em PAGE com 1 a 8 abas, labels e conteúdo AST de parágrafos simples, marcações/links controlados e navegação ARIA por teclado. Catálogo frontend: TEXT, HERO (PAGE), IMAGE, IMAGE_TEXT, CARDS (PAGE), QUICK_LINKS (PAGE), CTA, SPACER (PAGE), FAQ (PAGE) e TABS (PAGE).

Após 5.21, FAQ v1 completo está registrado somente em PAGE com title opcional, 1 a 30 pares question/answer de texto simples e renderer SSR em details/summary nativos. Catálogo frontend: TEXT, HERO (PAGE), IMAGE, IMAGE_TEXT, CARDS (PAGE), QUICK_LINKS (PAGE), CTA, SPACER (PAGE) e FAQ (PAGE).

Após 5.20, SPACER v1 completo está registrado somente em PAGE com data.size SMALL/MEDIUM/LARGE; alturas são fixas no Design System, sem pixels/CSS editoriais. Catálogo frontend: TEXT, HERO (PAGE), IMAGE, IMAGE_TEXT, CARDS (PAGE), QUICK_LINKS (PAGE), CTA e SPACER (PAGE).

Após 5.19, CTA v1 completo está registrado em PAGE e ARTICLE, com title, text?, buttonLabel e buttonUrl segura. Editor Client e renderer SSR compartilham schema estrito, sem HTML/CSS/mídia ou mais de um botão. Catálogo frontend: TEXT, HERO (PAGE), IMAGE, IMAGE_TEXT, CARDS (PAGE), QUICK_LINKS (PAGE) e CTA.

Após 5.18, QUICK_LINKS v1 completo está registrado somente em PAGE, com title opcional, coleção não vazia de label/URL segura e ícone opcional restrito ao catálogo fechado do sistema. Editor e renderer não aceitam SVG/HTML/biblioteca externa ou nomes arbitrários. Catálogo frontend: TEXT, HERO (PAGE), IMAGE, IMAGE_TEXT, CARDS (PAGE) e QUICK_LINKS (PAGE).

Após 5.17, CARDS v1 completo está registrado somente em PAGE, conforme o subconjunto canônico de ARTICLE. O bloco aceita de 1 a 12 itens exclusivamente com imagem, sem ícones, e usa editor de coleção/renderer SSR responsivo. Catálogo frontend: TEXT, HERO (PAGE), IMAGE, IMAGE_TEXT e CARDS (PAGE).

Após 5.16, IMAGE_TEXT v1 completo está registrado em PAGE/ARTICLE (schema compartilhado, editor composto, renderer SSR), com IMAGE_LEFT/IMAGE_RIGHT. Catálogo frontend: TEXT, HERO (PAGE), IMAGE e IMAGE_TEXT; infraestrutura compartilhada continua vazia e agnóstica de UI.

## Catálogo operacional após 5.5

O catálogo UI central é `frontendBlockRegistry` em `apps/web/page-builder/block-registry.ts`. Ele compõe somente definições completas e inclui TEXT v1 com schema compartilhado, editor Client e renderer SSR, nos contextos PAGE/ARTICLE. Lookup continua exato e sem fallback de versão. Outros blocos serão acrescentados somente em seus loops; o 5.30 verifica o catálogo completo. A instância vazia compartilhada abaixo permanece infraestrutura agnóstica de UI, não catálogo operacional da API. Nenhum backend deve importar o registry frontend para carregar contratos Zod.

## Entrega original do 5.1

Após 5.8, IMAGE v1 completo está disponível em PAGE/ARTICLE, com alt contextual ou fallback válido, decoração explícita e caption. ARTICLE contém TEXT/IMAGE; HERO permanece exclusivo de PAGE. O catálogo não resolve acesso nem disponibilidade de mídia.

Após 5.7, o catálogo operacional também inclui HERO v1 completo apenas para PAGE; ARTICLE continua limitado ao TEXT já implementado. A imagem resolvida do renderer é metadado de transporte separado do JSONB, fornecido pelo caller e não obtido pelo registry.

Loop 5.1 entrega somente infraestrutura: `blockRegistry` de produção vazio, `BlockDefinition`, `BlockContext`, `BlockRegistry` e `createBlockRegistry`, compartilhados em @fumep/validation. Nenhum bloco concreto, schema comum, editor, renderer de conteúdo ou endpoint foi implementado.

Cada definição controlada pelo código terá type, schemaVersion, zodSchema, renderer, editor, label e allowedContexts PAGE/ARTICLE, conforme §9 de PAGE_BUILDER_CONTENT_BLOCKS.md. A factory recebe definições, valida metadados/versão/contextos e recusa pares type+schemaVersion duplicados. Versões diferentes coexistem; lookup não escolhe silenciosamente versão mais nova. Contexto incompatível e tipo/versão desconhecidos retornam undefined. A futura validação/publicação deverá tratar ausência como inválida, nunca como autorização ou fallback automático.

O registry não expõe mutação, registro via endpoint ou configuração editorial de tipos. Objetos/arrays de metadados são snapshots readonly/frozen, sem alterar inputs. Instâncias de teste não contaminam o catálogo de produção. A infraestrutura não executa schema/componentes, acesso a banco ou I/O. renderer/editor são bindings genéricos opacos: a API pode importar os contratos sem React/Next/browser; a composição de bindings UI tipados será feita quando seus loops implementarem os componentes. Isso não permite CSS/grid livre nem transforma o registry em autorização backend.

O código permanece no entrypoint compartilhado já consumido por API/web/Worker, preservando a resolução ESM/Turbopack existente e sem dependências novas. Exemplos sintéticos FIXTURE existem somente nos testes. Schemas comuns pertencem ao 5.2; TEXT schema/editor/renderer aos 5.3/5.4/5.5. Registro completo de um bloco só ocorre quando suas partes existirem, sem placeholders operacionais em produção.

Testes verificam catálogo vazio, lookup exato, Zod e identidade dos bindings, contexto, versões coexistentes, duplicação, metadados inválidos, isolamento e imutabilidade. Não há interface nova neste loop; acessibilidade/browser E2E não se aplicam à infraestrutura pura. A suíte existente web/API/DB/Worker continua obrigatória nos checks do projeto.
