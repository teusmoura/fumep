# ARQUITETURA TÉCNICA V1 — BUSCA E INDEXAÇÃO

## 1. OBJETIVO

Este documento define a arquitetura de **busca pública, indexação, autocomplete, filtros e relevância textual** do Portal FUMEP.

A solução V1 utilizará prioritariamente recursos nativos do **PostgreSQL**, evitando a introdução inicial de mecanismos externos como Elasticsearch, OpenSearch ou Meilisearch.

A arquitetura será baseada em:

```text
PostgreSQL
+
tsvector
+
GIN
+
unaccent
+
pg_trgm
```

O objetivo é oferecer uma busca:

- rápida;
- tolerante a acentos;
- tolerante a pequenos erros de digitação;
- filtrável por instituição, tipo e período;
- ordenada por relevância textual;
- capaz de pesquisar conteúdos de diferentes módulos do portal.

---

# 2. PRINCÍPIO GERAL

O PostgreSQL será o mecanismo principal de busca na V1.

A busca pública deverá funcionar sobre um índice lógico unificado:

```text
search_documents
```

Esse índice será alimentado a partir dos conteúdos publicados do portal.

O PostgreSQL continuará sendo a fonte de verdade.

O índice de busca será uma representação derivada e reconstruível.

---

# 3. TIPOS DE CONTEÚDO INDEXADOS

A busca deverá indexar inicialmente:

```text
PAGE
ARTICLE
COURSE
EVENT
DOCUMENT
CONTEST
SELECTION_PROCESS
```

Correspondendo a:

- páginas institucionais;
- notícias e artigos;
- cursos;
- eventos;
- documentos vinculados;
- concursos;
- processos seletivos.

---

# 4. FULL-TEXT SEARCH

Será utilizado o recurso de full-text search do PostgreSQL com `tsvector` e índice `GIN`.

Os campos receberão pesos diferentes conforme a importância.

Exemplo conceitual:

```text
A → título
B → tags, categorias, nomes de curso e instituição
C → resumo e descrição
D → conteúdo textual
```

---

# 5. UNACCENT

A extensão `unaccent` será utilizada para permitir equivalência entre termos com e sem acentuação.

Exemplos:

```text
mecanica → Mecânica
estagio → Estágio
```

---

# 6. PG_TRGM

Será utilizada a extensão `pg_trgm` para tolerância a pequenos erros de digitação e similaridade textual.

Exemplos:

```text
informatica
informatca
informátca
```

podem encontrar:

```text
Informática
```

A correspondência exata continuará possuindo pontuação superior.

---

# 7. RANKING

A ordenação será baseada **prioritariamente em relevância textual**.

Não serão fatores principais de ranking:

- recência;
- destaque editorial;
- evento futuro;
- processo seletivo aberto;
- número de acessos.

Pesos conceituais:

```text
Título exato / quase exato
→ peso máximo

Título parcial
→ peso muito alto

Tags e categorias
→ peso alto

Nome da instituição
→ peso alto

Nome do curso/contexto principal
→ peso alto

Resumo / descrição
→ peso médio

Conteúdo textual
→ peso normal

Contexto de documento
→ peso normal
```

---

# 8. DOCUMENTOS

Documentos não terão seu conteúdo interno extraído ou indexado na V1.

Não será realizado:

- OCR;
- extração de texto de PDF;
- leitura de páginas;
- indexação do conteúdo interno do documento.

Para documentos, a busca considerará apenas:

```text
Título do documento
Descrição
Nome do arquivo
Tipo
Categoria
Instituição
Título do conteúdo pai
Curso vinculado
Página vinculada
Notícia vinculada
Evento vinculado
Contexto textual do vínculo
```

Como documentos não possuem área pública independente, o resultado deverá preferencialmente levar ao contexto onde o documento está publicado.

Exemplo:

```text
/etmsl/cursos/tecnico-em-informatica#matriz-curricular
```

---

# 9. AUTOCOMPLETE

O autocomplete será ativado após:

```text
3 caracteres
```

Serão apresentadas inicialmente até:

```text
8 sugestões
```

As sugestões serão agrupadas por tipo.

Exemplo:

```text
CURSOS
Técnico em Informática

NOTÍCIAS
Mostra de projetos de Informática

PROCESSOS SELETIVOS
Processo Seletivo ETMSL 2026

[Ver todos os resultados para "informática"]
```

O autocomplete também será ordenado por relevância textual.

---

# 10. FILTROS

A página completa de resultados permitirá filtros por:

## Instituição

```text
Todos
FUMEP
ETMSL
CRAMAM
```

## Tipo

```text
Todos
Páginas
Notícias
Cursos
Eventos
Concursos
Processos Seletivos
Documentos
```

## Período

```text
Qualquer período
Último mês
Último ano
Personalizado
```

Os filtros por instituição e tipo deverão ser acessíveis com um clique.

---

# 11. ENDPOINTS

Busca:

```text
GET /api/v1/public/search
```

Parâmetros:

```text
q
institution
type
from
to
page
pageSize
```

Autocomplete:

```text
GET /api/v1/public/search/suggestions
```

Se `length(q) < 3`, o endpoint de sugestões não deverá executar pesquisa completa.

---

# 12. ÍNDICE UNIFICADO

Estrutura lógica:

```text
search_documents
----------------
id UUID PK

entity_type VARCHAR
entity_id UUID

title TEXT NOT NULL
content TEXT NULL
keywords TEXT NULL

url TEXT NOT NULL

published_at TIMESTAMPTZ NULL
updated_at TIMESTAMPTZ NOT NULL

search_vector TSVECTOR
```

Restrição lógica:

```text
UNIQUE(entity_type, entity_id)
```

Relação com instituições:

```text
search_document_institutions
----------------------------
search_document_id UUID
institution_id UUID

PRIMARY KEY(search_document_id, institution_id)
```

---

# 13. CONTEÚDO PÚBLICO

Somente conteúdo público deverá estar disponível na busca.

Não indexar:

```text
DRAFT
SCHEDULED ainda não publicado
EXPIRED
conteúdo fechado
conteúdo oculto
```

Cursos `CLOSED` não deverão aparecer.

Eventos passados poderão continuar aparecendo se sua página permanecer pública.

---

# 14. INDEXAÇÃO POR ENTIDADE

## Page

```text
title
description
blocos textuais relevantes
institution
```

## Article

```text
title
subtitle
summary
conteúdo textual
categories
tags
institutions
```

## Course

```text
name
short_description
full_description
requirements
professional_profile
job_market
coordinator
offerings
institution
```

## Event

```text
title
short_description
full_description
address
schedule titles
categories
institutions
```

## Document

```text
title
description
filename
categoria
contexto pai
institution
```

## Contest

```text
title
number
year
status
institution
```

## SelectionProcess

```text
title
number
year
status
institution
```

---

# 15. PAGE BUILDER

Para páginas e notícias, apenas conteúdo textual semanticamente relevante deverá ser indexado.

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

Metadados técnicos dos blocos não deverão aparecer na busca.

---

# 16. REINDEXAÇÃO

A atualização do índice será feita por job:

```text
REINDEX_SEARCH
```

Fluxo:

```text
conteúdo alterado
↓
PostgreSQL atualizado
↓
job REINDEX_SEARCH
↓
Worker monta documento de busca
↓
UPSERT search_documents
↓
atualiza instituições
↓
INVALIDATE_CACHE
```

A reindexação deverá ser idempotente.

Deverá existir também uma rotina:

```text
REBUILD_SEARCH_INDEX
```

para reconstrução completa.

---

# 17. FALHA DE INDEXAÇÃO

Falha na indexação não deverá desfazer publicação.

```text
conteúdo publicado
↓
reindexação falha
↓
job entra em retry
↓
conteúdo continua publicado
```

O PostgreSQL de domínio permanece como fonte de verdade.

---

# 18. LOG DE BUSCAS

Estrutura:

```text
search_query_logs
-----------------
id

query

results_count

institution_id
entity_type

created_at
```

Objetivos:

- identificar termos mais pesquisados;
- identificar buscas sem resultado;
- entender interesse dos visitantes;
- descobrir conteúdo difícil de encontrar.

Não será necessário associar buscas a usuários identificados.

---

# 19. CACHE

Redis poderá ser utilizado para:

```text
cache de autocomplete
cache curto de buscas frequentes
```

Após `REINDEX_SEARCH`, poderá ser disparado `INVALIDATE_CACHE`.

---

# 20. SEARCHSERVICE

O frontend não deverá conhecer detalhes de `tsvector`, `pg_trgm` ou PostgreSQL.

Arquitetura:

```text
REST API
↓
SearchService
↓
PostgreSQL Search Adapter
```

Isso permitirá evolução futura para outro motor de busca sem alterar a API pública.

---

# 21. OPENAPI E ZOD

Os endpoints de busca serão documentados em OpenAPI.

Os parâmetros e respostas serão validados com Zod.

---

# 22. RATE LIMITING

A busca pública seguirá a política geral de rate limiting.

Valor inicial previsto:

```text
60 a 120 requisições por minuto por IP
```

O autocomplete participa dessa política.

---

# 23. ACESSIBILIDADE

A interface de busca deverá:

- possuir label acessível;
- funcionar por teclado;
- anunciar quantidade de resultados quando apropriado;
- permitir navegação pelas sugestões;
- possuir foco visível;
- não depender apenas de cor para diferenciar tipos.

No autocomplete:

```text
Seta para baixo
Seta para cima
Enter
Escape
```

deverão funcionar adequadamente.

---

# 24. RESPONSIVIDADE

A busca deverá funcionar adequadamente em:

```text
desktop
tablet
smartphone
```

No mobile, filtros poderão ser apresentados em painel ou drawer.

---

# 25. URL COMPARTILHÁVEL

Consulta e filtros deverão ser representados na URL.

Exemplo:

```text
/busca?q=informatica&institution=etmsl&type=course
```

O estado principal da busca deverá ser derivado da URL.

---

# 26. SEM RESULTADOS

Quando não houver resultados:

```text
Nenhum resultado encontrado para "..."
```

A interface poderá sugerir:

- revisar a escrita;
- remover filtros;
- tentar termos mais gerais.

Não deverá inventar resultados de baixa qualidade.

---

# 27. EXTENSÕES POSTGRESQL

A infraestrutura deverá habilitar:

```text
unaccent
pg_trgm
```

e os recursos nativos de full-text search.

Essas extensões deverão fazer parte das migrations ou scripts de inicialização.

---

# 28. DRIZZLE

O schema principal será mantido em Drizzle.

Recursos específicos como:

- extensões;
- índices GIN;
- expressões de `tsvector`;
- índices de trigram;

poderão utilizar SQL manual dentro das migrations.

---

# 29. DECISÕES CONSOLIDADAS

Ficam definidas para a Busca e Indexação V1:

```text
PostgreSQL como motor de busca

search_documents como índice unificado

tsvector

GIN

unaccent

pg_trgm

relevância prioritariamente textual

sem peso relevante por recência

sem peso por is_featured

autocomplete a partir de 3 caracteres

máximo de 8 sugestões

sugestões agrupadas por tipo

filtros por instituição

filtros por tipo

filtro por período

URLs compartilháveis

documentos indexados apenas por metadados e contexto

sem extração de conteúdo de PDF

resultado de documento leva ao contexto público

job REINDEX_SEARCH

UPSERT idempotente

reindexação completa disponível

PostgreSQL de domínio como fonte de verdade

log de buscas

registro de buscas sem resultado

SearchService desacoplado do motor
```

---

# 30. ARQUITETURA RESUMIDA

```text
                    VISITANTE
                        │
                        ▼
                     Next.js
                        │
                        ▼
                /api/v1/public/search
                        │
                        ▼
                     NestJS
                        │
                        ▼
                  SearchService
                        │
                        ▼
                    PostgreSQL
        ┌───────────────┼────────────────┐
        │               │                │
     tsvector           GIN           pg_trgm
        │                                │
        └───────────────┬────────────────┘
                        ▼
                 Resultados ranqueados
                        │
                        ▼
                     Next.js
```

Atualização:

```text
Conteúdo alterado
↓
PostgreSQL
↓
BullMQ
↓
REINDEX_SEARCH
↓
search_documents
↓
INVALIDATE_CACHE
```

---

# 31. STATUS

Com este documento, a camada de **Busca e Indexação da Arquitetura Técnica V1** é considerada definida.

As decisões deverão orientar posteriormente:

- migrations PostgreSQL;
- extensões `unaccent` e `pg_trgm`;
- índices GIN;
- schema Drizzle;
- SearchService;
- endpoints REST;
- schemas Zod;
- documentação OpenAPI;
- autocomplete;
- filtros públicos;
- página de resultados;
- logs de busca;
- Dashboard;
- testes de relevância;
- testes de performance;
- testes de acessibilidade.
