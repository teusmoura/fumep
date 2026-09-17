# TEXT v1 — contrato

Loop 5.3 implementa somente schemas Zod e tipos inferidos em @fumep/validation. textBlockSchemaV1 compõe o contrato comum com type TEXT, schemaVersion literal 1 e data textBlockDataSchemaV1. Editor/renderer/registro completo pertencem aos 5.4/5.5; o Registry de produção continua vazio, sem placeholders.

O conteúdo rico é JSON estruturado, não uma string HTML. Data contém title opcional (texto simples até 200 caracteres) e content obrigatório `{ type: "doc", nodes: [] }`. Documento vazio é válido como rascunho; isto não valida nem autoriza publicação. Não há persistência, endpoint ou migração neste loop.

Nós controlados:

- paragraph: children inline;
- heading: level 2, 3 ou 4 e children inline (sem H1 livre);
- highlight: children inline, correspondente ao Destaque canônico;
- orderedList/bulletList: items com children inline, sem blocos aninhados;
- table: caption opcional, headers de texto não vazio e rows retangulares de texto simples.

Inline é text (text + marks opcionais bold/italic sem duplicação) ou link (url + children text, sem links aninhados). Links permitem HTTP(S) sem credenciais, paths root-relative same-origin ou anchors slug. Rejeitam javascript/data/vbscript/file, links protocol-relative, barras invertidas, whitespace/controles e protocolos ofuscados. Não há iframe, atributos/event handlers, CSS/fontes/cores/tamanhos/grid livres, HTML bruto ou tipos desconhecidos. Objetos são strict em todas as camadas.

Texto que contenha símbolos como `<script>` é texto literal, nunca HTML; o renderer futuro deve usar nós React/texto escapado, sem dangerouslySetInnerHTML. A sanitização estrutural por whitelist e Zod deverá ser repetida no backend antes de salvar/publicar, não confiada ao editor. Não foi implementado um importador/sanitizador de HTML legado nem publicação. TABLE/IMAGE/HERO outros blocos não são registrados por suportar uma tabela simples dentro de TEXT.

TEXT_V1_LIMITS controla limites operacionais: run até 5.000 caracteres, documento até 100.000 (inclui URLs/headers/células), 200 nós, 100 inline por grupo, 100 itens de lista, 12 colunas e 100 linhas de tabela. Controles invisíveis não textuais são rejeitados; tabs/quebras de linha em texto são permitidos. A árvore é de profundidade fixa, sem schema recursivo/lazy ou blocos dentro de texto rico. Limites e modelo são parte do contrato v1 documentado; alterações incompatíveis exigem nova versão.

Testes cobrem todos os recursos TEXT canônicos, contrato comum/versionamento, drafts vazios, URLs inseguras/ofuscadas, objetos/tipos/formatação extra, nesting, tabelas retangulares e limites. Não há interface nova; acessibilidade de rendering/edição será validada nos respectivos loops. Nenhuma lib de editor/HTML ou dependência nova foi introduzida.
