# Renderer TEXT v1

`TextBlockRenderer` recebe `{ block: unknown }`, valida o envelope `textBlockSchemaV1` e renderiza somente TEXT versão 1 visível. Dados inválidos, versão/tipo desconhecidos e blocos ocultos retornam null sem revelar conteúdo bruto ou erro interno. Não há hooks, fetch, banco, autorização ou interpretação de HTML.

O conteúdo usa nós React escapados: título H2, headings H2/H3/H4, parágrafos/destaques, strong/em, links HTTP(S)/paths/anchors validados, ol/ul/li e tabela com caption/thead/th scope=col/tbody. Links permanecem na mesma aba. Labels vazios de links em drafts não geram links públicos sem nome. Aceitar draft incompleto não autoriza sua publicação; o backend futuro deve validar completude, hierarquia contextual e demais regras de publicação.

Estilos herdados/tokens preservam temas light/dark sem cores livres, texto quebra e mantém novas linhas. Tabelas têm rolagem horizontal em região nomeada/focável. Links são sublinhados e possuem focus-visible. Backgrounds/anchors comuns não são implementados neste renderer de conteúdo; a composição do bloco/proprietário será responsável nos loops correspondentes.

`frontendBlockRegistry`, em `apps/web/page-builder/block-registry.ts`, compõe apenas TEXT v1 completo: schema compartilhado, editor Client existente, renderer SSR, label Texto e PAGE/ARTICLE. A infraestrutura `blockRegistry` de @fumep/validation continua vazia e livre de imports React/Next; não é o catálogo UI operacional. O catálogo frontend será ampliado somente após implementação completa de cada bloco. Consumidores públicos podem importar diretamente o renderer para evitar composição editorial desnecessária. Não há nova rota/Preview público: o mesmo renderer será reutilizado pela composição pública e Preview protegido futuros.

Vitest cobre recursos semânticos, escaping em todos os contextos, protocolos, falha fechada, visibilidade e bindings/contextos/versionamento. axe-core verifica semântica em jsdom sem contraste/layout; não equivale a QA visual ou E2E em navegador real.
