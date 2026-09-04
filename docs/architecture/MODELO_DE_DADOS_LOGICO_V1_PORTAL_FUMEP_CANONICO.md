# MODELO DE DADOS LÓGICO V1 — PORTAL FUMEP

## STATUS CANÔNICO

Esta versão incorpora as correções da auditoria de arquitetura e é a referência canônica do Modelo de Dados Lógico V1.

Principais consolidações:

- `Page` pertence a uma única `Institution`;
- `ArticleVersion` permanece na V1;
- `PageTemplate` permanece na V1;
- Galerias permanecem na V1;
- analytics de navegação será realizado pelo Matomo, sem `analytics_events` paralelo;
- BullMQ + Worker separado fazem parte da V1;
- decisões de stack antes pendentes foram consolidadas.

---

## 1. OBJETIVO

Este documento transforma o Modelo de Domínio V1 do Portal FUMEP em um **Modelo de Dados Lógico**, definindo:

- tabelas;
- campos;
- tipos de dados;
- chaves primárias;
- chaves estrangeiras;
- campos obrigatórios e opcionais;
- restrições de unicidade;
- índices;
- relacionamentos;
- regras de exclusão;
- regras de publicação;
- versionamento;
- rastreamento de mídia;
- busca;
- analytics;
- integrações externas.

O modelo é destinado à implementação em **PostgreSQL com Drizzle ORM**, dentro da arquitetura V1 consolidada. A modelagem lógica continua separando regras de dados das particularidades de código do Next.js e NestJS.

---

# 2. CONVENÇÕES GERAIS

## 2.1 Chaves primárias

Todas as entidades principais utilizarão:

```text
id UUID PRIMARY KEY
```

Vantagens:

- não expõe sequência interna;
- adequado para APIs;
- facilita integrações;
- permite geração distribuída;
- reduz dependência de IDs sequenciais.

---

## 2.2 Datas

Padrão:

```text
TIMESTAMPTZ
```

para registros com data e hora.

Exemplo:

```text
created_at
updated_at
published_at
```

Para datas sem horário:

```text
DATE
```

Para horários independentes de data:

```text
TIME
```

---

## 2.3 Nomenclatura

Banco:

```text
snake_case
```

Exemplo:

```text
institution_id
created_at
cover_image_id
```

Código da aplicação poderá usar camelCase conforme a linguagem escolhida.

---

## 2.4 Campos padrão

Entidades editáveis normalmente terão:

```text
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

Quando necessário:

```text
created_by UUID
updated_by UUID
published_by UUID
```

---

# 3. ENUMS LÓGICOS

Os enums podem posteriormente ser implementados como:

- ENUM PostgreSQL;
- VARCHAR + CHECK;
- tabela de domínio.

Inicialmente consideraremos os seguintes.

---

## user_role

```text
ADMIN
EDITOR
```

---

## publication_status

```text
DRAFT
SCHEDULED
PUBLISHED
EXPIRED
```

---

## course_status

```text
ACTIVE
TEMPORARILY_UNAVAILABLE
CLOSED
```

---

## media_type

```text
IMAGE
DOCUMENT
VIDEO
OTHER
```

---

## menu_location

```text
HEADER
FOOTER
```

---

## menu_item_type

```text
PAGE
INTERNAL_URL
EXTERNAL_URL
```

---

## external_system_type

```text
SELECTION_PROCESS
CONTEST
```

---

## block_owner_type

```text
PAGE
ARTICLE
```

---

# 4. INSTITUIÇÕES

## 4.1 institutions

Representa FUMEP, ETMSL e CRAMAM.

```text
institutions
------------
id                  UUID PK
name                VARCHAR(150) NOT NULL
short_name          VARCHAR(50) NOT NULL
slug                VARCHAR(100) NOT NULL UNIQUE
description         TEXT NULL

logo_light_id       UUID NULL FK -> media.id
logo_dark_id        UUID NULL FK -> media.id

primary_color       VARCHAR(20) NULL
secondary_color     VARCHAR(20) NULL
accent_color        VARCHAR(20) NULL

is_main             BOOLEAN NOT NULL DEFAULT FALSE
is_active           BOOLEAN NOT NULL DEFAULT TRUE

created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

### Regras

- apenas uma instituição deverá possuir `is_main = TRUE`;
- inicialmente FUMEP será a principal;
- `slug` deverá ser único.

Exemplos:

```text
fumep
etmsl
cramam
```

### Índices

```text
UNIQUE(slug)
INDEX(is_active)
INDEX(is_main)
```

### Exclusão

Instituições com conteúdo associado **não poderão ser excluídas**.

Preferencialmente serão apenas desativadas:

```text
is_active = FALSE
```

---

# 5. CONFIGURAÇÕES DE INSTITUIÇÃO

## 5.1 institution_settings

```text
institution_settings
--------------------
institution_id          UUID PK FK -> institutions.id

contact_email           VARCHAR(255) NULL
phone                   VARCHAR(50) NULL
address                  TEXT NULL

social_links             JSONB NULL

default_seo_title        VARCHAR(255) NULL
default_seo_description  TEXT NULL

created_at               TIMESTAMPTZ NOT NULL
updated_at               TIMESTAMPTZ NOT NULL
```

### Relação

```text
Institution 1 : 1 InstitutionSetting
```

### Exclusão

```text
ON DELETE CASCADE
```

---

# 6. USUÁRIOS

## 6.1 users

```text
users
-----
id                  UUID PK
name                VARCHAR(150) NOT NULL
email               VARCHAR(255) NOT NULL
password_hash       TEXT NOT NULL

role                user_role NOT NULL

is_active           BOOLEAN NOT NULL DEFAULT TRUE

last_login_at       TIMESTAMPTZ NULL

created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

### Restrições

```text
UNIQUE(LOWER(email))
```

### Índices

```text
INDEX(role)
INDEX(is_active)
```

### Exclusão

Usuários que já realizaram operações **não devem ser apagados fisicamente**.

Usar:

```text
is_active = FALSE
```

---

# 7. PERMISSÃO POR INSTITUIÇÃO

## 7.1 user_institutions

```text
user_institutions
-----------------
user_id             UUID FK -> users.id
institution_id      UUID FK -> institutions.id

created_at          TIMESTAMPTZ NOT NULL

PRIMARY KEY(user_id, institution_id)
```

### Relação

```text
User N : N Institution
```

### Regra

- `ADMIN` possui acesso global;
- `EDITOR` depende dos registros desta tabela.

### Exclusão

```text
user_id        ON DELETE CASCADE
institution_id ON DELETE RESTRICT
```

---

# 8. BIBLIOTECA DE MÍDIA

## 8.1 media_categories

```text
media_categories
----------------
id                  UUID PK
institution_id      UUID NULL FK -> institutions.id

name                VARCHAR(120) NOT NULL
slug                VARCHAR(120) NOT NULL

created_by          UUID NULL FK -> users.id
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

### Unicidade

```text
UNIQUE(institution_id, slug)
```

Categorias sem instituição são globais.

---

## 8.2 media

```text
media
-----
id                  UUID PK

type                media_type NOT NULL

original_filename   VARCHAR(255) NOT NULL
stored_filename     VARCHAR(255) NOT NULL

mime_type           VARCHAR(150) NOT NULL
size_bytes          BIGINT NOT NULL

width               INTEGER NULL
height              INTEGER NULL

alt_text            TEXT NULL
caption             TEXT NULL

is_decorative       BOOLEAN NOT NULL DEFAULT FALSE

category_id         UUID NULL FK -> media_categories.id

uploaded_by         UUID NULL FK -> users.id

created_at          TIMESTAMPTZ NOT NULL
```

### Regras de acessibilidade

Para imagens:

```text
is_decorative = FALSE
→ alt_text obrigatório na utilização pública
```

Se:

```text
is_decorative = TRUE
```

o frontend utilizará:

```html
alt=""
```

A validação pode ocorrer na camada de aplicação, pois documentos e vídeos não exigem `alt_text`.

### Índices

```text
INDEX(type)
INDEX(category_id)
INDEX(uploaded_by)
INDEX(created_at)
```

---

# 9. VARIANTES DE MÍDIA

## 9.1 media_variants

```text
media_variants
--------------
id              UUID PK
media_id         UUID NOT NULL FK -> media.id

format           VARCHAR(20) NOT NULL
width            INTEGER NULL
height           INTEGER NULL

size_bytes       BIGINT NOT NULL
storage_path     TEXT NOT NULL

created_at       TIMESTAMPTZ NOT NULL
```

Exemplos:

```text
WEBP / 640
WEBP / 1280
AVIF / 640
AVIF / 1280
```

### Unicidade recomendada

```text
UNIQUE(media_id, format, width)
```

### Exclusão

```text
ON DELETE CASCADE
```

---

# 10. USO DE MÍDIA

## 10.1 media_usages

Tabela de rastreamento para impedir exclusão de arquivos em uso.

```text
media_usages
------------
id              UUID PK

media_id         UUID NOT NULL FK -> media.id

entity_type      VARCHAR(50) NOT NULL
entity_id        UUID NOT NULL

field_name       VARCHAR(100) NOT NULL

created_at       TIMESTAMPTZ NOT NULL
```

Exemplo:

```text
media_id    = X
entity_type = COURSE
entity_id   = Y
field_name  = cover_image
```

### Índices

```text
INDEX(media_id)
INDEX(entity_type, entity_id)
```

### Regra de exclusão

Se existir pelo menos um `media_usage`:

```text
DELETE media
→ BLOQUEADO
```

---

# 11. PÁGINAS

## 11.0 Regra institucional das páginas

Na V1:

```text
Page
N:1
Institution
```

Uma página pertence a exatamente uma instituição por `institution_id`.

Não será criada tabela `page_institutions`.

Conteúdos realmente multi-institucionais, como `Article` e `Event`, utilizarão relações N:N próprias.

---


## 11.1 pages

```text
pages
-----
id                  UUID PK

institution_id      UUID NOT NULL FK -> institutions.id

title               VARCHAR(255) NOT NULL
slug                VARCHAR(200) NOT NULL

description         TEXT NULL

status              publication_status NOT NULL DEFAULT DRAFT

is_home             BOOLEAN NOT NULL DEFAULT FALSE

seo_title           VARCHAR(255) NULL
seo_description     TEXT NULL
seo_image_id        UUID NULL FK -> media.id

published_at        TIMESTAMPTZ NULL
scheduled_at        TIMESTAMPTZ NULL
expires_at          TIMESTAMPTZ NULL

created_by          UUID NULL FK -> users.id
updated_by          UUID NULL FK -> users.id
published_by        UUID NULL FK -> users.id

created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

### Unicidade

```text
UNIQUE(institution_id, slug)
```

### Regra de Home

Apenas uma página por instituição poderá ser:

```text
is_home = TRUE
```

Usar índice único parcial.

### Índices

```text
INDEX(institution_id)
INDEX(status)
INDEX(published_at)
INDEX(scheduled_at)
INDEX(expires_at)
```

### Exclusão

Página poderá ser excluída permanentemente.

Antes disso:

- verificar referências em menus;
- verificar links internos conhecidos;
- registrar AuditLog.

---

# 12. CONTEÚDO EM BLOCOS

Foi adotada como modelo lógico V1 uma estrutura unificada para páginas e artigos.

## 12.1 content_blocks

```text
content_blocks
--------------
id                  UUID PK

owner_type          block_owner_type NOT NULL
owner_id            UUID NOT NULL

block_type          VARCHAR(50) NOT NULL

position            INTEGER NOT NULL

anchor              VARCHAR(100) NULL
is_visible          BOOLEAN NOT NULL DEFAULT TRUE

background_style    VARCHAR(50) NULL

configuration       JSONB NOT NULL

created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

### Exemplos de `block_type`

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

### Por que JSONB

Cada bloco possui estrutura diferente.

Exemplo Hero:

```json
{
  "title": "ETMSL",
  "description": "Educação profissional...",
  "imageId": "...",
  "imageAlt": "...",
  "buttonLabel": "Conheça",
  "buttonUrl": "/etmsl"
}
```

### Índices

```text
INDEX(owner_type, owner_id)
INDEX(owner_type, owner_id, position)
```

### Âncora

Quando preenchida:

```text
UNIQUE(owner_type, owner_id, anchor)
```

---

# 13. VERSÕES DE PÁGINA

## 13.1 page_versions

```text
page_versions
-------------
id                  UUID PK
page_id             UUID NOT NULL FK -> pages.id

version_number      INTEGER NOT NULL

snapshot            JSONB NOT NULL

created_by          UUID NULL FK -> users.id
created_at          TIMESTAMPTZ NOT NULL
```

### Unicidade

```text
UNIQUE(page_id, version_number)
```

### Snapshot

Deve armazenar:

- campos da página;
- configuração dos blocos;
- ordem dos blocos.

### Exclusão

```text
page ON DELETE CASCADE
```

---

# 14. MODELOS DE PÁGINA

## 14.0 Decisão V1

`PageTemplate` permanece no escopo da V1.

Criar uma página a partir de um template deverá copiar o snapshot dos blocos e gerar novos identificadores,
sem manter vínculo mutável entre a página criada e o template original.

---


## 14.1 page_templates

```text
page_templates
--------------
id                  UUID PK

institution_id      UUID NULL FK -> institutions.id

name                VARCHAR(150) NOT NULL
description         TEXT NULL

blocks_snapshot     JSONB NOT NULL

is_active           BOOLEAN NOT NULL DEFAULT TRUE

created_by          UUID NULL FK -> users.id

created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

Instituição nula:

```text
modelo global
```

---

# 15. ARTIGOS / NOTÍCIAS

## 15.1 articles

```text
articles
--------
id                  UUID PK

title               VARCHAR(255) NOT NULL
slug                VARCHAR(220) NOT NULL

subtitle            VARCHAR(255) NULL
summary             TEXT NULL

cover_image_id      UUID NULL FK -> media.id
cover_image_alt     TEXT NULL

public_author       VARCHAR(150) NULL

status              publication_status NOT NULL DEFAULT DRAFT

is_featured         BOOLEAN NOT NULL DEFAULT FALSE

published_at        TIMESTAMPTZ NULL
scheduled_at        TIMESTAMPTZ NULL
expires_at          TIMESTAMPTZ NULL

seo_title           VARCHAR(255) NULL
seo_description     TEXT NULL

created_by          UUID NULL FK -> users.id
updated_by          UUID NULL FK -> users.id
published_by        UUID NULL FK -> users.id

created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

### Conteúdo

O corpo será armazenado em:

```text
content_blocks
owner_type = ARTICLE
```

### Regra da imagem de capa

Para publicação pública:

```text
cover_image_id obrigatório
cover_image_alt obrigatório
```

A aplicação poderá permitir rascunho incompleto.

### Slug

Como artigo pode pertencer a várias instituições, o slug deverá ser globalmente único:

```text
UNIQUE(slug)
```

---

# 16. ARTIGO × INSTITUIÇÃO

## 16.1 article_institutions

```text
article_institutions
--------------------
article_id          UUID FK -> articles.id
institution_id      UUID FK -> institutions.id

PRIMARY KEY(article_id, institution_id)
```

### Exclusão

```text
article      ON DELETE CASCADE
institution  ON DELETE RESTRICT
```

---

# 17. VERSÕES DE ARTIGO

## 17.0 Decisão V1

`ArticleVersion` permanece na V1.

Assim como páginas, artigos publicados deverão possuir snapshots versionados para consulta histórica.
A restauração automática de uma versão antiga não é requisito obrigatório da V1, mas o snapshot deve ser preservado.

---


## 17.1 article_versions

```text
article_versions
----------------
id                  UUID PK
article_id          UUID NOT NULL FK -> articles.id

version_number      INTEGER NOT NULL
snapshot            JSONB NOT NULL

created_by          UUID NULL FK -> users.id
created_at          TIMESTAMPTZ NOT NULL
```

### Unicidade

```text
UNIQUE(article_id, version_number)
```

---

# 18. CATEGORIAS

## 18.1 categories

```text
categories
----------
id                  UUID PK

institution_id      UUID NULL FK -> institutions.id

name                VARCHAR(120) NOT NULL
slug                VARCHAR(120) NOT NULL

description         TEXT NULL

created_by          UUID NULL FK -> users.id

created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

### Unicidade

```text
UNIQUE(institution_id, slug)
```

---

# 19. TAGS

## 19.1 tags

```text
tags
----
id              UUID PK
name            VARCHAR(100) NOT NULL
slug            VARCHAR(100) NOT NULL UNIQUE

created_by      UUID NULL FK -> users.id
created_at      TIMESTAMPTZ NOT NULL
```

Tags são globais.

---

# 20. ARTIGO × CATEGORIA

## 20.1 article_categories

```text
article_categories
------------------
article_id      UUID FK -> articles.id
category_id     UUID FK -> categories.id

PRIMARY KEY(article_id, category_id)
```

---

# 21. ARTIGO × TAG

## 21.1 article_tags

```text
article_tags
------------
article_id      UUID FK -> articles.id
tag_id          UUID FK -> tags.id

PRIMARY KEY(article_id, tag_id)
```

---

# 22. CURSOS

## 22.1 courses

```text
courses
-------
id                      UUID PK

institution_id          UUID NOT NULL FK -> institutions.id

name                    VARCHAR(180) NOT NULL
slug                    VARCHAR(180) NOT NULL

short_description       TEXT NOT NULL
full_description        TEXT NOT NULL

requirements            TEXT NULL
professional_profile    TEXT NULL
job_market              TEXT NULL
coordinator             VARCHAR(180) NULL

status                  course_status NOT NULL DEFAULT ACTIVE

cover_image_id          UUID NULL FK -> media.id
cover_image_alt         TEXT NULL

created_by              UUID NULL FK -> users.id
updated_by              UUID NULL FK -> users.id

created_at              TIMESTAMPTZ NOT NULL
updated_at              TIMESTAMPTZ NOT NULL
```

### Unicidade

```text
UNIQUE(institution_id, slug)
```

### Regra pública

```text
status = CLOSED
→ não aparece no portal público
```

---

# 23. OFERTAS DE CURSO

## 23.1 course_offerings

```text
course_offerings
----------------
id                  UUID PK

course_id           UUID NOT NULL FK -> courses.id

modality            VARCHAR(100) NOT NULL
shift               VARCHAR(100) NOT NULL

duration            VARCHAR(100) NOT NULL
workload_hours      INTEGER NOT NULL

is_active           BOOLEAN NOT NULL DEFAULT TRUE

created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

### Exemplo

```text
Presencial
Noturno
18 meses
1200 horas
```

### Índices

```text
INDEX(course_id)
INDEX(is_active)
```

### Exclusão

```text
course ON DELETE CASCADE
```

---

# 24. MATRIZES CURRICULARES

## 24.1 course_curricula

```text
course_curricula
----------------
id                  UUID PK

course_id           UUID NOT NULL FK -> courses.id
media_id            UUID NOT NULL FK -> media.id

title               VARCHAR(180) NOT NULL

valid_from          DATE NULL
valid_until         DATE NULL

created_at          TIMESTAMPTZ NOT NULL
```

### Regra

Arquivo deverá ser documento/PDF.

### Exclusão

```text
course ON DELETE CASCADE
media  ON DELETE RESTRICT
```

---

# 25. IMAGENS DE CURSO

## 25.1 course_images

```text
course_images
-------------
id              UUID PK

course_id       UUID NOT NULL FK -> courses.id
media_id        UUID NOT NULL FK -> media.id

alt_text        TEXT NOT NULL

position        INTEGER NOT NULL

created_at      TIMESTAMPTZ NOT NULL
```

### Unicidade

```text
UNIQUE(course_id, media_id)
```

---

# 26. DOCUMENTOS DE CURSO

## 26.1 course_documents

```text
course_documents
----------------
id              UUID PK

course_id       UUID NOT NULL FK -> courses.id
media_id        UUID NOT NULL FK -> media.id

title           VARCHAR(180) NOT NULL
description     TEXT NULL

position        INTEGER NOT NULL

created_at      TIMESTAMPTZ NOT NULL
```

---

# 27. EVENTOS

## 27.1 events

```text
events
------
id                          UUID PK

title                       VARCHAR(255) NOT NULL
slug                        VARCHAR(220) NOT NULL UNIQUE

short_description           TEXT NULL
full_description            TEXT NULL

cover_image_id              UUID NULL FK -> media.id
cover_image_alt             TEXT NULL

address                     TEXT NULL
latitude                    NUMERIC(9,6) NULL
longitude                   NUMERIC(9,6) NULL

external_registration_url   TEXT NULL

status                      publication_status NOT NULL DEFAULT DRAFT

starts_at                   TIMESTAMPTZ NOT NULL
ends_at                     TIMESTAMPTZ NOT NULL

published_at                TIMESTAMPTZ NULL
scheduled_at                TIMESTAMPTZ NULL
expires_at                  TIMESTAMPTZ NULL

created_by                  UUID NULL FK -> users.id
updated_by                  UUID NULL FK -> users.id
published_by                UUID NULL FK -> users.id

created_at                  TIMESTAMPTZ NOT NULL
updated_at                  TIMESTAMPTZ NOT NULL
```

### Constraint

```text
ends_at >= starts_at
```

### Evento encerrado

Continua armazenado, mas deixa automaticamente de aparecer em:

```text
Próximos eventos
```

---

# 28. EVENTO × INSTITUIÇÃO

## 28.1 event_institutions

```text
event_institutions
------------------
event_id            UUID FK -> events.id
institution_id      UUID FK -> institutions.id

PRIMARY KEY(event_id, institution_id)
```

---

# 29. PROGRAMAÇÃO DE EVENTOS

## 29.1 event_schedules

```text
event_schedules
---------------
id              UUID PK

event_id         UUID NOT NULL FK -> events.id

title            VARCHAR(255) NOT NULL
description      TEXT NULL

event_date       DATE NOT NULL

start_time       TIME NOT NULL
end_time         TIME NULL

location         VARCHAR(255) NULL

position         INTEGER NOT NULL

created_at       TIMESTAMPTZ NOT NULL
updated_at       TIMESTAMPTZ NOT NULL
```

### Constraint

Quando `end_time` existir:

```text
end_time >= start_time
```

---

# 30. EVENTO × CATEGORIA

## 30.1 event_categories

```text
event_categories
----------------
event_id         UUID FK -> events.id
category_id      UUID FK -> categories.id

PRIMARY KEY(event_id, category_id)
```

---

# 31. GALERIAS

## 31.0 Decisão V1

Galerias permanecem no escopo da V1 e serão compostas por `Gallery` + `GalleryItem`,
com rastreamento de uso das mídias correspondentes.

---


## 31.1 galleries

```text
galleries
---------
id                  UUID PK

institution_id      UUID NULL FK -> institutions.id

title               VARCHAR(180) NOT NULL
description         TEXT NULL

created_by          UUID NULL FK -> users.id

created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

---

# 32. ITENS DA GALERIA

## 32.1 gallery_items

```text
gallery_items
-------------
id              UUID PK

gallery_id      UUID NOT NULL FK -> galleries.id
media_id        UUID NOT NULL FK -> media.id

caption         TEXT NULL
alt_text        TEXT NOT NULL

position        INTEGER NOT NULL

created_at      TIMESTAMPTZ NOT NULL
```

### Exclusão

```text
gallery ON DELETE CASCADE
media   ON DELETE RESTRICT
```

---

# 33. ÁREA DE ESTÁGIO

## 33.1 internship_areas

```text
internship_areas
----------------
id                  UUID PK

institution_id      UUID NOT NULL FK -> institutions.id

title               VARCHAR(180) NOT NULL
description         TEXT NULL

created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

Inicialmente deverá existir uma área vinculada à ETMSL.

---

# 34. CATEGORIAS DE ESTÁGIO

## 34.1 internship_categories

```text
internship_categories
---------------------
id                  UUID PK

internship_area_id  UUID NOT NULL FK -> internship_areas.id

name                VARCHAR(150) NOT NULL
description         TEXT NULL

position            INTEGER NOT NULL

created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

---

# 35. DOCUMENTOS DE ESTÁGIO

## 35.1 internship_documents

```text
internship_documents
--------------------
id                  UUID PK

category_id         UUID NOT NULL FK -> internship_categories.id

course_id           UUID NULL FK -> courses.id
media_id            UUID NOT NULL FK -> media.id

title               VARCHAR(180) NOT NULL
description         TEXT NULL

position            INTEGER NOT NULL

created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

`course_id = NULL`:

```text
documento geral
```

`course_id preenchido`:

```text
documento específico daquele curso
```

---

# 36. MENUS

## 36.1 menus

```text
menus
-----
id                  UUID PK

institution_id      UUID NOT NULL FK -> institutions.id

name                VARCHAR(100) NOT NULL
location            menu_location NOT NULL

created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

### Unicidade

```text
UNIQUE(institution_id, location)
```

---

# 37. ITENS DE MENU

## 37.1 menu_items

```text
menu_items
----------
id                  UUID PK

menu_id             UUID NOT NULL FK -> menus.id
parent_id           UUID NULL FK -> menu_items.id

label               VARCHAR(120) NOT NULL

type                menu_item_type NOT NULL

page_id             UUID NULL FK -> pages.id
url                 TEXT NULL

position            INTEGER NOT NULL

is_visible          BOOLEAN NOT NULL DEFAULT TRUE
open_in_new_tab     BOOLEAN NOT NULL DEFAULT FALSE

created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

### Regras

Se:

```text
type = PAGE
```

deve existir:

```text
page_id
```

Se:

```text
type = INTERNAL_URL
ou
EXTERNAL_URL
```

deve existir:

```text
url
```

### Profundidade

Máximo:

```text
2 níveis
```

A validação será feita na aplicação.

---

# 38. REDIRECIONAMENTOS

## 38.1 redirects

```text
redirects
---------
id              UUID PK

source_path      TEXT NOT NULL UNIQUE
target_path      TEXT NOT NULL

status_code      SMALLINT NOT NULL DEFAULT 301

created_at       TIMESTAMPTZ NOT NULL
```

### Constraint

```text
status_code IN (301, 302, 307, 308)
```

Normalmente:

```text
301
```

---

# 39. BUSCA — ÍNDICE LÓGICO

## 39.1 search_documents

Pode ser tabela materializada, índice externo ou estrutura derivada.

```text
search_documents
----------------
id                  UUID PK

entity_type         VARCHAR(50) NOT NULL
entity_id           UUID NOT NULL

title               TEXT NOT NULL
content             TEXT NULL
keywords            TEXT NULL

url                 TEXT NOT NULL

published_at        TIMESTAMPTZ NULL
updated_at          TIMESTAMPTZ NOT NULL
```

### Índices

Na implementação PostgreSQL:

```text
GIN full-text search
```

Também será considerada busca fuzzy.

---

# 40. BUSCA × INSTITUIÇÃO

## 40.1 search_document_institutions

```text
search_document_institutions
----------------------------
search_document_id      UUID FK -> search_documents.id
institution_id          UUID FK -> institutions.id

PRIMARY KEY(search_document_id, institution_id)
```

---

# 41. LOG DE BUSCAS

## 41.1 search_query_logs

```text
search_query_logs
-----------------
id                  UUID PK

query               TEXT NOT NULL

results_count       INTEGER NOT NULL

institution_id      UUID NULL FK -> institutions.id
entity_type         VARCHAR(50) NULL

created_at          TIMESTAMPTZ NOT NULL
```

### Objetivo

Permitir descobrir:

- buscas frequentes;
- buscas sem resultados;
- interesse dos visitantes.

---

# 42. ANALYTICS E TELEMETRIA

A decisão arquitetural final da V1 é:

```text
Matomo
→ fonte de verdade para analytics de navegação pública

PostgreSQL
→ busca, auditoria e dados operacionais
```

Não será criada na V1 uma tabela paralela `analytics_events` para registrar page views, downloads,
cliques externos ou visualizações de entidades.

O PostgreSQL continuará armazenando:

```text
search_query_logs
audit_logs
metadados operacionais de jobs/sincronizações quando aplicável
```

A Dashboard administrativa consumirá:

```text
MatomoAdapter
+
SearchAnalyticsRepository
```

através de uma abstração `AnalyticsService`.

Essa decisão evita duplicação de telemetria de navegação e mantém o Matomo como fonte única para esse tipo de métrica.

---

# 43. SISTEMAS EXTERNOS

## 43.1 external_systems

```text
external_systems
----------------
id                  UUID PK

name                VARCHAR(150) NOT NULL
type                external_system_type NOT NULL

base_url            TEXT NULL

is_active           BOOLEAN NOT NULL DEFAULT TRUE

configuration       JSONB NULL

created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

---

# 44. PROCESSOS SELETIVOS — CACHE/INTEGRAÇÃO

## 44.1 selection_processes

Tabela opcional para cache dos dados externos.

```text
selection_processes
-------------------
id                      UUID PK

external_system_id      UUID NOT NULL FK -> external_systems.id
external_id             VARCHAR(255) NOT NULL

institution_id          UUID NOT NULL FK -> institutions.id

title                   VARCHAR(255) NOT NULL
number                  VARCHAR(50) NULL
year                    INTEGER NULL

status                  VARCHAR(100) NOT NULL

registration_start      TIMESTAMPTZ NULL
registration_end        TIMESTAMPTZ NULL

external_url            TEXT NOT NULL

synced_at               TIMESTAMPTZ NOT NULL
```

### Unicidade

```text
UNIQUE(external_system_id, external_id)
```

---

# 45. CONCURSOS — CACHE/INTEGRAÇÃO

## 45.1 contests

```text
contests
--------
id                      UUID PK

external_system_id      UUID NOT NULL FK -> external_systems.id
external_id             VARCHAR(255) NOT NULL

institution_id          UUID NOT NULL FK -> institutions.id

title                   VARCHAR(255) NOT NULL
number                  VARCHAR(50) NULL
year                    INTEGER NULL

status                  VARCHAR(100) NOT NULL

start_date              DATE NULL
end_date                DATE NULL

external_url            TEXT NOT NULL

synced_at               TIMESTAMPTZ NOT NULL
```

### Unicidade

```text
UNIQUE(external_system_id, external_id)
```

---

# 46. CONFIGURAÇÕES GLOBAIS

## 46.1 site_settings

Para configurações simples.

```text
site_settings
-------------
key             VARCHAR(120) PK
value           JSONB NOT NULL

updated_by      UUID NULL FK -> users.id
updated_at      TIMESTAMPTZ NOT NULL
```

Exemplos:

```text
dark_mode_enabled
vlibras_enabled
default_seo_image
analytics_enabled
```

---

# 47. AUDITORIA

## 47.1 audit_logs

```text
audit_logs
----------
id              UUID PK

user_id          UUID NULL FK -> users.id

action           VARCHAR(100) NOT NULL

entity_type      VARCHAR(50) NOT NULL
entity_id        UUID NULL

metadata         JSONB NULL

ip_address       INET NULL

created_at       TIMESTAMPTZ NOT NULL
```

Exemplos:

```text
PAGE_CREATED
PAGE_UPDATED
PAGE_DELETED

ARTICLE_CREATED
ARTICLE_PUBLISHED
ARTICLE_DELETED

COURSE_UPDATED

MEDIA_UPLOADED
MEDIA_DELETE_BLOCKED
MEDIA_DELETED

MENU_UPDATED

USER_CREATED
USER_DISABLED
```

### Regra

AuditLog:

```text
NUNCA deve ser apagado por cascade
```

Se o usuário for desativado:

```text
user_id permanece
```

Se houver exclusão física excepcional:

```text
user_id pode ficar NULL
```

---

# 48. RELACIONAMENTOS PRINCIPAIS

```text
INSTITUTION
│
├── 1:N PAGE
├── N:N USER
├── N:N ARTICLE
├── 1:N COURSE
├── N:N EVENT
├── 1:N GALLERY
├── 1:N MEDIA_CATEGORY
├── 1:N INTERNSHIP_AREA
├── 1:N MENU
├── 1:1 INSTITUTION_SETTING
├── 1:N SELECTION_PROCESS
└── 1:N CONTEST
```

---

```text
PAGE
├── 1:N CONTENT_BLOCK
├── 1:N PAGE_VERSION
└── N:1 INSTITUTION
```

---

```text
ARTICLE
├── 1:N CONTENT_BLOCK
├── N:N INSTITUTION
├── N:N CATEGORY
├── N:N TAG
└── 1:N ARTICLE_VERSION
```

---

```text
COURSE
├── 1:N COURSE_OFFERING
├── 1:N COURSE_CURRICULUM
├── 1:N COURSE_IMAGE
├── 1:N COURSE_DOCUMENT
└── N:1 INSTITUTION
```

---

```text
EVENT
├── N:N INSTITUTION
├── N:N CATEGORY
└── 1:N EVENT_SCHEDULE
```

---

```text
MEDIA
├── 1:N MEDIA_VARIANT
├── 1:N MEDIA_USAGE
├── N:1 MEDIA_CATEGORY
├── N:M COURSE
├── N:M GALLERY
└── referências em páginas/artigos/eventos
```

---

# 49. REGRAS DE EXCLUSÃO

## RESTRICT

Bloquear exclusão quando a entidade ainda estiver em uso:

```text
Institution
Media
Category em uso
Page referenciada por menu
```

---

## CASCADE

Usar quando o registro filho não possui sentido sem o pai:

```text
Page
→ PageVersion

Course
→ CourseOffering

Course
→ CourseImage

Gallery
→ GalleryItem

Event
→ EventSchedule

InternshipArea
→ InternshipCategory
```

---

## SET NULL

Usar principalmente para históricos:

```text
created_by
updated_by
published_by
uploaded_by
```

Caso um usuário precise ser fisicamente removido excepcionalmente.

---

# 50. REGRAS DE PUBLICAÇÃO

Conteúdos publicáveis terão:

```text
status
published_at
scheduled_at
expires_at
published_by
```

### Publicação imediata

```text
status = PUBLISHED
published_at = NOW()
```

---

### Agendamento

```text
status = SCHEDULED
scheduled_at > NOW()
```

Quando chegar o horário:

```text
status → PUBLISHED
published_at → scheduled_at
```

---

### Expiração

Quando:

```text
expires_at <= NOW()
```

o sistema altera:

```text
status → EXPIRED
```

---

# 51. REGRAS DE CONTEÚDO POR PAPEL

## Administrador

Pode:

- criar páginas;
- editar qualquer página;
- criar usuários;
- definir instituições dos Editores;
- alterar menus;
- configurar instituições;
- gerenciar modelos;
- alterar qualquer conteúdo.

---

## Editor

Pode, dentro das instituições autorizadas:

- editar páginas;
- adicionar blocos;
- excluir blocos;
- duplicar blocos;
- ocultar blocos;
- reordenar blocos;
- publicar conteúdo;
- criar notícias;
- excluir notícias;
- gerenciar cursos;
- gerenciar eventos;
- gerenciar estágio;
- gerenciar galerias;
- gerenciar mídia;
- criar categorias;
- criar tags.

---

# 52. PAGE BUILDER — REGRAS DE DADOS

Cada bloco possui obrigatoriamente:

```text
block_type
position
configuration
```

Opcionalmente:

```text
anchor
background_style
```

---

## Ações

```text
Mover
Duplicar
Ocultar
Excluir
Editar
```

---

## Margens

Não serão configuráveis por bloco.

O Design System controlará o espaçamento.

---

## Fundos permitidos

```text
DEFAULT
LIGHT
INSTITUTION
IMAGE
```

---

# 53. BLOCOS V1

## Conteúdo

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
CTA
SPACER
```

---

## Dinâmicos

```text
NEWS_FEED
EVENT_FEED
COURSE_FEED
CONTEST_FEED
SELECTION_PROCESS_FEED
GALLERY_FEED
```

---

# 54. ARTIGOS — BLOCOS PERMITIDOS

Notícias poderão utilizar:

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

Não poderão utilizar inicialmente:

```text
NEWS_FEED
COURSE_FEED
EVENT_FEED
CONTEST_FEED
SELECTION_PROCESS_FEED
```

---

# 55. ACESSIBILIDADE — REGRAS DE DADOS

Para qualquer imagem informativa:

```text
alt_text obrigatório
```

Para imagem decorativa:

```text
is_decorative = TRUE
alt=""
```

---

O sistema deverá impedir publicação quando uma imagem obrigatoriamente acessível não possuir descrição.

---

# 56. SKIP LINK

É requisito técnico do frontend, não tabela de banco.

Estrutura:

```html
<a href="#main-content" class="skip-link">
    Ir para o conteúdo principal
</a>

<main id="main-content">
    ...
</main>
```

Comportamento:

```text
normal → invisível

TAB/focus → visível

ENTER → foco/conteúdo principal
```

---

# 57. BUSCA

A busca deverá indexar:

```text
Pages
Articles
Courses
Events
Documents
Contests
Selection Processes
```

Filtros:

```text
Todos
FUMEP
ETMSL
CRAMAM
```

e:

```text
Páginas
Notícias
Cursos
Eventos
Concursos
Processos Seletivos
```

Também deverá permitir:

- período;
- busca sem acentos;
- tolerância a pequenos erros;
- sugestões instantâneas.

---

# 58. ÍNDICES IMPORTANTES

Além das PKs e FKs:

```text
pages(institution_id, status)
pages(institution_id, slug)

articles(status, published_at)
articles(slug)

courses(institution_id, status)
courses(institution_id, slug)

events(status, starts_at)
events(starts_at, ends_at)

content_blocks(owner_type, owner_id, position)

media(type)
media(category_id)

search_query_logs(created_at)
search_query_logs(institution_id, created_at)
search_query_logs(entity_type, created_at)
```

---

# 59. FULL-TEXT SEARCH

No PostgreSQL, considerar:

```text
tsvector
GIN index
```

para:

```text
title
content
keywords
```

Também poderá ser usada extensão:

```text
pg_trgm
```

para tolerância a erros de digitação.

Exemplo:

```text
mecanica
```

encontra:

```text
Mecânica
```

e pequenas variações incorretas.

---

# 60. SLUGS

Slugs serão normalizados:

```text
"Técnico em Mecânica"
→ tecnico-em-mecanica
```

Regras:

- minúsculas;
- sem acentos;
- hífen;
- sem caracteres especiais.

Mudança de slug de conteúdo publicado deverá gerar automaticamente:

```text
Redirect 301
```

---

# 61. URLS

Estrutura planejada:

```text
/

/etmsl
/etmsl/cursos
/etmsl/cursos/tecnico-em-informatica
/etmsl/estagio
/etmsl/noticias

/cramam
/cramam/cursos
/cramam/noticias

/noticias
/eventos
/processos-seletivos
/concursos
/busca
```

---

# 62. DELETE FÍSICO

Como foi definido que não haverá lixeira:

```text
DELETE
→ exclusão física
```

Porém somente após validações.

### Conteúdo

Antes da exclusão:

```text
confirmar explicitamente
registrar AuditLog
verificar dependências
```

### Mídia

Se estiver sendo utilizada:

```text
EXCLUSÃO PROIBIDA
```

---

# 63. HISTÓRICO DE ALTERAÇÕES

Páginas e artigos terão snapshots.

Não haverá inicialmente botão de restaurar.

O usuário poderá:

```text
visualizar versão anterior
```

Mas não:

```text
restaurar automaticamente
```

O modelo já permite adicionar essa função futuramente.

---

# 64. DASHBOARD

A Dashboard administrativa consumirá dados de Analytics.

Indicadores previstos:

```text
Acessos
Visitantes
Páginas mais acessadas
Notícias mais acessadas
Cursos mais acessados
Eventos mais acessados
Origem dos acessos
Dispositivos
Instituição
Buscas internas
Buscas sem resultado
```

Filtros:

```text
Hoje
7 dias
30 dias
Ano
Personalizado
```

e:

```text
Todas
FUMEP
ETMSL
CRAMAM
```

---

# 65. DECISÕES TÉCNICAS CONSOLIDADAS

As decisões que estavam abertas durante a elaboração inicial do modelo lógico foram fechadas pelos documentos especializados da Arquitetura Técnica V1.

```text
ORM
→ Drizzle ORM

Backend
→ NestJS

Frontend
→ Next.js

API
→ REST + OpenAPI

Validação
→ Zod

Autenticação
→ sessão server-side

Sessões
→ Redis

JWT
→ não utilizado

Storage
→ MinIO

Processamento de imagens
→ Sharp

Jobs / filas
→ BullMQ + Redis

Worker
→ aplicação independente apps/worker

Analytics de navegação
→ Matomo

Busca
→ PostgreSQL + tsvector + GIN + unaccent + pg_trgm

Cache
→ Redis quando necessário

Deployment
→ Ubuntu + Docker Compose + Nginx + GitHub Actions

Integrações externas
→ sincronização assíncrona via Worker + projeção local em PostgreSQL
```

## 65.1 Regra de precedência

Em caso de divergência com versões anteriores:

```text
documento especializado mais recente
↓
modelo lógico canônico
↓
modelo de domínio
↓
arquitetura geral inicial
```

---

# 66. NÚCLEO PARA PRIMEIRA IMPLEMENTAÇÃO

A primeira migration não deve conter necessariamente tudo.

Sugestão de primeira camada:

```text
institutions

users
user_institutions

media_categories
media
media_variants
media_usages

pages
content_blocks
page_versions
page_templates

articles
article_institutions
article_versions

categories
tags
article_categories
article_tags

audit_logs
```

Depois:

```text
courses
course_offerings
course_curricula
course_images
course_documents
```

Depois:

```text
events
event_institutions
event_schedules
event_categories
```

Depois:

```text
galleries
gallery_items

internship_areas
internship_categories
internship_documents

menus
menu_items
redirects
```

Por último:

```text
search_documents
search_document_institutions
search_query_logs

external_systems
selection_processes
contests
```

Analytics de navegação não cria tabelas próprias no banco principal da V1; será provido pelo Matomo.

---

# 67. VISÃO RESUMIDA DO MODELO

```text
PORTAL FUMEP
│
├── Institution
│    ├── Theme / Settings
│    ├── Pages
│    ├── Courses
│    ├── Internship
│    ├── Menus
│    └── Media Categories
│
├── User
│    └── UserInstitution
│
├── Page
│    ├── ContentBlock
│    ├── PageVersion
│    └── PageTemplate
│
├── Article
│    ├── ContentBlock
│    ├── Institutions
│    ├── Categories
│    ├── Tags
│    └── ArticleVersion
│
├── Course
│    ├── Offerings
│    ├── Curriculum
│    ├── Images
│    └── Documents
│
├── Event
│    ├── Institutions
│    ├── Categories
│    └── Schedule
│
├── Gallery
│    └── GalleryItem
│
├── Media
│    ├── Variants
│    ├── Categories
│    └── Usage
│
├── Internship
│    ├── Categories
│    └── Documents
│
├── Menu
│    └── MenuItem
│
├── Search
│
├── Analytics
│
├── Audit
│
└── External Systems
     ├── Selection Processes
     └── Contests
```

---

# 68. STATUS DO PROJETO APÓS ESTE DOCUMENTO

Com este Modelo de Dados Lógico V1, já estão definidos:

- domínio;
- entidades;
- relações;
- tipos de conteúdo;
- estruturas de dados;
- regras de publicação;
- permissões conceituais;
- versionamento;
- exclusão;
- acessibilidade de imagens;
- mídia;
- busca;
- analytics;
- integrações;
- Page Builder;
- estrutura multi-institucional.

A próxima etapa técnica é a **Arquitetura Técnica V1**, quando serão escolhidos:

```text
Frontend
Backend
PostgreSQL
ORM
Autenticação
Storage
Busca
Analytics
Filas
Cache
Deploy
CI/CD
```

Somente depois dessas escolhas deverá ser iniciada a criação das migrations e do código do projeto.