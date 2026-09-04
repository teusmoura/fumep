# ARQUITETURA TÉCNICA V1 — TESTES E QA

## 1. OBJETIVO

Este documento define a estratégia de **Testes e Quality Assurance (QA)** do Portal FUMEP.

A abordagem V1 será baseada em múltiplas camadas:

```text
Testes unitários
↓
Testes de integração
↓
Testes de contrato
↓
Testes E2E
↓
Testes de acessibilidade
↓
Testes visuais
↓
Testes de performance
↓
Testes de segurança
```

O objetivo é reduzir regressões em regras de negócio, permissões, Page Builder, publicação, busca, mídia, integrações externas, acessibilidade, frontend público e painel administrativo.

---

## 2. FERRAMENTAS PRINCIPAIS

```text
Vitest
→ testes unitários

Supertest
→ testes da API NestJS

Playwright
→ testes E2E

Zod + OpenAPI
→ testes de contrato

axe-core
→ acessibilidade automatizada

Lighthouse
→ performance e acessibilidade complementar
```

---

## 3. PRINCÍPIO DE QUALIDADE

Uma funcionalidade será considerada pronta quando houver:

```text
implementação
+
testes
+
acessibilidade
+
contrato documentado
```

---

## 4. TESTES UNITÁRIOS

Devem cobrir principalmente:

- regras de negócio;
- serviços;
- validações;
- autorização;
- transformações;
- normalização;
- adapters;
- builders de busca;
- lógica de contexto institucional.

Ferramenta principal:

```text
Vitest
```

---

## 5. TESTES DE INTEGRAÇÃO

Devem validar a interação entre:

```text
NestJS
PostgreSQL
Redis
MinIO
BullMQ
```

quando aplicável.

Supertest será usado para endpoints da API.

---

## 6. AMBIENTE DE TESTE ISOLADO

Nunca utilizar produção.

Estrutura esperada:

```text
test
├── PostgreSQL
├── Redis
├── MinIO
├── API
├── Worker
└── Web
```

O estado deverá ser reproduzível e resetável.

---

## 7. TESTES DE CONTRATO

A API será validada com:

```text
Zod
+
OpenAPI
```

Objetivo:

```text
frontend
backend
documentação
```

permanecerem compatíveis.

---

## 8. TESTES E2E

Playwright será o padrão oficial.

Fluxos obrigatórios:

```text
Login
Logout
Recuperação de senha

Admin cria página
Editor edita página
Editor adiciona bloco
Editor reordena blocos
Preview
Publicação

Criação/publicação de notícia
Cadastro/publicação de curso
Cadastro/publicação de evento

Upload de mídia
Bloqueio de exclusão de mídia em uso

Busca
Autocomplete

Processos seletivos sincronizados
Concursos sincronizados

Permissões institucionais
```

---

## 9. TESTES DE AUTENTICAÇÃO

Cobrir:

```text
login válido
senha inválida
usuário desativado
sessão expirada
logout
reset de senha
token expirado
token já usado
```

---

## 10. TESTES DE PERMISSÃO

Exemplos:

```text
Editor ETMSL
→ pode editar ETMSL
→ não pode editar CRAMAM
→ não pode editar FUMEP
```

```text
Editor ETMSL + CRAMAM
→ pode editar ETMSL
→ pode editar CRAMAM
→ não pode editar FUMEP
```

Conteúdo multi-institucional:

```text
conteúdo = ETMSL + CRAMAM
editor = apenas ETMSL
→ 403 FORBIDDEN
```

ADMIN terá acesso global conforme as regras definidas.

---

## 11. TESTES DO PAGE BUILDER

Cada bloco deverá ser testado em:

```text
schema
editor
renderer
```

Também deverá existir teste de compatibilidade entre versões:

```text
HERO v1
continua renderizando
mesmo após existir HERO v2
```

---

## 12. TESTES DE PUBLICAÇÃO

Cenários obrigatórios:

```text
bloco válido
→ publicação permitida

imagem informativa sem alt
→ publicação bloqueada

anchor duplicado
→ publicação bloqueada

mídia inexistente
→ publicação bloqueada

bloco inválido
→ publicação bloqueada
```

Rascunhos poderão permanecer incompletos quando permitido.

---

## 13. TESTES DE PREVIEW

Verificar:

```text
preview mostra versão de trabalho
preview não usa cache público
preview exige autenticação
preview respeita autorização
preview não publica conteúdo
```

---

## 14. TESTES DE VERSIONAMENTO

Cobrir:

```text
criação de PageVersion
snapshot completo
imutabilidade
visualização de histórico
```

---

## 15. TESTES DE MÍDIA

Cobrir:

```text
upload válido
tipo inválido
MIME inválido
magic bytes inválidos
SVG bloqueado
PDF inválido
imagem acima do limite
PDF acima do limite
```

Também:

```text
arquivo novo
arquivo duplicado
Use existing
Upload anyway
```

---

## 16. MEDIAUSAGE

Cenário:

```text
mídia em uso
↓
tentativa de exclusão
↓
exclusão bloqueada
```

---

## 17. PROCESSAMENTO DE IMAGENS

Testar estados:

```text
PENDING
PROCESSING
READY
FAILED
```

e geração de variantes quando aplicável.

---

## 18. TESTES DE BUSCA

A busca deverá ter testes funcionais e de relevância.

Exemplo:

```text
consulta:
informática
```

Esperado:

```text
Técnico em Informática
```

acima de uma notícia que apenas mencione a palavra no corpo.

Também:

```text
informatica
→ encontra Informática
```

e:

```text
informatca
→ encontra Informática
```

quando a similaridade for suficiente.

---

## 19. AUTOCOMPLETE

Testar:

```text
0, 1 ou 2 caracteres
→ sem pesquisa completa

3 caracteres
→ sugestões
```

Máximo:

```text
8 sugestões
```

---

## 20. FILTROS DE BUSCA

Cobrir:

```text
instituição
tipo
período
combinação de filtros
```

---

## 21. DOCUMENTOS NA BUSCA

Validar que PDFs sejam encontrados apenas por:

```text
título
descrição
nome
categoria
instituição
contexto
```

e não por conteúdo interno.

---

## 22. TESTES DE INTEGRAÇÃO EXTERNA

Cenários obrigatórios:

```text
API funcionando
→ sincroniza

API indisponível
→ mantém último estado válido

item desaparece de resposta válida
→ oculta imediatamente

resposta inválida
→ não oculta registros

sync repetida
→ idempotente
```

O Portal não deverá reinterpretar o status externo.

---

## 23. TESTES DE JOBS

Jobs críticos:

```text
PROCESS_MEDIA
PUBLISH_CONTENT
EXPIRE_CONTENT
REINDEX_SEARCH
INVALIDATE_CACHE
SYNC_SELECTION_PROCESSES
SYNC_CONTESTS
```

Devem ter testes de:

```text
idempotência
retry
falha permanente
concorrência
```

---

## 24. TESTES DE ACESSIBILIDADE

Estratégia:

```text
axe-core
+
Playwright
+
verificação manual
```

Fluxos críticos:

```text
skip link
drawer
focus trap
teclado
autocomplete
tabs
accordion
formulários
contraste
alt
mensagens de erro
```

---

## 25. TEMAS

Testar:

```text
FUMEP Light
FUMEP Dark

ETMSL Light
ETMSL Dark

CRAMAM Light
CRAMAM Dark
```

Também:

```text
SYSTEM
LIGHT
DARK
preferência manual do visitante
prefers-reduced-motion
```

---

## 26. TESTES RESPONSIVOS

Viewports mínimos:

```text
320px
375px
768px
1024px
1280px+
```

---

## 27. TESTES VISUAIS

Screenshots visuais serão utilizados apenas para pontos críticos.

Exemplos:

```text
Header
Drawer
Home FUMEP
Home ETMSL
Home CRAMAM
Página de curso
Página de notícia
Página de busca
Page Builder Preview
HERO
CARDS
IMAGE_TEXT
Footer
```

Não haverá snapshot visual indiscriminado de todo o portal.

---

## 28. PERFORMANCE

Lighthouse será usado como ferramenta complementar.

Avaliar:

```text
LCP
CLS
INP
peso de JavaScript
peso de imagens
tempo de carregamento
```

Os limites rígidos finais serão definidos após a primeira implementação real.

Lighthouse completo poderá rodar em workflow separado, staging ou release.

---

## 29. TESTES DE SEGURANÇA

Cobrir:

```text
sessão
CSRF
permissões
rate limiting
upload inválido
XSS
javascript: em links
iframe não permitido
preview sem sessão
health como Editor
```

Exemplo:

```text
EDITOR
→ GET /admin/system/health
→ 403
```

```text
ADMIN
→ GET /admin/system/health
→ 200
```

---

## 30. FIXTURES

Usuários:

```text
Admin
Editor FUMEP
Editor ETMSL
Editor CRAMAM
Editor ETMSL + CRAMAM
```

Conteúdo:

```text
página publicada
página em rascunho
notícia
curso
evento
mídia em uso
mídia livre
processo seletivo
concurso
```

Fixtures deverão ser determinísticas.

---

## 31. MOCKS DE APIs EXTERNAS

Cenários:

```text
200 válido
500
timeout
payload inválido
item removido
```

---

## 32. CI — GITHUB ACTIONS

Fluxo de Pull Request:

```text
checkout
↓
install
↓
lint
↓
typecheck
↓
unit tests
↓
integration tests
↓
contract tests
↓
build
↓
E2E
↓
acessibilidade básica
```

---

## 33. MAIN PROTEGIDA

Nenhum merge em:

```text
main
```

será permitido se os checks obrigatórios estiverem falhando.

Branch protection deverá exigir status checks aprovados.

---

## 34. CHECKS OBRIGATÓRIOS

Inicialmente:

```text
lint
typecheck
unit
integration
contract
build
E2E crítico
acessibilidade automatizada crítica
```

---

## 35. TESTES MAIS PESADOS

Podem rodar em pipelines específicas:

```text
Lighthouse completo
grande suíte visual
performance extensa
```

---

## 36. RELATÓRIOS

GitHub Actions deverá preservar:

```text
Playwright report
screenshots de falha
traces
coverage quando aplicável
```

---

## 37. COVERAGE

Cobertura poderá ser medida, mas não será tratada como único indicador de qualidade.

Prioridade de cobertura:

```text
autorização
publicação
busca
mídia
integrações
jobs
versionamento
```

---

## 38. CONCORRÊNCIA

Exemplo:

```text
Editor A altera página
Editor B salva versão antiga
→ 409 CONFLICT
```

---

## 39. AUDITLOG

Ações sensíveis deverão gerar os eventos esperados em AuditLog.

---

## 40. NÃO VAZAMENTO DE DADOS

Testes deverão garantir que respostas e logs não exponham:

```text
senhas
tokens
session id bruto
segredos
stack traces públicas
```

---

## 41. SEO

Páginas públicas principais deverão validar:

```text
title
description
canonical
Open Graph
```

---

## 42. TESTES DE 404 E 500

Cobrir:

```text
página inexistente
curso fechado
processo oculto
concurso oculto
```

Erros 500 não poderão expor detalhes técnicos.

---

## 43. CACHE

Validar que conteúdo recém-publicado apareça após invalidação.

---

## 44. PREVIEW × PÚBLICO

Garantir:

```text
rascunho
→ preview mostra

rascunho
→ público não mostra
```

---

## 45. PUBLICAÇÃO AGENDADA E EXPIRAÇÃO

Quando implementadas:

```text
antes da data
→ não público

após job válido
→ público
```

e:

```text
conteúdo expira
↓
não aparece publicamente
↓
índice atualizado
↓
cache invalidado
```

---

## 46. CRITÉRIO DE ACEITE

Uma entrega deverá atender:

```text
código implementado
testes relevantes aprovados
lint aprovado
typecheck aprovado
build aprovado
acessibilidade crítica aprovada
contrato atualizado
sem regressões conhecidas
```

---

## 47. DEFINITION OF DONE

```text
DONE
=
funcionalidade
+
testes
+
documentação
+
acessibilidade
+
segurança básica
```

---

## 48. QA MANUAL

Automação não substitui validação manual.

QA manual deverá cobrir:

```text
usabilidade
clareza editorial
acessibilidade não detectável automaticamente
comportamento visual
fluxos novos
```

---

## 49. STAGING

Quando disponível, staging será o ambiente preferencial para:

```text
validação visual
Lighthouse
QA manual
integrações
testes de release
```

---

## 50. MATRIZ DE CRITICIDADE

```text
CRÍTICO
→ autenticação
→ autorização
→ publicação
→ banco
→ mídia
→ busca
→ integrações
→ migrations

ALTO
→ Page Builder
→ cursos
→ eventos
→ notícias

MÉDIO
→ componentes visuais
→ filtros secundários

BAIXO
→ detalhes cosméticos sem impacto funcional
```

Bugs críticos bloquearão release.

---

## 51. ARQUITETURA RESUMIDA

```text
                     DESENVOLVIMENTO
                           │
                           ▼
                        Vitest
                           │
                           ▼
                       Supertest
                           │
                           ▼
                      Contract Tests
                           │
                           ▼
                        Build
                           │
                           ▼
                       Playwright
                           │
                  ┌────────┼────────┐
                  │        │        │
                  ▼        ▼        ▼
                 E2E   axe-core  Visual
                  │        │        │
                  └────────┼────────┘
                           ▼
                    GitHub Actions
                           │
                    checks aprovados?
                     │           │
                    NÃO         SIM
                     │           │
                     ▼           ▼
               merge bloqueado   main
```

---

## 52. DECISÕES CONSOLIDADAS

Ficam definidas para Testes e QA V1:

```text
Vitest para unitários
Supertest para API
Playwright como padrão E2E
Zod + OpenAPI para contratos
axe-core para acessibilidade automatizada
Lighthouse como ferramenta complementar

PostgreSQL de teste isolado
Redis de teste isolado
MinIO de teste isolado

Fixtures determinísticas
Mocks para APIs externas

Testes específicos de autorização
Testes completos do Page Builder
Testes de publicação
Testes de MediaUsage
Testes de relevância da busca
Testes de integrações externas
Testes de idempotência de jobs
Testes de concorrência
Testes de segurança
Testes de acessibilidade
Testes responsivos

Screenshots visuais apenas para pontos críticos

Nenhum merge na main com testes obrigatórios falhando

Branch protection
CI obrigatória
Relatórios Playwright
Traces e screenshots de falha

QA manual complementar

Definition of Done incluindo testes,
acessibilidade e contrato
```

---

## 53. STATUS

Com este documento, a camada de **Testes e QA da Arquitetura Técnica V1** é considerada definida.

As decisões deverão orientar posteriormente:

- configuração Vitest;
- configuração Playwright;
- Supertest;
- axe-core;
- Lighthouse;
- containers de teste;
- fixtures;
- mocks;
- GitHub Actions;
- branch protection;
- relatórios;
- critérios de aceite;
- QA manual;
- release process.
