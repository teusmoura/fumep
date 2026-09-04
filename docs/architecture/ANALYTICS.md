# ARQUITETURA TÉCNICA V1 — ANALYTICS

## 1. OBJETIVO

Este documento define a arquitetura de **analytics, métricas de navegação e visualização de estatísticas** do Portal FUMEP.

A solução V1 utilizará:

```text
Matomo
+
PostgreSQL
+
Next.js
+
NestJS
```

O Matomo será responsável pelas métricas de navegação pública.

O PostgreSQL continuará responsável por dados operacionais internos, como:

- logs de busca;
- buscas sem resultado;
- auditoria;
- jobs;
- informações de saúde operacional.

---

# 2. PRINCÍPIO GERAL

A arquitetura separará claramente:

```text
Analytics de navegação
→ Matomo
```

e:

```text
Logs operacionais e funcionais
→ PostgreSQL
```

Não será criado um mecanismo paralelo de analytics de navegação dentro do banco principal do Portal FUMEP.

---

# 3. HOSPEDAGEM

O Matomo será hospedado na infraestrutura Ubuntu institucional.

Não haverá dependência obrigatória de serviço de analytics externo.

A arquitetura deverá permitir funcionamento integral dentro da infraestrutura própria.

---

# 4. ARQUITETURA RESUMIDA

```text
VISITANTE
   │
   ▼
Next.js
   │
   ▼
Matomo Tracker
   │
   ▼
Matomo
   │
   ▼
Banco do Matomo
   │
   ▼
API Matomo
   │
   ▼
Dashboard do CMS
```

---

# 5. FONTE DE VERDADE

Para métricas de navegação:

```text
Matomo
= fonte de verdade
```

Para dados de busca:

```text
PostgreSQL
= fonte de verdade
```

Para auditoria:

```text
PostgreSQL
= fonte de verdade
```

Para jobs:

```text
BullMQ / Redis
+
logs operacionais
```

---

# 6. MÉTRICAS DA DASHBOARD

A Dashboard administrativa deverá apresentar inicialmente:

```text
Acessos totais

Visitantes únicos

Páginas mais acessadas

Notícias mais acessadas

Cursos mais acessados

Eventos mais acessados

Instituição mais acessada

Dispositivos

Origem dos acessos

Termos mais pesquisados

Buscas sem resultado
```

---

# 7. ACESSOS TOTAIS

A métrica deverá permitir visualizar quantidade de acessos no período selecionado.

Filtros institucionais serão aplicados conforme permissão do usuário.

---

# 8. VISITANTES ÚNICOS

A Dashboard poderá apresentar quantidade estimada de visitantes únicos no período.

A definição técnica seguirá a forma como o Matomo consolida essa métrica.

---

# 9. PÁGINAS MAIS ACESSADAS

Deverão ser apresentadas páginas com maior número de acessos.

Exemplos:

```text
Home FUMEP
Home ETMSL
Estágio
Sobre a FUMEP
```

---

# 10. NOTÍCIAS MAIS ACESSADAS

A Dashboard deverá permitir identificar notícias com maior volume de visualização.

Esses dados poderão auxiliar a equipe de Marketing a entender o interesse do público.

---

# 11. CURSOS MAIS ACESSADOS

As páginas de curso deverão permitir análise por volume de visualização.

---

# 12. EVENTOS MAIS ACESSADOS

Eventos publicados poderão ser classificados por visualizações.

Não será necessário criar tracking específico adicional se a própria visualização da página já for suficiente.

---

# 13. INSTITUIÇÃO MAIS ACESSADA

A Dashboard poderá comparar:

```text
FUMEP
ETMSL
CRAMAM
```

com base nas páginas e conteúdos pertencentes a cada instituição.

---

# 14. DISPOSITIVOS

Deverão ser apresentados dados agregados sobre dispositivos.

Exemplo:

```text
Desktop
Tablet
Celular
```

---

# 15. ORIGEM DOS ACESSOS

A Dashboard poderá apresentar origem agregada do tráfego.

Exemplos:

```text
Acesso direto
Mecanismos de busca
Links de referência
```

---

# 16. TERMOS MAIS PESQUISADOS

Essa métrica será obtida do PostgreSQL, por meio de:

```text
search_query_logs
```

Não dependerá do Matomo.

---

# 17. BUSCAS SEM RESULTADO

Também serão obtidas do PostgreSQL.

Critério:

```text
results_count = 0
```

Essa informação poderá indicar necessidade de criação ou melhoria de conteúdo.

---

# 18. EVENTOS NÃO RASTREADOS NA V1

A V1 não realizará tracking específico de:

```text
downloads de PDFs
```

nem de:

```text
cliques em links externos
```

Esses dados poderão ser incorporados futuramente se houver necessidade.

---

# 19. ESCOPO DE ACESSO — ADMIN

Usuário:

```text
ADMIN
```

poderá visualizar analytics de todas as instituições.

Filtros disponíveis:

```text
Todas
FUMEP
ETMSL
CRAMAM
```

---

# 20. ESCOPO DE ACESSO — EDITOR

Usuário:

```text
EDITOR
```

também poderá acessar a área de Analytics.

Entretanto, o acesso será limitado às instituições autorizadas.

---

# 21. EDITOR COM MÚLTIPLAS INSTITUIÇÕES

Exemplo:

```text
Editor:
ETMSL
CRAMAM
```

poderá visualizar:

```text
Todas autorizadas
ETMSL
CRAMAM
```

Não poderá consultar dados exclusivos da FUMEP.

---

# 22. AUTORIZAÇÃO

A autorização será validada no NestJS.

O frontend poderá ocultar filtros não autorizados, mas isso não será considerado mecanismo de segurança.

Fluxo:

```text
Request
↓
SessionGuard
↓
InstitutionGuard
↓
AnalyticsService
↓
Matomo / PostgreSQL
```

---

# 23. FILTROS DE PERÍODO

A Dashboard deverá oferecer:

```text
Hoje
7 dias
30 dias
Este ano
Personalizado
```

---

# 24. PERÍODO PERSONALIZADO

Quando selecionado:

```text
Personalizado
```

o usuário poderá informar:

```text
Data inicial
Data final
```

O backend validará o intervalo.

---

# 25. FILTROS POR INSTITUIÇÃO

Para ADMIN:

```text
Todas
FUMEP
ETMSL
CRAMAM
```

Para EDITOR:

```text
Somente instituições autorizadas
```

---

# 26. DASHBOARD

A Dashboard administrativa deverá priorizar visualização simples.

Não deverá reproduzir toda a interface administrativa do Matomo.

O Portal FUMEP consumirá apenas métricas relevantes para o trabalho editorial.

---

# 27. MATOMO COMO SERVIÇO INTERNO

O usuário do CMS não precisará acessar diretamente o painel completo do Matomo para consultar as métricas principais.

Fluxo:

```text
CMS
↓
NestJS
↓
AnalyticsService
↓
Matomo API
```

---

# 28. ANALYTICSSERVICE

A API deverá possuir uma camada dedicada:

```text
AnalyticsService
```

Responsável por:

- consultar Matomo;
- aplicar filtros de instituição;
- aplicar período;
- combinar métricas com dados do PostgreSQL;
- entregar respostas padronizadas ao frontend.

---

# 29. ADAPTER DO MATOMO

Recomenda-se encapsular a integração.

Estrutura conceitual:

```text
AnalyticsService
↓
MatomoAdapter
↓
Matomo API
```

---

# 30. DADOS DO POSTGRESQL

O AnalyticsService também poderá consultar:

```text
SearchAnalyticsRepository
```

para:

- termos mais pesquisados;
- buscas sem resultado.

Arquitetura:

```text
AnalyticsService
├── MatomoAdapter
└── SearchAnalyticsRepository
```

---

# 31. API ADMINISTRATIVA

Endpoints conceituais:

```text
GET /api/v1/admin/analytics/overview
GET /api/v1/admin/analytics/top-pages
GET /api/v1/admin/analytics/top-articles
GET /api/v1/admin/analytics/top-courses
GET /api/v1/admin/analytics/top-events
GET /api/v1/admin/analytics/devices
GET /api/v1/admin/analytics/referrers
GET /api/v1/admin/analytics/searches
```

A estrutura final poderá agrupar algumas dessas métricas em menos endpoints.

---

# 32. PARÂMETROS

Exemplos:

```text
institution
from
to
```

Todos deverão ser validados com Zod.

---

# 33. OPENAPI

As rotas de Analytics deverão ser documentadas no contrato OpenAPI.

---

# 34. CACHE

Consultas de Analytics poderão utilizar cache curto em Redis.

Exemplo:

```text
analytics:overview:etmsl:2026-08-01:2026-08-31
```

Períodos históricos poderão receber cache maior.

Período atual poderá receber cache curto.

---

# 35. PRIVACIDADE

A Dashboard deverá trabalhar predominantemente com métricas agregadas.

O objetivo é entender utilização do portal, não identificar individualmente visitantes.

---

# 36. DADOS PESSOAIS

Não será necessário exibir ao Editor:

- IP individual;
- histórico individual de navegação;
- identificador individual de visitante;
- sessões específicas.

---

# 37. ANALYTICS E LGPD

A configuração do Matomo deverá considerar os requisitos institucionais de privacidade e LGPD.

Detalhes finais de retenção, anonimização e consentimento deverão ser definidos na etapa de políticas de privacidade e conformidade do portal.

---

# 38. NÃO EXPOSIÇÃO DO MATOMO

A interface administrativa do Matomo não deverá ficar exposta publicamente sem necessidade.

Preferencialmente:

```text
acesso interno
```

ou protegido por autenticação adequada.

O CMS será a principal interface de consulta para os usuários editoriais.

---

# 39. SEGURANÇA

Credenciais utilizadas pelo NestJS para consultar a API do Matomo serão armazenadas como segredo de infraestrutura.

Não serão enviadas ao navegador.

---

# 40. DEGRADAÇÃO GRACIOSA

Se o Matomo estiver temporariamente indisponível:

```text
Dashboard de analytics
→ informa indisponibilidade temporária
```

Isso não deverá afetar:

- portal público;
- publicação;
- edição;
- cursos;
- notícias;
- eventos;
- busca.

Analytics não será dependência crítica do funcionamento do portal.

---

# 41. SAÚDE DO SISTEMA

A área administrativa de saúde poderá apresentar:

```text
Matomo: Online
```

ou:

```text
Matomo: Indisponível
```

Somente para ADMIN.

---

# 42. BACKUP

Como o Matomo será hospedado na infraestrutura institucional, seus dados deverão ser incluídos nas rotinas existentes de backup quando necessário à recuperação do serviço.

A infraestrutura institucional já possui:

```text
backup diário
+
cópia em fita
```

---

# 43. RESPONSABILIDADES

## Matomo

```text
page views
visitantes
dispositivos
origens
estatísticas de navegação
```

## PostgreSQL do Portal

```text
search_query_logs
buscas sem resultado
AuditLog
dados operacionais
```

---

# 44. DECISÕES CONSOLIDADAS

Ficam definidas para Analytics V1:

```text
Matomo hospedado localmente
Sem dependência de analytics externo

Matomo como fonte de verdade
para navegação

PostgreSQL como fonte de verdade
para analytics de busca

Dashboard integrada ao CMS

ADMIN vê todas as instituições

EDITOR vê apenas instituições autorizadas

Filtros:
Hoje
7 dias
30 dias
Este ano
Personalizado

Métricas:
Acessos
Visitantes únicos
Páginas mais acessadas
Notícias mais acessadas
Cursos mais acessados
Eventos mais acessados
Instituição mais acessada
Dispositivos
Origem dos acessos
Termos mais pesquisados
Buscas sem resultado

Sem tracking específico de download de PDF
Sem tracking específico de clique externo

AnalyticsService
MatomoAdapter
Cache curto em Redis
Métricas agregadas
Analytics não crítico para funcionamento do portal
```

---

# 45. ARQUITETURA FINAL

```text
                        VISITANTE
                            │
                            ▼
                         Next.js
                            │
                     Matomo Tracker
                            │
                            ▼
                         Matomo
                            │
                     Banco Matomo
                            │
                            ▼
                       Matomo API
                            │
                            │
ADMIN / EDITOR              │
      │                     │
      ▼                     │
   Next.js                  │
      │                     │
      ▼                     │
    NestJS                  │
      │                     │
      ▼                     │
 AnalyticsService ◄─────────┘
      │
      ├──────── MatomoAdapter
      │
      └──────── SearchAnalyticsRepository
                       │
                       ▼
                   PostgreSQL
                search_query_logs
```

---

# 46. STATUS

Com este documento, a camada de **Analytics da Arquitetura Técnica V1** é considerada definida.

As decisões deverão orientar posteriormente:

- instalação do Matomo;
- integração do tracker no Next.js;
- AnalyticsService;
- MatomoAdapter;
- endpoints NestJS;
- filtros institucionais;
- schemas Zod;
- documentação OpenAPI;
- Dashboard administrativa;
- cache Redis;
- integração com `search_query_logs`;
- testes de autorização;
- testes de privacidade;
- configuração de backup.
