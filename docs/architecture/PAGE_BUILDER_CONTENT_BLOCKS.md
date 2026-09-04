# ARQUITETURA TÉCNICA V1 — PAGE BUILDER E CONTENT BLOCKS

## 1. OBJETIVO

Este documento define a arquitetura do **Page Builder**, dos **Content Blocks**, do **Preview**, do **versionamento**, da **validação**, da **publicação** e do **rendering** do Portal FUMEP.

O Page Builder será baseado em **blocos pré-definidos**, com ordenação por drag-and-drop, configurações controladas e Design System central.

Não será utilizado um editor livre no estilo Elementor.

---

# 2. ESTRUTURA BASE

```text
Page
└── ContentBlock[]
    ├── id
    ├── type
    ├── position
    ├── is_visible
    ├── schema_version
    ├── background
    ├── background_media_id
    ├── anchor
    └── data JSONB
```

Cada bloco terá contrato próprio e validação obrigatória.

---

# 3. CONTENTBLOCK

Estrutura conceitual:

```text
content_blocks
--------------
id UUID PK
owner_type
owner_id
type
position
is_visible
schema_version
background
background_media_id
anchor
data JSONB
created_at
updated_at
```

`owner_type` permitirá inicialmente:

```text
PAGE
ARTICLE
```

---

# 4. COMPORTAMENTO DO EDITOR

O Editor poderá:

```text
Adicionar
Editar
Duplicar
Ocultar
Exibir
Reordenar
Excluir
```

blocos dentro de conteúdos para os quais possua autorização.

A interface também poderá permitir colapsar/expandir blocos sem persistir esse estado como conteúdo.

---

# 5. VISIBILIDADE

Blocos ocultos permanecerão salvos:

```text
is_visible = false
```

mas não serão renderizados publicamente.

---

# 6. SCHEMA VERSION

Cada bloco terá:

```text
schema_version
```

Exemplo:

```text
HERO v1
HERO v2
```

Isso permitirá evolução futura sem quebrar conteúdo antigo.

---

# 7. DATA JSONB

As propriedades específicas ficarão em `data JSONB`.

Exemplo:

```json
{
  "type": "HERO",
  "schemaVersion": 1,
  "data": {
    "title": "Escola Técnica Municipal de Sete Lagoas",
    "description": "Educação profissional pública.",
    "imageId": "uuid",
    "imageAlt": "Fachada da escola",
    "button": {
      "label": "Conheça os cursos",
      "url": "/etmsl/cursos"
    }
  }
}
```

---

# 8. ZOD

Cada bloco terá schema Zod próprio e versionado.

Exemplo conceitual:

```ts
const HeroBlockSchemaV1 = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageId: z.string().uuid().optional(),
  imageAlt: z.string().optional(),
  button: z.object({
    label: z.string().min(1),
    url: z.string().min(1)
  }).optional()
})
```

---

# 9. BLOCK REGISTRY

A aplicação terá um registry central:

```text
BlockRegistry
```

Cada definição possuirá:

```text
type
schemaVersion
zodSchema
renderer
editor
label
allowedContexts
```

Exemplo:

```ts
{
  type: "HERO",
  schemaVersion: 1,
  schema: HeroBlockSchemaV1,
  editor: HeroBlockEditor,
  renderer: HeroBlockRenderer,
  allowedContexts: ["PAGE"]
}
```

---

# 10. CATÁLOGO DE BLOCOS V1

```text
TEXT
HERO
IMAGE
IMAGE_TEXT
CAROUSEL
CARDS
QUICK_LINKS
FAQ
TABS
TABLE
TIMELINE
STATISTICS
MAP
VIDEO
DOCUMENT
NEWS_FEED
EVENT_FEED
COURSE_FEED
CONTEST_FEED
SELECTION_PROCESS_FEED
GALLERY_FEED
CTA
SPACER
```

---

# 11. TEXT

Permitirá:

```text
Título
Texto
Destaque
Lista ordenada
Lista não ordenada
Links
Tabela simples
Negrito
Itálico
```

Não permitirá:

```text
fonte arbitrária
tamanho arbitrário
cor arbitrária
HTML livre
JavaScript
iframe
```

---

# 12. HERO

Campos:

```text
title
description
imageId
imageAlt
button
```

Na V1, HERO utilizará **somente imagem**.

Não haverá vídeo de fundo.

`title` será obrigatório.

Se a imagem for informativa, `imageAlt` será obrigatório.

Se for decorativa:

```text
imageAlt = ""
```

---

# 13. IMAGE

Campos:

```text
imageId
alt
caption
link
decorative
```

`imageId` obrigatório.

Se `decorative = false`, será necessário alt contextual ou fallback válido da Biblioteca de Mídia.

---

# 14. IMAGE_TEXT

Campos:

```text
title
text
imageId
imageAlt
imagePosition
button
```

Layouts permitidos:

```text
IMAGE_LEFT
IMAGE_RIGHT
```

Sem posicionamento arbitrário.

---

# 15. CAROUSEL

Estrutura:

```text
items[]
```

Cada item:

```text
imageId
alt
caption?
url?
```

Limite inicial:

```text
10 itens
```

---

# 16. CARDS

Cada card:

```text
imageId
title
description?
url?
```

Na V1, CARDS utilizará **somente imagem**.

Não haverá ícone alternativo.

Layout padrão:

```text
3 colunas no desktop
```

com responsividade automática.

Limite inicial:

```text
12 cards
```

---

# 17. QUICK_LINKS

Estrutura:

```text
title?
items[]
```

Cada item:

```text
label
url
icon?
```

Ícones controlados pelo sistema poderão existir em QUICK_LINKS.

---

# 18. FAQ

Estrutura:

```text
title?
items[]
```

Cada item:

```text
question
answer
```

Limite inicial:

```text
30 itens
```

---

# 19. TABS

Estrutura:

```text
tabs[]
```

Cada aba:

```text
label
content
```

Na V1, o conteúdo interno será texto rico simples.

Não haverá blocos aninhados dentro de abas.

Limite inicial:

```text
8 abas
```

---

# 20. TABLE

Estrutura:

```text
caption?
headers[]
rows[][]
```

Não haverá HTML de tabela arbitrário.

---

# 21. TIMELINE

Estrutura:

```text
title?
items[]
```

Cada item:

```text
date?
title
description
```

---

# 22. STATISTICS

Estrutura:

```text
items[]
```

Cada item:

```text
value
label
description?
```

Limite inicial:

```text
12 itens
```

Não haverá animação obrigatória de contagem.

---

# 23. MAP

Campos:

```text
title?
latitude
longitude
address
zoom?
```

O Editor não poderá inserir HTML de mapa.

---

# 24. VIDEO

Permitidos:

```text
YouTube
Vimeo
```

Campos:

```text
url
title
description?
```

Não haverá iframe livre.

---

# 25. DOCUMENT

Representa um único PDF em destaque.

Campos:

```text
mediaId
title?
description?
buttonLabel?
```

O arquivo deverá existir na Biblioteca de Mídia e ser PDF válido.

---

# 26. NEWS_FEED

Campos:

```text
title?
institutionIds?
categoryIds?
limit
order?
```

Não armazenará cópia das notícias.

---

# 27. EVENT_FEED

Campos:

```text
title?
institutionIds?
categoryIds?
limit
order?
```

---

# 28. COURSE_FEED

Campos:

```text
title?
institutionIds?
limit
order?
```

---

# 29. CONTEST_FEED

Campos:

```text
title?
institutionIds?
limit
status?
```

Dados provenientes da integração externa.

---

# 30. SELECTION_PROCESS_FEED

Campos:

```text
title?
institutionIds?
limit
status?
```

---

# 31. GALLERY_FEED

Campos:

```text
galleryId
title?
limit?
```

---

# 32. CTA

Campos:

```text
title
text?
buttonLabel
buttonUrl
```

---

# 33. SPACER

Valores permitidos:

```text
SMALL
MEDIUM
LARGE
```

Não será permitido informar espaçamento livre em pixels.

---

# 34. FUNDO DOS BLOCOS

Fundos permitidos:

```text
DEFAULT
LIGHT
INSTITUTION
IMAGE
```

`DEFAULT`: fundo padrão do Design System.

`LIGHT`: variação clara do tema.

`INSTITUTION`: utiliza identidade visual da instituição atual.

`IMAGE`: utiliza imagem da Biblioteca de Mídia e exige `background_media_id`.

---

# 35. MARGENS E ESPAÇAMENTO

O Editor não controlará livremente:

```text
margens
padding
gaps
largura máxima
grid
breakpoints
```

Essas definições serão responsabilidade do Design System.

---

# 36. ANCHORS

Cada bloco poderá possuir:

```text
anchor
```

Exemplo:

```text
documentos
```

permitindo:

```text
/etmsl/estagio#documentos
```

O anchor deverá ser único dentro da página.

O sistema poderá normalizar valores para formato de slug.

---

# 37. VERSIONAMENTO

A versão será da página inteira.

Estrutura:

```text
Page
↓
PageVersion
↓
snapshot completo
```

Não haverá versionamento individual por bloco.

---

# 38. PAGEVERSION

Estrutura conceitual:

```text
PageVersion
--------------
id
page_id
version_number
snapshot JSONB
created_by
created_at
```

O snapshot deverá conter:

- dados da página;
- metadados;
- blocos;
- ordem;
- visibilidade;
- schema_version;
- configurações relevantes.

PageVersion será imutável.

Na V1, versões antigas poderão ser visualizadas, sem obrigação de restauração automática.

---

# 39. EVOLUÇÃO DE SCHEMA

O renderer deverá manter suporte às versões antigas enquanto necessário.

Poderá existir futuramente:

```text
MIGRATE_CONTENT_BLOCKS
```

para migração de conteúdo entre versões.

---

# 40. PREVIEW

O Preview renderizará a versão de trabalho.

Fluxo:

```text
Editor altera página
↓
salva
↓
abre Preview
↓
rota protegida
↓
Next.js consulta versão de trabalho
↓
renderiza
```

Preview não usará cache público.

Preview deverá exigir sessão e autorização.

---

# 41. RENDERER ÚNICO

A aplicação utilizará:

```text
ContentBlockRenderer
```

com registry central.

Preview e portal público deverão usar os mesmos componentes de rendering para evitar divergência visual.

---

# 42. CONTEXTOS PERMITIDOS

## PAGE

Páginas poderão utilizar o catálogo completo compatível com Page Builder.

## ARTICLE

Artigos/notícias poderão utilizar:

```text
TEXT
IMAGE
IMAGE_TEXT
CAROUSEL
VIDEO
DOCUMENT
CTA
TABLE
```

Feeds dinâmicos não serão permitidos dentro de artigos.

Essa regra ficará em `allowedContexts`.

---

# 43. VALIDAÇÃO EM CAMADAS

A validação ocorrerá em:

```text
1. Editor UI
2. Zod
3. NestJS
```

A interface fornecerá feedback imediato.

Zod validará estrutura.

NestJS validará regras de negócio e autorização.

---

# 44. PUBLICAÇÃO

Fluxo:

```text
Page
↓
validar página
↓
validar ContentBlocks
↓
validar acessibilidade
↓
validar mídia
↓
validar links/referências
↓
gerar PageVersion
↓
publicar
↓
REINDEX_SEARCH
↓
INVALIDATE_CACHE
```

Se algum bloco estiver inválido, a publicação inteira falhará com mensagem específica.

Rascunhos poderão permanecer incompletos.

---

# 45. ACESSIBILIDADE

Imagem informativa:

```text
alt obrigatório
```

Imagem decorativa:

```text
alt=""
```

Se não houver alt contextual, poderá ser utilizado o alt padrão da Biblioteca de Mídia.

Se ambos estiverem ausentes em imagem informativa, a publicação será bloqueada.

---

# 46. MÍDIA

Blocos deverão referenciar:

```text
Media.id
```

Nunca usar URL física como referência primária.

Cada uso deverá alimentar:

```text
MediaUsage
```

Mídia em uso não poderá ser excluída.

---

# 47. BLOCOS DINÂMICOS

Feeds armazenam apenas configuração.

Exemplo:

```json
{
  "type": "NEWS_FEED",
  "data": {
    "institutionIds": ["uuid"],
    "limit": 6
  }
}
```

Os conteúdos são resolvidos em tempo de renderização.

---

# 48. ORDEM DOS FEEDS

Regra inicial:

```text
NEWS_FEED
→ publicação mais recente

EVENT_FEED
→ próximos eventos

COURSE_FEED
→ regra do módulo

CONTEST_FEED
→ regra da integração

SELECTION_PROCESS_FEED
→ regra da integração
```

Limite máximo inicial:

```text
12 itens
```

---

# 49. LIMITES V1

```text
CAROUSEL → 10
CARDS → 12
FAQ → 30
TABS → 8
STATISTICS → 12
FEEDS → 12
```

---

# 50. DESIGN SYSTEM

O Editor não controlará diretamente:

```text
font-family
font-size
line-height
margens
grid
breakpoints
cores arbitrárias
CSS
```

---

# 51. SEGURANÇA

Conteúdo rico deverá ser sanitizado.

Bloquear:

```text
script
javascript:
event handlers
iframe arbitrário
HTML inseguro
```

Vídeos serão limitados a URLs validadas de YouTube e Vimeo.

---

# 52. BUSCA E INDEXAÇÃO

Conteúdo textual relevante dos blocos poderá alimentar `REINDEX_SEARCH`.

Exemplos:

```text
TEXT
HERO
IMAGE_TEXT
CARDS
FAQ
TABS
TABLE
TIMELINE
CTA
```

Não indexar:

```text
background
position
schema_version
imageId
layout enum
```

---

# 53. CACHE

Após publicação ou alteração pública:

```text
INVALIDATE_CACHE
```

será disparado para as tags relacionadas.

---

# 54. HOME

A Home será construída pelo mesmo Page Builder.

Não haverá sistema paralelo específico para Home.

---

# 55. TEMPLATES

Page Templates poderão fornecer conjunto inicial de blocos.

Exemplos:

```text
Página institucional
Landing page
Página de serviço
```

---

# 56. DUPLICAÇÃO

Ao duplicar um bloco:

```text
novo id
mesmo type
mesmo schema_version
cópia de data
nova position
```

Mídias referenciadas poderão ser reutilizadas.

---

# 57. EXCLUSÃO

Excluir bloco remove o bloco atual.

PageVersions antigas continuarão preservando seu snapshot histórico.

---

# 58. REORDENAÇÃO

O backend deverá manter posições consistentes e sem duplicidade.

---

# 59. CONCORRÊNCIA

Alterações simultâneas utilizarão controle otimista por:

```text
version
```

ou:

```text
updated_at
```

Conflitos poderão retornar:

```text
409 CONFLICT
```

---

# 60. AUDITORIA

Eventos relevantes:

```text
BLOCK_CREATED
BLOCK_UPDATED
BLOCK_DUPLICATED
BLOCK_HIDDEN
BLOCK_SHOWN
BLOCK_DELETED
BLOCK_REORDERED
PAGE_PUBLISHED
```

---

# 61. OPENAPI

Endpoints conceituais:

```text
GET /api/v1/admin/pages/:id
POST /api/v1/admin/pages/:id/blocks
PATCH /api/v1/admin/pages/:id/blocks/:blockId
DELETE /api/v1/admin/pages/:id/blocks/:blockId
POST /api/v1/admin/pages/:id/blocks/reorder
POST /api/v1/admin/pages/:id/publish
GET /api/v1/admin/pages/:id/preview
```

---

# 62. ORGANIZAÇÃO DOS SCHEMAS

Sugestão:

```text
packages/validation/blocks/
├── common.ts
├── text.v1.ts
├── hero.v1.ts
├── image.v1.ts
├── image-text.v1.ts
├── carousel.v1.ts
├── cards.v1.ts
├── faq.v1.ts
└── ...
```

---

# 63. ORGANIZAÇÃO DOS RENDERERS

Sugestão:

```text
packages/ui/blocks/
```

ou estrutura equivalente dentro do monorepo.

---

# 64. ORGANIZAÇÃO DOS EDITORES

Sugestão:

```text
apps/web/components/page-builder/editors/
```

Cada bloco terá editor específico.

---

# 65. ARQUITETURA RESUMIDA

```text
                    EDITOR
                       │
                       ▼
                 Page Builder
                       │
                       ▼
                 ContentBlock
                       │
              ┌────────┴─────────┐
              │                  │
              ▼                  ▼
         Zod Schema         Block Editor
              │
              ▼
            NestJS
              │
              ▼
          PostgreSQL
              │
              ▼
             Page
              │
              ▼
          PageVersion
              │
              ▼
            Preview
              │
              ▼
      ContentBlockRenderer
              │
              ▼
        Portal Público
```

---

# 66. DECISÕES CONSOLIDADAS

Ficam definidas para Page Builder / Content Blocks V1:

```text
Page Builder por blocos
Sem grid livre
Sem CSS livre

ContentBlock unificado
owner_type PAGE | ARTICLE
data em JSONB
schema_version obrigatório

schema Zod por bloco
BlockRegistry central
Renderer central
Preview e público com mesmo renderer

Editor pode:
adicionar
editar
duplicar
ocultar
exibir
reordenar
excluir

Versionamento da página inteira
PageVersion com snapshot
Histórico visualizável

Fundos:
DEFAULT
LIGHT
INSTITUTION
IMAGE

CARDS somente com imagem
HERO somente com imagem
Sem vídeo de fundo no HERO

Margens controladas pelo Design System

Anchors por bloco
Anchor único por página

Blocos dinâmicos por consulta
Sem cópia dos dados nos feeds

MediaUsage obrigatório

Alt contextual com fallback de mídia
Publicação bloqueada se acessibilidade obrigatória faltar

ARTICLE com subconjunto de blocos

Limites de itens por bloco

REINDEX_SEARCH após publicação
INVALIDATE_CACHE após publicação

AuditLog
Controle otimista de concorrência
```

---

# 67. STATUS

Com este documento, a camada de **Page Builder e Content Blocks da Arquitetura Técnica V1** é considerada definida.

As decisões deverão orientar posteriormente:

- schema Drizzle;
- migrations;
- schemas Zod;
- BlockRegistry;
- editores de bloco;
- renderers;
- preview;
- versionamento;
- PageVersion;
- regras de publicação;
- integração com mídia;
- integração com busca;
- cache;
- OpenAPI;
- AuditLog;
- testes funcionais;
- testes de acessibilidade;
- testes de compatibilidade entre versões de schema.
