# MANIFESTO CANÔNICO V1 — PORTAL FUMEP

## 1. FINALIDADE

Este manifesto define o conjunto oficial de referência para implementar a V1 do Portal FUMEP.

## 2. ARQUIVOS CANÔNICOS

1. `MODELO_DE_DADOS_LOGICO_V1_PORTAL_FUMEP_CANONICO.md`
2. `ARQUITETURA TÉCNICA V1 — SEGURANÇA E CONTROLE DE ACESSO.md`
3. `ARQUITETURA TÉCNICA V1 — JOBS E PROCESSAMENTO ASSÍNCRONO.md`
4. `ARQUITETURA_TECNICA_V1_STORAGE_BIBLIOTECA_MIDIA.md`
5. `ARQUITETURA_TECNICA_V1_BUSCA_INDEXACAO.md`
6. `ARQUITETURA_TECNICA_V1_ANALYTICS.md`
7. `ARQUITETURA_TECNICA_V1_DEPLOYMENT_OBSERVABILIDADE_OPERACAO.md`
8. `ARQUITETURA_TECNICA_V1_PAGE_BUILDER_CONTENT_BLOCKS.md`
9. `ARQUITETURA_TECNICA_V1_FRONTEND_DESIGN_SYSTEM_TEMAS.md`
10. `ARQUITETURA_TECNICA_V1_INTEGRACOES_EXTERNAS_PROCESSOS_CONCURSOS.md`
11. `ARQUITETURA_TECNICA_V1_TESTES_QA.md`
12. `ARQUITETURA_TECNICA_V1_IMPLANTACAO_TRANSICAO_PRODUCAO.md`
13. `PLANO_IMPLEMENTACAO_V1_LOOPS_CANONICO.md`
14. `Modelo_Dominio_V1_Portal_FUMEP.zip`
15. `AUDITORIA_COMPLETA_ARQUITETURA_V1_PORTAL_FUMEP.md`

## 3. DECISÕES ESTRUTURAIS FINAIS

```text
Next.js
NestJS
TypeScript
REST
Zod
OpenAPI
PostgreSQL
Drizzle ORM
Redis
BullMQ
Worker separado
MinIO
Sharp
Matomo
Nginx
Docker Compose
GitHub Actions
```

## 4. REGRAS DE MODELO FINAIS

```text
Page → N:1 Institution
Article → N:N Institution
Event → N:N Institution
ContentBlock → PAGE | ARTICLE
PageVersion → SIM
ArticleVersion → SIM
PageTemplate → SIM
Gallery + GalleryItem → SIM
Menu + MenuItem → SIM
```

## 5. ARQUIVOS SUPERADOS

Não usar para implementação:

```text
Arquitetura_Tecnica_V1_Portal_FUMEP(1).md
Arquitetura_Tecnica_V1_Busca_Portal_FUMEP(1).md
```

Cópias idênticas com `(1)` também não pertencem ao pacote canônico.

## 6. PRECEDÊNCIA

```text
documento especializado canônico
↓
Plano de Implementação canônico
↓
Modelo de Dados Lógico canônico
↓
Modelo de Domínio
↓
material histórico
```

## 7. INÍCIO

A implementação começa em:

```text
LOOP 0.1 — Criar repositório e monorepo
```
