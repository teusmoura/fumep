# ARQUITETURA TÉCNICA V1 — JOBS E PROCESSAMENTO ASSÍNCRONO

## 1. OBJETIVO

Este documento define a arquitetura de **jobs, filas e processamento assíncrono** do Portal FUMEP.

A solução adotada utilizará:

```text
BullMQ
+
Redis
+
Worker dedicado
```

O objetivo é retirar do ciclo HTTP tarefas que sejam:

- demoradas;
- pesadas;
- agendadas;
- repetitivas;
- dependentes de sistemas externos;
- sujeitas a retry;
- adequadas a execução em segundo plano.

---

# 2. ARQUITETURA GERAL

Fluxo principal:

```text
NestJS API
   ↓
BullMQ
   ↓
Redis
   ↓
Worker
```

Responsabilidades:

```text
NestJS
→ cria e agenda jobs

Redis
→ mantém filas, estados e agendamentos

BullMQ
→ organiza processamento

Worker
→ executa tarefas
```

O Worker será uma aplicação independente dentro do monorepo.

---

# 3. ESTRUTURA DO MONOREPO

```text
portal-fumep/
│
├── apps/
│   ├── web/
│   │   └── Next.js
│   │
│   ├── api/
│   │   └── NestJS
│   │
│   └── worker/
│       └── BullMQ Workers
│
├── packages/
│   ├── db/
│   ├── types/
│   ├── validation/
│   ├── ui/
│   └── config/
│
└── infra/
```

O processamento de filas não será executado dentro do mesmo processo da API.

---

# 4. PRINCÍPIO DE SEPARAÇÃO

A API e o Worker serão independentes.

```text
API
≠
Worker
```

Isso permite:

- reiniciar a API sem interromper jobs;
- reiniciar Workers independentemente;
- aumentar capacidade de processamento no futuro;
- separar consumo de CPU;
- melhorar isolamento de falhas.

---

# 5. FILAS V1

Serão utilizadas pelo menos quatro filas lógicas.

```text
media
content
integrations
maintenance
```

Estrutura:

```text
BullMQ
│
├── media
│
├── content
│
├── integrations
│
└── maintenance
```

---

# 6. FILA MEDIA

Responsável por processamento de arquivos e imagens.

Jobs iniciais:

```text
PROCESS_MEDIA
```

Responsabilidades:

- gerar thumbnails;
- gerar WebP;
- gerar AVIF;
- coletar dimensões;
- atualizar MediaVariant;
- registrar falhas de processamento.

---

# 7. FILA CONTENT

Responsável por alterações automáticas relacionadas ao conteúdo público.

Jobs:

```text
PUBLISH_CONTENT
EXPIRE_CONTENT
REINDEX_SEARCH
INVALIDATE_CACHE
```

---

# 8. FILA INTEGRATIONS

Responsável por comunicação com sistemas externos.

Jobs:

```text
SYNC_SELECTION_PROCESSES
SYNC_CONTESTS
```

---

# 9. FILA MAINTENANCE

Responsável por tarefas periódicas de manutenção.

Inicialmente:

```text
CLEAN_EXPIRED_RESET_TOKENS
```

Outras rotinas poderão ser adicionadas futuramente.

---

# 10. JOB PROCESS_MEDIA

Fluxo:

```text
Editor envia imagem
↓
NestJS valida arquivo
↓
original salvo no MinIO
↓
registro Media criado
↓
PROCESS_MEDIA adicionado à fila
↓
Worker recebe job
↓
Sharp processa imagem
↓
gera variantes
↓
salva variantes no MinIO
↓
MediaVariant atualizado
```

---

# 11. VARIANTES DE IMAGEM

O Worker deverá gerar formatos adequados para web.

Inicialmente:

```text
WebP
AVIF
```

Também poderá gerar:

```text
thumbnail
larguras intermediárias
```

Exemplo conceitual:

```text
original.jpg

640.webp
1280.webp

640.avif
1280.avif

thumbnail.webp
```

As dimensões finais serão definidas posteriormente no Design System e na política de mídia.

---

# 12. SHARP

O processamento de imagens utilizará:

```text
Sharp
```

Responsabilidades:

- resize;
- conversão WebP;
- conversão AVIF;
- thumbnails;
- leitura de dimensões;
- otimização.

O processamento pesado não será realizado diretamente durante a requisição HTTP de upload.

---

# 13. JOB PUBLISH_CONTENT

Responsável pela publicação agendada.

Ao agendar conteúdo:

```text
status = SCHEDULED
scheduled_at = data/hora
```

O backend cria um job correspondente.

No horário previsto:

```text
PUBLISH_CONTENT
↓
Worker consulta novamente PostgreSQL
↓
confirma status atual
↓
confirma scheduled_at
↓
publica
↓
status = PUBLISHED
↓
published_at atualizado
↓
reindexa busca
↓
invalida cache
```

---

# 14. VALIDAÇÃO ANTES DA PUBLICAÇÃO

O Worker nunca deverá assumir que o conteúdo permanece igual ao momento em que o job foi criado.

Antes de publicar deverá verificar novamente:

- conteúdo ainda existe;
- continua agendado;
- não foi cancelado;
- não foi publicado manualmente;
- horário continua válido;
- requisitos de publicação continuam satisfeitos.

---

# 15. IDEMPOTÊNCIA DA PUBLICAÇÃO

O job deverá ser idempotente.

Exemplo:

```text
PUBLISH_CONTENT(articleId=123)
```

Se o artigo já estiver:

```text
PUBLISHED
```

o job não deverá publicar novamente.

Deverá apenas encerrar de maneira segura.

---

# 16. JOB EXPIRE_CONTENT

Responsável pela expiração automática.

Fluxo:

```text
expires_at
↓
EXPIRE_CONTENT
↓
Worker consulta conteúdo
↓
confirma situação
↓
status = EXPIRED
↓
remove da busca pública
↓
invalida caches relacionados
```

---

# 17. RECUPERAÇÃO DE JOBS PERDIDOS

Além dos jobs agendados individualmente, deverá existir uma verificação periódica de consistência.

Objetivo:

```text
detectar conteúdo que deveria ter sido publicado ou expirado
mas não foi
```

Isso protege contra situações como:

- Worker indisponível;
- Redis reiniciado;
- job perdido;
- falha temporária;
- reinicialização do servidor.

---

# 18. VARREDURA DE PUBLICAÇÃO E EXPIRAÇÃO

Frequência inicial:

```text
a cada 1 minuto
```

A rotina deverá buscar:

```text
status = SCHEDULED
AND scheduled_at <= NOW()
```

e também:

```text
expires_at <= NOW()
AND status apropriado
```

Criando ou executando os jobs necessários.

---

# 19. JOB SYNC_SELECTION_PROCESSES

Responsável pela sincronização com o sistema de Processo Seletivo.

Fluxo:

```text
Job periódico
↓
Worker
↓
API/sistema de Processo Seletivo
↓
validação da resposta
↓
upsert no PostgreSQL
↓
atualização da busca
↓
invalidação de cache
```

---

# 20. JOB SYNC_CONTESTS

Mesmo princípio:

```text
Job periódico
↓
Worker
↓
Sistema de Concursos
↓
validação
↓
upsert
↓
reindexação
↓
invalidação
```

---

# 21. ESTRATÉGIA DE SINCRONIZAÇÃO

O portal não dependerá de consulta em tempo real aos sistemas externos para montar cada página pública.

Será adotado:

```text
sincronização periódica
+
cache/local persistence
```

Assim, se o sistema externo estiver temporariamente indisponível:

```text
Portal continua apresentando
os últimos dados sincronizados
```

---

# 22. IDENTIFICAÇÃO EXTERNA

Sincronizações deverão utilizar:

```text
external_system_id
+
external_id
```

como referência.

Operação preferida:

```text
UPSERT
```

Isso evita duplicação de processos ou concursos.

---

# 23. FREQUÊNCIA DAS SINCRONIZAÇÕES

Valores iniciais:

```text
Processos Seletivos:
a cada 5 minutos
```

```text
Concursos:
a cada 5 minutos
```

Os valores deverão ser configuráveis.

---

# 24. JOB REINDEX_SEARCH

Responsável por atualizar o índice público de busca.

Pode ser disparado após:

- publicação;
- alteração relevante;
- exclusão;
- expiração;
- sincronização externa;
- mudança de curso/evento.

Fluxo:

```text
conteúdo alterado
↓
REINDEX_SEARCH
↓
índice atualizado
```

---

# 25. JOB INVALIDATE_CACHE

Responsável pela invalidação granular do cache público.

Exemplo:

```text
Notícia ETMSL publicada
↓
INVALIDATE_CACHE
↓
article:<id>
articles:etmsl
institution:etmsl
home:etmsl
home:fumep
```

Não deverá limpar indiscriminadamente todo o cache.

---

# 26. CACHE GRANULAR

Serão utilizadas tags lógicas.

Exemplos:

```text
article:<uuid>
articles:etmsl

course:<uuid>
courses:etmsl

event:<uuid>
events:fumep

institution:etmsl

home:fumep
home:etmsl
home:cramam
```

---

# 27. JOB CLEAN_EXPIRED_RESET_TOKENS

Responsável pela limpeza de tokens antigos de recuperação de senha.

Frequência inicial:

```text
1 vez por dia
```

Deverá remover tokens:

- expirados;
- consumidos;
- antigos além do período de retenção definido.

---

# 28. RETRIES

Jobs sujeitos a falhas temporárias deverão possuir número limitado de tentativas.

Exemplo:

```text
tentativa 1
↓
falha

tentativa 2
↓
falha

tentativa 3
```

Não utilizar retry infinito.

---

# 29. EXPONENTIAL BACKOFF

Para integrações externas:

```text
falha
↓
espera
↓
nova tentativa
↓
espera maior
↓
nova tentativa
```

Será usado:

```text
exponential backoff
```

Isso evita sobrecarregar serviços temporariamente indisponíveis.

---

# 30. JOBS DEFINITIVAMENTE FALHOS

Após ultrapassar o limite de tentativas:

```text
status = FAILED
```

O sistema deverá:

- registrar erro técnico;
- manter informação suficiente para diagnóstico;
- permitir identificação pelo Administrador;
- não executar retry infinito.

---

# 31. IDEMPOTÊNCIA

Todos os jobs que possam ser reexecutados deverão ser projetados de forma idempotente.

Exemplos:

```text
publicar duas vezes
→ não duplicar publicação

expirar duas vezes
→ continuar expirado

sincronizar duas vezes
→ UPSERT

reindexar duas vezes
→ resultado equivalente

invalidar cache duas vezes
→ seguro
```

---

# 32. IDENTIFICADORES DE JOB

Sempre que possível, jobs deverão utilizar IDs determinísticos ou chaves de deduplicação.

Exemplo conceitual:

```text
publish:article:<uuid>
```

```text
process-media:<uuid>
```

```text
sync-selection-processes
```

Isso ajuda a evitar criação de jobs duplicados.

---

# 33. CONCORRÊNCIA

Cada fila possuirá configuração própria de concorrência.

Exemplo:

```text
media
→ múltiplos jobs simultâneos
```

```text
integrations
→ concorrência mais baixa
```

```text
content
→ processamento rápido
```

Os valores serão configurados por ambiente.

---

# 34. MOTIVAÇÃO DA SEPARAÇÃO DE FILAS

Sem separação, uma carga pesada de mídia poderia atrasar:

```text
publicação de notícia
```

ou:

```text
expiração de conteúdo
```

Com filas distintas:

```text
media não bloqueia content
```

e:

```text
integrations não bloqueia maintenance
```

---

# 35. REDIS

O Redis será utilizado para:

```text
sessões
+
BullMQ
+
cache quando necessário
```

As chaves deverão possuir namespaces claros.

Exemplo:

```text
session:...
bull:media:...
bull:content:...
cache:...
```

---

# 36. OBSERVABILIDADE DE JOBS

Cada execução deverá permitir registrar:

```text
job_id
queue
job_type
status
attempt
started_at
finished_at
duration
error_summary
```

Esses dados poderão estar nos logs e/ou nas estruturas do BullMQ.

---

# 37. LOGS DE JOBS

Não registrar em payloads ou erros:

- senha;
- session ID completo;
- tokens de recuperação;
- credenciais externas;
- secrets;
- conteúdo sensível desnecessário.

---

# 38. SAÚDE DO SISTEMA

Deverá ser prevista no painel administrativo uma área de saúde operacional.

Exemplo:

```text
Worker: Online
Redis: Online
PostgreSQL: Online
MinIO: Online

Jobs aguardando: 3
Jobs em execução: 1
Jobs falhos: 0

Última sincronização Processo Seletivo:
18/08/2026 14:00

Última sincronização Concursos:
18/08/2026 14:00
```

---

# 39. ACESSO À SAÚDE DO SISTEMA

Essa área será destinada:

```text
ADMIN
```

Não deverá ficar disponível publicamente.

---

# 40. DASHBOARD DE FILAS

Durante desenvolvimento e homologação poderá existir ferramenta de inspeção das filas BullMQ.

Em produção, se disponibilizada:

- não será pública;
- ficará restrita;
- deverá exigir autenticação apropriada;
- poderá ser acessível somente internamente.

---

# 41. COMPORTAMENTO EM REINICIALIZAÇÃO

O projeto deverá assumir que qualquer serviço pode ser reiniciado.

Assim:

```text
API reinicia
→ jobs continuam no Redis
```

```text
Worker reinicia
→ retoma jobs
```

```text
servidor reinicia
→ Docker Compose sobe os serviços
→ jobs pendentes permanecem
```

desde que a persistência do Redis esteja corretamente configurada.

---

# 42. PERSISTÊNCIA DO REDIS

Como BullMQ e sessões utilizam Redis, a configuração de produção deverá considerar persistência adequada.

A política exata será definida na etapa de infraestrutura operacional.

O objetivo é reduzir perda de:

- jobs;
- estados de fila;
- agendamentos.

---

# 43. ORDEM DE EXECUÇÃO APÓS PUBLICAÇÃO

Quando um conteúdo for publicado:

```text
Publicação no PostgreSQL
↓
REINDEX_SEARCH
↓
INVALIDATE_CACHE
```

A publicação no banco é a operação principal.

Busca e cache são efeitos derivados.

Falha em busca/cache não deverá desfazer a publicação.

---

# 44. PRINCÍPIO DE CONSISTÊNCIA

O PostgreSQL será a **fonte de verdade**.

```text
PostgreSQL
= source of truth
```

Redis, cache, busca e integrações derivadas deverão poder ser reconstruídos a partir do estado persistido.

---

# 45. EVENTOS DE DOMÍNIO

Mesmo sem adotar inicialmente uma arquitetura completa de event sourcing, os serviços poderão disparar eventos internos conceituais:

```text
ArticlePublished
PageUpdated
CourseUpdated
EventPublished
MediaUploaded
ContentExpired
```

Esses eventos poderão gerar jobs relacionados.

Exemplo:

```text
ArticlePublished
├── REINDEX_SEARCH
└── INVALIDATE_CACHE
```

---

# 46. TRANSAÇÕES

A operação principal de negócio deverá ser concluída antes do processamento derivado.

Exemplo:

```text
BEGIN

UPDATE article
status = PUBLISHED

COMMIT

↓
adicionar jobs derivados
```

Nas etapas de implementação será avaliada estratégia para garantir que eventos/jobs não sejam perdidos em situações críticas.

---

# 47. EVOLUÇÃO FUTURA

Se futuramente a aplicação crescer significativamente, a arquitetura já permitirá:

- vários Workers;
- Workers especializados;
- separação por servidor;
- maior concorrência;
- filas adicionais;
- monitoramento mais avançado;
- escalabilidade horizontal.

Sem alterar a API pública do portal.

---

# 48. JOBS V1 CONSOLIDADOS

```text
PROCESS_MEDIA

PUBLISH_CONTENT

EXPIRE_CONTENT

REINDEX_SEARCH

INVALIDATE_CACHE

SYNC_SELECTION_PROCESSES

SYNC_CONTESTS

CLEAN_EXPIRED_RESET_TOKENS
```

---

# 49. FILAS V1 CONSOLIDADAS

```text
media
├── PROCESS_MEDIA

content
├── PUBLISH_CONTENT
├── EXPIRE_CONTENT
├── REINDEX_SEARCH
└── INVALIDATE_CACHE

integrations
├── SYNC_SELECTION_PROCESSES
└── SYNC_CONTESTS

maintenance
└── CLEAN_EXPIRED_RESET_TOKENS
```

---

# 50. DECISÕES TÉCNICAS V1

Ficam estabelecidas:

```text
BullMQ
Redis
Worker independente
Sharp
Filas separadas
Jobs idempotentes
Retries limitados
Exponential backoff
Jobs agendados
Jobs recorrentes
Varredura de recuperação
Processamento de mídia assíncrono
Sincronização periódica
Cache invalidation por job
Reindexação por job
PostgreSQL como fonte de verdade
Observabilidade de jobs
Saúde do sistema para ADMIN
```

---

# 51. INTEGRAÇÃO COM A ARQUITETURA GERAL

A arquitetura passa a ter:

```text
                 NGINX
                   │
          ┌────────┴────────┐
          │                 │
       Next.js           NestJS
       web/admin            API
                             │
             ┌───────────────┼───────────────┐
             │               │               │
         PostgreSQL        Redis           MinIO
                             │               │
                          BullMQ          Arquivos
                             │
                           Worker
                             │
                 ┌───────────┼───────────┐
                 │                       │
             Processo                Concursos
             Seletivo
```

---

# 52. STATUS

Com este documento, a camada de **Jobs e Processamento Assíncrono da Arquitetura Técnica V1** fica definida.

As decisões serão utilizadas posteriormente para:

- estrutura do app `worker`;
- configuração BullMQ;
- configuração Redis;
- processamento com Sharp;
- publicação agendada;
- expiração;
- sincronização externa;
- reindexação;
- invalidação de cache;
- monitoramento;
- testes de jobs;
- configuração Docker.