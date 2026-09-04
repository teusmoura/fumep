# ARQUITETURA TÉCNICA V1 — INTEGRAÇÕES EXTERNAS: PROCESSOS SELETIVOS E CONCURSOS

## 1. OBJETIVO

Este documento define a arquitetura de integração do Portal FUMEP com sistemas externos responsáveis por:

```text
Processos Seletivos

Concursos
```

O objetivo é permitir que o Portal:

- exiba informações institucionais atualizadas;
- mantenha boa performance;
- continue funcionando mesmo em caso de indisponibilidade temporária do sistema externo;
- integre os conteúdos à busca;
- utilize os dados em blocos dinâmicos do Page Builder;
- preserve o sistema externo como fonte oficial.

---

# 2. PRINCÍPIO GERAL

O Portal FUMEP não deverá consultar o sistema externo a cada acesso do visitante.

A arquitetura será baseada em sincronização periódica:

```text
Sistema externo
↓
API
↓
NestJS
↓
BullMQ
↓
Worker
↓
PostgreSQL local
↓
Portal público
```

---

# 3. FONTE DE VERDADE

Para Processos Seletivos e Concursos:

```text
Sistema externo
→ fonte de verdade
```

O PostgreSQL do Portal será:

```text
cache local
+
projeção de leitura
```

O Portal não será responsável por alterar o conteúdo oficial desses registros.

---

# 4. ENTIDADES

As entidades previstas são:

```text
ExternalSystem

SelectionProcess

Contest
```

---

# 5. CAMPOS PRINCIPAIS

Estrutura conceitual para SelectionProcess e Contest:

```text
id
external_system_id
external_id
institution_id
slug
title
number
year
status
summary
start_at
end_at
external_url
source_updated_at
last_synced_at
is_visible
created_at
updated_at
```

---

# 6. CHAVE DE IDENTIFICAÇÃO

A identificação lógica será:

```text
external_system_id
+
external_id
```

Deverá existir restrição de unicidade equivalente.

Isso permitirá `UPSERT` idempotente.

---

# 7. SINCRONIZAÇÃO

Jobs:

```text
SYNC_SELECTION_PROCESSES

SYNC_CONTESTS
```

Frequência inicial recomendada:

```text
a cada 5 minutos
```

A frequência será configurável.

---

# 8. FLUXO DE SINCRONIZAÇÃO

```text
Worker inicia job
↓
consulta API externa
↓
valida resposta
↓
normaliza dados
↓
UPSERT PostgreSQL
↓
oculta registros ausentes
↓
REINDEX_SEARCH
↓
INVALIDATE_CACHE
```

---

# 9. UPSERT

A sincronização deverá ser idempotente.

Executar a mesma sincronização mais de uma vez deverá produzir o mesmo estado final.

---

# 10. STATUS

O status exibido no Portal será sempre o status recebido do sistema externo.

O Portal não deverá reinterpretar datas para inventar estados como:

```text
ABERTO

ENCERRADO

EM BREVE
```

a menos que esses valores já existam na origem.

---

# 11. REGISTRO AUSENTE NA API

Se um registro que existia localmente deixar de aparecer na resposta válida da API externa:

```text
ocultar imediatamente
```

A regra será:

```text
registro ausente
↓
is_visible = false
```

ou mecanismo equivalente.

---

# 12. CUIDADO COM RESPOSTAS INVÁLIDAS

A ocultação imediata só deverá ocorrer quando a sincronização for considerada tecnicamente válida e completa.

Se ocorrer:

- timeout;
- erro HTTP;
- resposta malformada;
- falha de autenticação;
- erro de parsing;

os registros locais não deverão ser ocultados em massa.

---

# 13. FALHA DA API EXTERNA

Se o sistema externo estiver temporariamente indisponível:

```text
últimos dados sincronizados
→ continuam disponíveis
```

O Portal não deverá ficar indisponível por causa da integração.

---

# 14. SAÚDE DO SISTEMA

Somente ADMIN poderá visualizar detalhes da integração.

Exemplo:

```text
Processos Seletivos

Última sincronização bem-sucedida:
15:55

Última tentativa:
16:00

Status:
Erro temporário
```

---

# 15. EDIÇÃO LOCAL

Na V1, o Editor não poderá editar diretamente os dados sincronizados.

Isso evita divergência entre:

```text
Portal
```

e:

```text
Sistema oficial
```

---

# 16. PÁGINA PRÓPRIA NO PORTAL

Processos Seletivos e Concursos terão página pública própria no Portal.

Rotas conceituais:

```text
/processos-seletivos/:slug

/concursos/:slug
```

---

# 17. OBJETIVO DA PÁGINA PRÓPRIA

A página do Portal funcionará como:

```text
camada institucional
+
descoberta
+
SEO
+
busca interna
```

Não substituirá o sistema externo.

---

# 18. CONTEÚDO DA PÁGINA

A página poderá exibir:

```text
Título

Número

Ano

Instituição

Status

Resumo

Data inicial

Data final

Última atualização

CTA para sistema oficial
```

---

# 19. CTA

Exemplo:

```text
[Acessar sistema oficial]
```

O CTA utilizará:

```text
external_url
```

recebida da integração.

---

# 20. O QUE NÃO SERÁ DUPLICADO

O Portal não será responsável, na V1, por duplicar funcionalidades como:

```text
inscrição

login do candidato

envio de documentos

acompanhamento de inscrição

recursos

resultado individual

pagamentos

operações específicas do sistema externo
```

---

# 21. SEO

A página própria permitirá:

```text
title

meta description

canonical

Open Graph
```

baseados nos dados sincronizados.

---

# 22. BUSCA

Após sincronização com alteração:

```text
REINDEX_SEARCH
```

deverá atualizar o índice.

Campos indexados:

```text
title
number
year
status
summary
institution
```

O resultado de busca deverá levar à página própria do Portal.

---

# 23. PAGE BUILDER

Os blocos:

```text
SELECTION_PROCESS_FEED

CONTEST_FEED
```

consultarão exclusivamente o PostgreSQL local.

Nunca diretamente a API externa.

---

# 24. PERFORMANCE

A leitura pública deverá ser independente da latência da API externa.

---

# 25. CACHE

Feeds e páginas públicas poderão utilizar cache conforme a arquitetura híbrida já definida.

Após sincronização com alteração:

```text
INVALIDATE_CACHE
```

deverá ser disparado para as tags relacionadas.

---

# 26. RETRY

Jobs de sincronização poderão utilizar tentativas limitadas.

Exemplo conceitual:

```text
retry
+
exponential backoff
```

Não haverá retry infinito.

---

# 27. TIMEOUT

Chamadas externas deverão possuir timeout explícito.

A integração não deverá bloquear o Worker indefinidamente.

---

# 28. VALIDAÇÃO DA RESPOSTA

A resposta externa deverá ser validada antes de gravar no banco.

Utilizar:

```text
Zod
```

ou contrato equivalente.

Se a resposta for inválida:

```text
não substituir estado local válido
```

---

# 29. ADAPTERS

A integração deverá ser encapsulada.

Exemplo:

```text
SelectionProcessSyncService
↓
ExternalSelectionProcessAdapter
```

e:

```text
ContestSyncService
↓
ExternalContestAdapter
```

O domínio do Portal não deverá depender diretamente do formato bruto da API externa.

---

# 30. NORMALIZAÇÃO

O adapter será responsável por:

```text
datas

status textual

URLs

IDs

campos opcionais

instituição
```

sem reinterpretar semanticamente o status.

---

# 31. SEGURANÇA

Credenciais da API externa:

```text
não ficam no Git

não vão para o navegador

não aparecem em logs
```

Serão armazenadas como segredos de infraestrutura.

---

# 32. LOGS

Registrar:

```text
job_id

external_system

start_at

end_at

duration

items_received

items_created

items_updated

items_hidden

status

error
```

Não registrar tokens, senhas ou headers de autorização.

---

# 33. CONCORRÊNCIA

Evitar duas sincronizações simultâneas do mesmo sistema externo.

---

# 34. TRANSAÇÃO

A aplicação deverá garantir consistência da atualização local.

Fluxo ideal:

```text
início da sincronização válida
↓
upserts
↓
ocultação dos ausentes
↓
commit
```

---

# 35. LAST_SYNCED_AT

Cada registro deverá possuir:

```text
last_synced_at
```

Quando disponível:

```text
source_updated_at
```

também deverá ser armazenado.

---

# 36. FALLBACK DE DADOS OPCIONAIS

Campos ausentes na origem não deverão ser inventados.

Exemplo:

```text
summary ausente
→ não exibir resumo
```

---

# 37. FRONTEND

A página pública seguirá o Design System institucional.

Exemplo:

```text
badge de tipo

título

status

metadados

resumo

CTA
```

---

# 38. STATUS VISUAL

O status poderá receber tratamento visual com badge.

A cor não deverá ser o único indicador.

O texto oficial deverá permanecer visível.

---

# 39. 404

Se um registro estiver oculto ou não existir:

```text
404
```

ou comportamento público equivalente.

Não deverá exibir conteúdo removido da origem.

---

# 40. CACHE E BUSCA DE REGISTRO OCULTO

Ao ocultar um registro:

```text
INVALIDATE_CACHE
```

e:

```text
remover do índice de busca
```

deverão acontecer.

Feeds retornarão apenas:

```text
is_visible = true
```

---

# 41. SAÚDE — ADMIN

A tela de Saúde do Sistema poderá mostrar:

```text
Sistema externo

Status

Última sincronização bem-sucedida

Última tentativa

Tempo de resposta

Quantidade de registros recebidos

Último erro resumido
```

---

# 42. SINCRONIZAÇÃO MANUAL

Poderá existir, para ADMIN:

```text
Sincronizar agora
```

Se implementada, a ação apenas enfileirará o job:

```text
ADMIN
↓
API
↓
BullMQ
↓
Worker
```

---

# 43. ENDPOINTS PÚBLICOS

Exemplos conceituais:

```text
GET /api/v1/public/selection-processes

GET /api/v1/public/selection-processes/:slug

GET /api/v1/public/contests

GET /api/v1/public/contests/:slug
```

---

# 44. API ADMINISTRATIVA

Exemplos conceituais:

```text
GET /api/v1/admin/external-systems/status
```

e, se implementado:

```text
POST /api/v1/admin/external-systems/:id/sync
```

Somente ADMIN.

---

# 45. TESTES

A integração deverá possuir testes para:

```text
sincronização com novos registros

atualização de registros

ocultação de ausentes

erro da API

timeout

resposta inválida

retry

idempotência

reindexação

invalidação de cache
```

---

# 46. TESTE CRÍTICO — API INDISPONÍVEL

Cenário:

```text
API externa offline
```

Resultado esperado:

```text
Portal continua exibindo últimos dados válidos
```

---

# 47. TESTE CRÍTICO — ITEM REMOVIDO

Cenário:

```text
item existia
↓
sync válida
↓
item não veio
```

Resultado:

```text
item ocultado imediatamente

retirado dos feeds

retirado da busca

página pública deixa de ficar disponível
```

---

# 48. TESTE CRÍTICO — RESPOSTA INVÁLIDA

Se a resposta não puder ser considerada completa e válida:

```text
não ocultar registros existentes
```

---

# 49. DECISÕES CONSOLIDADAS

Ficam definidas para Integrações Externas V1:

```text
Processos Seletivos e Concursos
vêm de sistemas externos

Sistema externo é fonte de verdade

PostgreSQL local é projeção/cache

Sem consulta externa a cada visita

Sincronização via BullMQ + Worker

Frequência inicial:
5 minutos

UPSERT idempotente

external_system_id + external_id
como chave lógica

Status sempre vem da origem

Portal não reinterpreta status

Registro ausente em sincronização válida
→ ocultar imediatamente

Falha externa
→ manter últimos dados válidos

Resposta inválida
→ não ocultar em massa

Página própria no Portal

Rotas:
processos-seletivos/:slug
concursos/:slug

Página mostra resumo e CTA

CTA leva ao sistema oficial

Portal não duplica operações transacionais
do sistema externo

Busca aponta para página do Portal

Feeds usam PostgreSQL local

REINDEX_SEARCH após alterações

INVALIDATE_CACHE após alterações

Saúde detalhada somente para ADMIN

Editor não edita dados sincronizados

Adapters desacoplam formato externo

Credenciais ficam no backend

Logs estruturados

Testes de idempotência, falha e ocultação
```

---

# 50. ARQUITETURA RESUMIDA

```text
                 SISTEMA EXTERNO
                       │
                       ▼
                      API
                       │
                       ▼
                    NestJS
                       │
                       ▼
                    BullMQ
                       │
                       ▼
                    Worker
                       │
                       ▼
                  PostgreSQL
                  projeção local
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
        Busca        Feeds      Página própria
          │            │            │
          └────────────┼────────────┘
                       ▼
                    Next.js
                       │
                       ▼
                   Visitante
                       │
                       ▼
          [Acessar sistema oficial]
```

---

# 51. STATUS

Com este documento, a camada de **Integrações Externas V1 — Processos Seletivos e Concursos** é considerada definida.

As decisões deverão orientar posteriormente:

- schema Drizzle;
- migrations;
- ExternalSystem;
- SelectionProcess;
- Contest;
- adapters;
- jobs BullMQ;
- Worker;
- endpoints públicos;
- endpoints administrativos;
- busca;
- Page Builder;
- cache;
- Health System;
- Zod;
- OpenAPI;
- testes de integração.
