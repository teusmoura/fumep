# AUDITORIA COMPLETA — ARQUITETURA V1 DO PORTAL FUMEP

## 1. OBJETIVO

Esta auditoria consolida o conjunto de documentos técnicos da V1 do Portal FUMEP, identifica:

- arquivos canônicos;
- duplicatas;
- versões antigas;
- contradições entre documentos;
- lacunas do Plano de Implementação;
- pontos que devem ser corrigidos antes do Loop 0.1;
- precedência recomendada entre documentos.

A auditoria considera como mais fortes as decisões específicas e posteriores quando houver conflito com documentos gerais ou anteriores.

---

# 2. INVENTÁRIO CONSOLIDADO

## 2.1 Documentos técnicos principais

1. `Arquitetura_Tecnica_V1_Portal_FUMEP(1).md`
2. `MODELO DE DADOS LÓGICO V1 — PORTAL FUMEP.md`
3. `ARQUITETURA TÉCNICA V1 — SEGURANÇA E CONTROLE DE ACESSO.md`
4. `ARQUITETURA TÉCNICA V1 — JOBS E PROCESSAMENTO ASSÍNCRONO.md`
5. `ARQUITETURA_TECNICA_V1_STORAGE_BIBLIOTECA_MIDIA.md`
6. `ARQUITETURA_TECNICA_V1_BUSCA_INDEXACAO.md`
7. `ARQUITETURA_TECNICA_V1_ANALYTICS.md`
8. `ARQUITETURA_TECNICA_V1_DEPLOYMENT_OBSERVABILIDADE_OPERACAO.md`
9. `ARQUITETURA_TECNICA_V1_PAGE_BUILDER_CONTENT_BLOCKS.md`
10. `ARQUITETURA_TECNICA_V1_FRONTEND_DESIGN_SYSTEM_TEMAS.md`
11. `ARQUITETURA_TECNICA_V1_INTEGRACOES_EXTERNAS_PROCESSOS_CONCURSOS.md`
12. `ARQUITETURA_TECNICA_V1_TESTES_QA.md`
13. `ARQUITETURA_TECNICA_V1_IMPLANTACAO_TRANSICAO_PRODUCAO.md`
14. `PLANO_IMPLEMENTACAO_V1_LOOPS.md`

## 2.2 Artefato de domínio

15. `Modelo_Dominio_V1_Portal_FUMEP.zip`

Conteúdo do ZIP:

```text
MODELO_DOMINIO_V1.md
MODELO_DOMINIO_V1.txt
```

---

# 3. DUPLICATAS IDENTIFICADAS

Os seguintes pares são byte a byte idênticos no ambiente atual:

```text
ARQUITETURA_TECNICA_V1_ANALYTICS(1).md
ARQUITETURA_TECNICA_V1_ANALYTICS.md

ARQUITETURA_TECNICA_V1_BUSCA_INDEXACAO(1).md
ARQUITETURA_TECNICA_V1_BUSCA_INDEXACAO.md

ARQUITETURA_TECNICA_V1_FRONTEND_DESIGN_SYSTEM_TEMAS(1).md
ARQUITETURA_TECNICA_V1_FRONTEND_DESIGN_SYSTEM_TEMAS.md

ARQUITETURA_TECNICA_V1_IMPLANTACAO_TRANSICAO_PRODUCAO(1).md
ARQUITETURA_TECNICA_V1_IMPLANTACAO_TRANSICAO_PRODUCAO.md

ARQUITETURA_TECNICA_V1_INTEGRACOES_EXTERNAS_PROCESSOS_CONCURSOS(1).md
ARQUITETURA_TECNICA_V1_INTEGRACOES_EXTERNAS_PROCESSOS_CONCURSOS.md

ARQUITETURA_TECNICA_V1_PAGE_BUILDER_CONTENT_BLOCKS(1).md
ARQUITETURA_TECNICA_V1_PAGE_BUILDER_CONTENT_BLOCKS.md

ARQUITETURA_TECNICA_V1_STORAGE_BIBLIOTECA_MIDIA(1).md
ARQUITETURA_TECNICA_V1_STORAGE_BIBLIOTECA_MIDIA.md

ARQUITETURA_TECNICA_V1_TESTES_QA(1).md
ARQUITETURA_TECNICA_V1_TESTES_QA.md

PLANO_IMPLEMENTACAO_V1_LOOPS(1).md
PLANO_IMPLEMENTACAO_V1_LOOPS.md
```

### Recomendação

Manter apenas os nomes sem `(1)` no pacote canônico.

---

# 4. VERSÕES ANTIGAS / SUPERADAS

## 4.1 `Arquitetura_Tecnica_V1_Busca_Portal_FUMEP(1).md`

Este documento representa uma versão anterior da arquitetura de busca.

### Deve prevalecer

```text
ARQUITETURA_TECNICA_V1_BUSCA_INDEXACAO.md
```

Motivo:

- possui decisões mais detalhadas de ranking;
- explicita documentos sem OCR/extração de conteúdo;
- detalha contexto de documentos;
- consolida `search_documents`;
- consolida filtros;
- consolida autocomplete;
- consolida logs de busca;
- consolida integração com jobs.

### Status recomendado

```text
SUPERADO — NÃO USAR PARA IMPLEMENTAÇÃO
```

---

## 4.2 `Arquitetura_Tecnica_V1_Portal_FUMEP(1).md`

Este documento geral contém decisões que foram alteradas em documentos posteriores.

Ele deve ser tratado como:

```text
DOCUMENTO HISTÓRICO / VISÃO INICIAL
```

e não como fonte final para decisões técnicas conflitantes.

---

# 5. CONTRADIÇÃO CRÍTICA — BULLMQ E WORKER

## Documento geral antigo

`Arquitetura_Tecnica_V1_Portal_FUMEP(1).md` afirma que a V1 não terá:

```text
BullMQ
Worker separado
filas
dashboard de jobs
```

Também atribui:

```text
processamento de imagens → NestJS / Sharp síncrono
agendamentos → NestJS Scheduler
sincronizações → NestJS Scheduler
```

## Documentos especializados posteriores

Os documentos de:

```text
Jobs
Storage
Integrações Externas
Deployment
Testes
Plano de Implementação
```

assumem:

```text
BullMQ
Redis
Worker separado
PROCESS_MEDIA
PUBLISH_CONTENT
EXPIRE_CONTENT
REINDEX_SEARCH
INVALIDATE_CACHE
SYNC_SELECTION_PROCESSES
SYNC_CONTESTS
```

## Decisão de precedência recomendada

O conjunto especializado posterior deve prevalecer.

Portanto, para a V1 final:

```text
BullMQ = SIM
Worker separado = SIM
apps/worker = SIM
filas = SIM
processamento assíncrono de mídia = SIM
sincronizações externas via Worker = SIM
jobs de conteúdo via BullMQ = SIM
```

### Ação necessária

Atualizar ou retirar do pacote canônico:

```text
Arquitetura_Tecnica_V1_Portal_FUMEP(1).md
```

Se ele permanecer, deve receber no topo:

> DOCUMENTO SUPERADO EM PONTOS DE INFRAESTRUTURA. EM CASO DE CONFLITO, PREVALECEM OS DOCUMENTOS ESPECIALIZADOS.

### Severidade

```text
CRÍTICA
```

---

# 6. CONTRADIÇÃO CRÍTICA — NÚMERO DE SERVIÇOS DOCKER

O documento geral antigo apresenta:

```text
nginx
web
api
postgres
redis
minio
```

Total: 6 serviços principais.

A arquitetura posterior de Deployment considera:

```text
web
api
worker
postgres
redis
minio
matomo
nginx
```

Total: 8 serviços.

### Prevalece

```text
8 serviços
```

na arquitetura final atual.

### Severidade

```text
CRÍTICA
```

---

# 7. CONTRADIÇÃO CRÍTICA — ANALYTICS NO MODELO LÓGICO

O Modelo de Dados Lógico ainda contém:

```text
analytics_events
```

com eventos como:

```text
PAGE_VIEW
SEARCH
DOWNLOAD
EXTERNAL_LINK_CLICK
COURSE_VIEW
ARTICLE_VIEW
EVENT_VIEW
```

O mesmo documento registra que a decisão entre Matomo e analytics próprio ainda estaria em aberto.

Depois disso, a arquitetura de Analytics definiu:

```text
Matomo
= fonte de verdade para navegação
```

e:

```text
PostgreSQL
= busca, auditoria e dados operacionais
```

Também foi decidido que não haverá mecanismo paralelo de analytics de navegação no PostgreSQL.

### Correção recomendada

Remover `analytics_events` da implementação da V1.

Manter no PostgreSQL:

```text
search_query_logs
AuditLog
dados operacionais
jobs/logs quando aplicável
```

Navegação:

```text
Matomo
```

### Severidade

```text
CRÍTICA
```

---

# 8. MODELO LÓGICO — SEÇÃO DE DECISÕES PENDENTES ESTÁ DESATUALIZADA

O Modelo Lógico ainda lista como indefinidos:

```text
ORM
framework backend
framework frontend
autenticação
storage
Matomo
engine de busca
worker/queue
cache
deployment
integrações externas
```

Esses pontos já foram definidos posteriormente.

### Estado atual correto

```text
ORM → Drizzle
Backend → NestJS
Frontend → Next.js
Autenticação → sessão Redis
Storage → MinIO
Analytics → Matomo
Busca → PostgreSQL tsvector/GIN/unaccent/pg_trgm
Jobs → BullMQ + Worker
Deployment → Docker Compose + Nginx + GitHub Actions
Integrações → sincronização assíncrona com projeção local
```

### Recomendação

Tratar a seção como histórica ou atualizá-la.

### Severidade

```text
MÉDIA
```

---

# 9. CONTRADIÇÃO NO PLANO — PAGEINSTITUTION

O Plano de Loops inclui:

```text
LOOP 1.6 — PageInstitution
```

e admite uma relação N:N para páginas.

O Modelo de Dados Lógico define:

```text
pages.institution_id
```

ou seja, uma página pertence a uma instituição.

A arquitetura de navegação também trabalha com páginas em contexto institucional específico.

### Recomendação

Para V1:

```text
Page → N:1 Institution
```

Não criar `PageInstitution`.

Relações N:N permanecem para conteúdos que realmente podem pertencer a várias instituições, principalmente:

```text
Article
Event
SearchDocument
```

### Severidade

```text
ALTA
```

---

# 10. LACUNA NO PLANO — MENU E MENUITEM

O Modelo Lógico possui:

```text
Menu
MenuItem
```

A arquitetura frontend exige:

```text
menu por instituição
máximo 2 níveis
drawer
Outras instituições
```

Mas o Plano de Loops cria o componente visual de menu sem uma fase clara para:

```text
schema Menu
schema MenuItem
CRUD administrativo
ordenação
hierarquia
permissões
persistência
```

### Correção recomendada

Adicionar antes do frontend público:

```text
LOOP — Menu schema
LOOP — MenuItem schema
LOOP — CRUD ADMIN de menu
LOOP — ordenação
LOOP — hierarquia máxima de 2 níveis
LOOP — resolução de menu por InstitutionContext
```

### Severidade

```text
ALTA
```

---

# 11. LACUNA NO PLANO — PAGETEMPLATE

O Modelo Lógico e a arquitetura do Page Builder preveem:

```text
PageTemplate
```

Mas o Plano de Loops não possui implementação de templates reutilizáveis.

### Correção recomendada

Adicionar após o Page Builder básico:

```text
PageTemplate schema
CRUD ADMIN
criar página a partir de template
copiar blocos com novos IDs
teste de independência entre template e página criada
```

### Severidade

```text
MÉDIA
```

---

# 12. LACUNA NO PLANO — QUICK_LINKS

O catálogo V1 do Page Builder contém:

```text
QUICK_LINKS
```

O Plano de Implementação lista os demais blocos, mas não possui loop específico para `QUICK_LINKS`.

### Correção recomendada

Adicionar:

```text
LOOP — QUICK_LINKS schema
LOOP — QUICK_LINKS editor/renderer
```

com ícones controlados pelo sistema.

### Severidade

```text
ALTA
```

---

# 13. LACUNA NO PLANO — GALERIAS

O Modelo de Domínio/Modelo Lógico contém:

```text
Gallery
GalleryItem
```

O Page Builder contém:

```text
GALLERY_FEED
```

A segurança atribui ao Editor capacidade de gerenciar galerias.

Porém o Plano de Implementação não implementa:

```text
Gallery
GalleryItem
administração de galerias
página/listagem quando aplicável
GALLERY_FEED
```

### Correção recomendada

Adicionar uma fase própria ou inserir após Eventos:

```text
Gallery
GalleryItem
MediaUsage
CRUD
ordenação
GALLERY_FEED
testes
```

### Severidade

```text
ALTA
```

---

# 14. LACUNA NO PLANO — GALLERY_FEED

Mesmo que Galeria seja mantida, o bloco:

```text
GALLERY_FEED
```

não aparece no plano.

### Severidade

```text
ALTA
```

---

# 15. LACUNA NO PLANO — ARTICLEVERSION

O Modelo Lógico contém:

```text
ArticleVersion
```

O Plano de Loops não possui implementação explícita dessa entidade.

A arquitetura mais recente do Page Builder descreve fortemente `PageVersion`, mas não consolida com o mesmo nível de clareza um fluxo de `ArticleVersion`.

### Recomendação

Antes de implementar, decidir explicitamente uma das duas opções:

```text
A) Article também possui snapshot versionado
ou
B) apenas Page possui versionamento V1
```

Se `ArticleVersion` permanecer no modelo lógico, deve existir loop correspondente.

### Severidade

```text
MÉDIA
```

---

# 16. ORDEM DE DEPENDÊNCIA — LOGOS INSTITUCIONAIS E MEDIA

O Plano configura:

```text
Institution
Theme
logos
```

antes da fase completa de Media.

Como os logos são referências a `Media`, a implementação deverá evitar dependência quebrada.

### Alternativas seguras

```text
A) criar campos nullable e só habilitar upload após Media
```

ou:

```text
B) mover configuração real de logos para depois da Fase 4
```

### Recomendação

Preferir B na UI administrativa.

### Severidade

```text
MÉDIA
```

---

# 17. BUSCA — DUPLICIDADE DE DOCUMENTOS

Existem duas arquiteturas distintas de busca:

```text
Arquitetura_Tecnica_V1_Busca_Portal_FUMEP(1).md
ARQUITETURA_TECNICA_V1_BUSCA_INDEXACAO.md
```

### Prevalece

```text
ARQUITETURA_TECNICA_V1_BUSCA_INDEXACAO.md
```

### Ação

Retirar a versão antiga do pacote de implementação.

---

# 18. CONSISTÊNCIA — SEGURANÇA

O documento de Segurança está alinhado com as decisões finais:

```text
sessão server-side
Redis
sem JWT
ADMIN
EDITOR
escopo institucional
CSRF
Argon2id
HTTPS
```

Não foi identificada contradição estrutural relevante com os documentos especializados posteriores.

### Status

```text
CANÔNICO
```

---

# 19. CONSISTÊNCIA — JOBS

O documento de Jobs está alinhado com:

```text
Storage
Integrações
Deployment
Testes
Plano de Loops
```

### Status

```text
CANÔNICO
```

desde que o documento geral antigo seja considerado superado no conflito BullMQ/Worker.

---

# 20. CONSISTÊNCIA — STORAGE

O documento de Storage está coerente com:

```text
MinIO
PostgreSQL para metadados
BullMQ
Worker
Sharp
MediaUsage
checksum SHA-256
WebP/AVIF
```

### Status

```text
CANÔNICO
```

---

# 21. CONSISTÊNCIA — PAGE BUILDER

O documento de Page Builder está bem consolidado:

```text
ContentBlock unificado
owner_type PAGE | ARTICLE
JSONB
schema_version
Zod
BlockRegistry
renderer compartilhado
Preview
PageVersion
MediaUsage
controle otimista
```

### Pendências de plano

O problema principal não está neste documento, mas no Plano de Loops, que não cobre todos os elementos previstos.

### Status

```text
CANÔNICO
```

---

# 22. CONSISTÊNCIA — FRONTEND

O frontend final está coerente com:

```text
Design System único
InstitutionContext
ThemeContext
FUMEP / ETMSL / CRAMAM
drawer inclusive desktop
dark mode
acessibilidade
responsividade
```

### Status

```text
CANÔNICO
```

---

# 23. CONSISTÊNCIA — INTEGRAÇÕES EXTERNAS

O documento está coerente com:

```text
sistema externo como fonte de verdade
PostgreSQL como projeção/cache
BullMQ + Worker
sincronização periódica
UPSERT idempotente
ocultar ausentes somente em resposta válida
últimos dados mantidos em falha
```

### Status

```text
CANÔNICO
```

---

# 24. CONSISTÊNCIA — ANALYTICS

O documento de Analytics é coerente com a decisão final:

```text
Matomo → navegação
PostgreSQL → busca/auditoria/operação
```

### Ajuste necessário

O Modelo Lógico precisa ser atualizado para refletir esta decisão.

### Status

```text
CANÔNICO
```

---

# 25. CONSISTÊNCIA — TESTES E QA

O documento está coerente com:

```text
Vitest
Supertest
Playwright
axe-core
Lighthouse
CI obrigatória
branch protection
testes visuais seletivos
```

Também considera Worker/BullMQ, portanto está alinhado com a arquitetura especializada final.

### Status

```text
CANÔNICO
```

---

# 26. CONSISTÊNCIA — IMPLANTAÇÃO E TRANSIÇÃO

Está coerente com a decisão final:

```text
sem migração automática
site antigo permanece no ar
novo portal é construído em paralelo
conteúdo recriado manualmente
staging obrigatório
go-live controlado
rollback
```

### Status

```text
CANÔNICO
```

---

# 27. CONSISTÊNCIA — DEPLOYMENT E OBSERVABILIDADE

O documento encontrado contém:

```text
Ubuntu
Docker Compose
Nginx
GitHub Actions
web
api
worker
postgres
redis
minio
matomo
health
logs
requestId
rollback
backup
```

Ele está alinhado com os documentos especializados posteriores.

### Status

```text
CANÔNICO
```

---

# 28. MODELO DE DOMÍNIO ZIP

O ZIP contém:

```text
MODELO_DOMINIO_V1.md
MODELO_DOMINIO_V1.txt
```

Ele é um artefato anterior ao Modelo de Dados Lógico.

### Precedência

```text
Arquiteturas especializadas
↓
Modelo de Dados Lógico corrigido
↓
Modelo de Domínio
```

O Modelo de Domínio serve como referência conceitual, mas não deve prevalecer sobre decisões técnicas posteriores.

---

# 29. PRECEDÊNCIA DOCUMENTAL RECOMENDADA

Quando houver conflito, usar esta ordem:

```text
1. Documento especializado mais recente
2. Plano de Implementação corrigido
3. Modelo de Dados Lógico corrigido
4. Modelo de Domínio
5. Arquitetura Geral inicial
```

Mais especificamente:

```text
Segurança → prevalece em autenticação/autorização
Jobs → prevalece em filas
Storage → prevalece em mídia
Busca e Indexação → prevalece em busca
Analytics → prevalece em métricas
Deployment → prevalece em infraestrutura/operação
Page Builder → prevalece em páginas/blocos
Frontend → prevalece em UX/design/temas
Integrações → prevalece em concursos/processos
Testes → prevalece em QA
Implantação → prevalece em go-live/transição
```

---

# 30. DOCUMENTOS CANÔNICOS RECOMENDADOS

Usar para implementação:

```text
MODELO DE DADOS LÓGICO V1 — PORTAL FUMEP.md
ARQUITETURA TÉCNICA V1 — SEGURANÇA E CONTROLE DE ACESSO.md
ARQUITETURA TÉCNICA V1 — JOBS E PROCESSAMENTO ASSÍNCRONO.md
ARQUITETURA_TECNICA_V1_STORAGE_BIBLIOTECA_MIDIA.md
ARQUITETURA_TECNICA_V1_BUSCA_INDEXACAO.md
ARQUITETURA_TECNICA_V1_ANALYTICS.md
ARQUITETURA_TECNICA_V1_DEPLOYMENT_OBSERVABILIDADE_OPERACAO.md
ARQUITETURA_TECNICA_V1_PAGE_BUILDER_CONTENT_BLOCKS.md
ARQUITETURA_TECNICA_V1_FRONTEND_DESIGN_SYSTEM_TEMAS.md
ARQUITETURA_TECNICA_V1_INTEGRACOES_EXTERNAS_PROCESSOS_CONCURSOS.md
ARQUITETURA_TECNICA_V1_TESTES_QA.md
ARQUITETURA_TECNICA_V1_IMPLANTACAO_TRANSICAO_PRODUCAO.md
PLANO_IMPLEMENTACAO_V1_LOOPS.md
Modelo_Dominio_V1_Portal_FUMEP.zip
```

Mas antes do desenvolvimento, recomenda-se corrigir:

```text
MODELO DE DADOS LÓGICO V1 — PORTAL FUMEP.md
PLANO_IMPLEMENTACAO_V1_LOOPS.md
```

---

# 31. DOCUMENTOS A REMOVER DO PACOTE CANÔNICO

```text
Arquitetura_Tecnica_V1_Busca_Portal_FUMEP(1).md
Arquitetura_Tecnica_V1_Portal_FUMEP(1).md
```

A arquitetura geral pode permanecer em pasta histórica, mas não no conjunto de instruções para implementação.

---

# 32. DUPLICATAS A REMOVER

Todas as cópias idênticas com `(1)` quando houver versão idêntica sem `(1)`.

---

# 33. CORREÇÕES OBRIGATÓRIAS ANTES DO LOOP 0.1

## Críticas

```text
[ ] consolidar BullMQ + Worker como decisão final
[ ] retirar a arquitetura geral antiga do conjunto canônico
[ ] remover analytics_events do modelo lógico V1
[ ] atualizar seção de decisões pendentes do modelo lógico
```

## Altas

```text
[ ] remover PageInstitution do Plano
[ ] adicionar Menu / MenuItem ao Plano
[ ] adicionar QUICK_LINKS ao Plano
[ ] adicionar Gallery / GalleryItem ao Plano
[ ] adicionar GALLERY_FEED ao Plano
```

## Médias

```text
[ ] decidir explicitamente ArticleVersion
[ ] adicionar PageTemplate ao Plano
[ ] ajustar ordem dos logos em relação a Media
```

---

# 34. RESULTADO DA AUDITORIA

O conjunto está **bem avançado e utilizável**, mas ainda não deve ser entregue diretamente a uma IA de implementação sem correções.

O maior problema não é falta de arquitetura; é que documentos de momentos diferentes registram decisões diferentes.

A base final é consistente quando se considera como prevalentes os documentos especializados mais recentes.

Os dois arquivos que mais precisam de revisão são:

```text
MODELO DE DADOS LÓGICO V1 — PORTAL FUMEP.md
PLANO_IMPLEMENTACAO_V1_LOOPS.md
```

Depois dessas correções, o conjunto pode se tornar uma especificação canônica única para iniciar o Loop 0.1.

---

# 35. PRÓXIMA AÇÃO RECOMENDADA

Antes de escrever código:

```text
1. corrigir Modelo de Dados Lógico
2. corrigir Plano de Implementação
3. gerar MANIFESTO_CANONICO_V1.md
4. gerar pacote ZIP final sem duplicatas/versões antigas
5. iniciar Loop 0.1
```
