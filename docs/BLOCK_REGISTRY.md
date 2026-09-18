# BlockRegistry

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
