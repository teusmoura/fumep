# PLANO DE IMPLEMENTAÇÃO V1 — DESENVOLVIMENTO EM LOOPS

## STATUS CANÔNICO

Esta versão incorpora as correções da auditoria e passa a ser o roteiro oficial de implementação da V1.

Correções incorporadas:

- removido `PageInstitution`;
- adicionados `Menu` e `MenuItem`;
- adicionado `PageTemplate`;
- adicionado `QUICK_LINKS`;
- adicionados `Gallery`, `GalleryItem` e `GALLERY_FEED`;
- `ArticleVersion` mantido explicitamente;
- configuração real de logos movida para depois da Biblioteca de Mídia;
- BullMQ + Worker permanecem como arquitetura final.

---

## 1. OBJETIVO

Este documento transforma a Arquitetura Técnica V1 do Portal FUMEP em uma sequência prática de desenvolvimento.

A implementação deverá ocorrer em **loops pequenos, verificáveis e cumulativos**.

Cada loop deverá:

```text
ter objetivo limitado
↓
implementar uma parte pequena
↓
executar testes
↓
validar manualmente
↓
corrigir
↓
commit
↓
seguir
```

A regra principal é:

> **Não avançar para o próximo loop enquanto o loop atual não estiver funcional e com os checks obrigatórios aprovados.**

---

# 2. REGRA DE EXECUÇÃO DOS LOOPS

Cada loop deverá conter:

```text
Objetivo
Pré-requisitos
O que implementar
O que NÃO implementar
Testes obrigatórios
Critério de aceite
```

Sempre que possível, um loop deverá resultar em algo observável e testável.

---

# 3. CHECKS PADRÃO

Ao final de cada loop aplicável:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Quando E2E já estiver disponível:

```text
pnpm test:e2e
```

Se qualquer check obrigatório falhar:

```text
NÃO avançar
```

---

# 4. FASES

```text
FASE 0 — Fundação
FASE 1 — Banco e domínio base
FASE 2 — Autenticação e autorização
FASE 3 — Instituições e temas
FASE 4 — Biblioteca de mídia
FASE 5 — Page Builder
FASE 6 — Publicação e versionamento
FASE 7 — Frontend público
FASE 8 — Notícias
FASE 9 — Cursos
FASE 10 — Eventos
FASE 11 — Galerias e Estágio
FASE 12 — Busca
FASE 13 — Integrações externas
FASE 14 — Analytics
FASE 15 — Saúde e operação
FASE 16 — QA, segurança e homologação
```

---

# FASE 0 — FUNDAÇÃO

## LOOP 0.1 — Criar repositório e monorepo

### Objetivo
Criar a estrutura inicial do projeto.

### Implementar

```text
portal-fumep/
├── apps/
├── packages/
├── infra/
├── docs/
└── .github/
```

### Não implementar
- banco;
- autenticação;
- frontend funcional;
- Docker completo.

### Teste
Repositório abre e instala dependências.

### Aceite
Estrutura versionada e documentada.

---

## LOOP 0.2 — Configurar pnpm workspace

### Implementar
- `pnpm-workspace.yaml`;
- workspace raíz;
- scripts comuns.

### Não implementar
Turborepo ainda, se não for necessário.

### Aceite

```text
pnpm install
```

executa sem erros.

---

## LOOP 0.3 — Configurar TypeScript central

### Implementar
- `tsconfig.base.json`;
- strict mode;
- aliases básicos.

### Aceite

```text
pnpm typecheck
```

funciona no workspace.

---

## LOOP 0.4 — Criar apps/web

### Implementar
Projeto Next.js mínimo.

### Não implementar
Design System.

### Aceite
Página padrão abre localmente.

---

## LOOP 0.5 — Criar apps/api

### Implementar
NestJS mínimo.

### Aceite

```text
GET /api/v1/health
→ 200
```

---

## LOOP 0.6 — Criar apps/worker

### Implementar
Worker TypeScript mínimo.

### Não implementar
BullMQ ainda.

### Aceite
Processo inicia sem erro.

---

## LOOP 0.7 — Criar packages/db

### Implementar
Pacote vazio preparado para Drizzle.

### Aceite
Importável por `apps/api`.

---

## LOOP 0.8 — Criar packages/validation

### Implementar
Pacote compartilhado com Zod.

### Aceite
Schema simples compartilhado entre web e API.

---

## LOOP 0.9 — Criar packages/ui

### Implementar
Pacote inicial de UI.

### Aceite
Componente simples renderizado pelo Next.js.

---

## LOOP 0.10 — Configurar lint e formatter

### Implementar
- ESLint;
- formatter adotado pelo projeto;
- scripts comuns.

### Aceite

```text
pnpm lint
```

verde.

---

## LOOP 0.11 — Configurar Docker Compose de desenvolvimento

### Implementar
Primeiro `docker-compose.dev.yml`.

### Serviços
Ainda apenas:

```text
postgres
redis
minio
```

### Aceite
Todos sobem.

---

## LOOP 0.12 — PostgreSQL

### Implementar
- container;
- volume;
- healthcheck;
- variável de ambiente.

### Aceite
API consegue conectar.

---

## LOOP 0.13 — Redis

### Implementar
- container;
- autenticação quando aplicável;
- persistência;
- healthcheck.

### Aceite
API consegue `PING`.

---

## LOOP 0.14 — MinIO

### Implementar
- container;
- volume;
- bucket inicial;
- healthcheck.

### Aceite
API consegue acessar storage.

---

## LOOP 0.15 — Health básico

### Implementar
`GET /api/v1/health`.

### Resposta pública

```json
{"status":"ok"}
```

### Aceite
Endpoint não expõe detalhes internos.

---

## LOOP 0.16 — GitHub Actions CI inicial

### Implementar

```text
install
lint
typecheck
test
build
```

### Aceite
PR executa CI.

---

## LOOP 0.17 — Branch protection

### Implementar
Configuração da `main`.

### Aceite
Merge bloqueado se checks falharem.

---

# FASE 1 — BANCO E DOMÍNIO BASE

## LOOP 1.1 — Configurar Drizzle

### Implementar
- conexão;
- config;
- migrations;
- primeiro comando de migration.

### Aceite
Migration vazia executa em banco de desenvolvimento.

---

## LOOP 1.2 — Institution

### Implementar
Tabela e modelagem `Institution`.

Campos essenciais:

```text
id
name
slug
is_active
created_at
updated_at
```

### Não implementar
Theme completo.

### Testes
CRUD de repository.

---

## LOOP 1.3 — User

### Implementar
Tabela `User`.

Campos:

```text
id
name
email
password_hash
role
is_active
created_at
updated_at
```

### Não implementar
Login ainda.

---

## LOOP 1.4 — UserInstitution

### Implementar
Relação N:N.

### Aceite
Usuário pode pertencer a múltiplas instituições.

---

## LOOP 1.5 — Page

### Implementar
Tabela `Page`.

### Campos mínimos

```text
id
title
slug
status
created_by
updated_by
created_at
updated_at
```

---

## LOOP 1.6 — Regra Page N:1 Institution

### Implementar
Completar `Page` com:

```text
institution_id UUID NOT NULL
```

e garantir:

```text
UNIQUE(institution_id, slug)
```

### Não implementar
Não criar `PageInstitution` ou qualquer relação N:N para páginas na V1.

### Teste
Duas instituições podem ter o mesmo slug; uma mesma instituição não pode repetir o slug.

### Aceite
Cada página pertence a exatamente uma instituição.

---

## LOOP 1.7 — ContentBlock

### Implementar

```text
id
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

---

## LOOP 1.8 — PageVersion

### Implementar
Snapshot imutável da página.

---

## LOOP 1.9 — AuditLog

### Implementar
Estrutura inicial.

### Não implementar
Todos os eventos ainda.

---

## LOOP 1.10 — Redirect

### Implementar
Tabela simples para redirecionamentos futuros.

---

# FASE 2 — AUTENTICAÇÃO E AUTORIZAÇÃO

## LOOP 2.1 — Argon2id

### Implementar
Serviço de hash e verificação de senha.

### Teste
Hash nunca igual à senha em texto.

---

## LOOP 2.2 — Login

### Implementar

```text
POST /api/v1/auth/login
```

### Aceite
Credenciais válidas criam sessão.

---

## LOOP 2.3 — Sessão Redis

### Implementar
Sessão server-side.

### Cookie
- HttpOnly;
- Secure em produção;
- SameSite Lax.

---

## LOOP 2.4 — GET session

### Implementar

```text
GET /api/v1/auth/session
```

---

## LOOP 2.5 — Logout

### Implementar

```text
POST /api/v1/auth/logout
```

### Aceite
Sessão removida do Redis.

---

## LOOP 2.6 — SessionGuard

### Implementar
Proteção de endpoints autenticados.

---

## LOOP 2.7 — RoleGuard

### Implementar
Papéis:

```text
ADMIN
EDITOR
```

---

## LOOP 2.8 — InstitutionGuard

### Implementar
Validação de escopo institucional.

---

## LOOP 2.9 — Testes de permissão simples

### Cenários

```text
Editor ETMSL
→ acesso ETMSL
→ 200

Editor ETMSL
→ acesso CRAMAM
→ 403
```

---

## LOOP 2.10 — Conteúdo multi-institucional

### Regra
Editor precisa ter permissão em todas as instituições vinculadas.

---

## LOOP 2.11 — CSRF

### Implementar
Proteção de métodos mutáveis.

---

## LOOP 2.12 — Rate limiting de login

### Implementar
Política inicial.

---

## LOOP 2.13 — Forgot password

### Implementar

```text
POST /auth/forgot-password
```

Resposta neutra.

---

## LOOP 2.14 — Password reset tokens

### Implementar
Tabela + token hash + expiração.

---

## LOOP 2.15 — Reset password

### Implementar

```text
POST /auth/reset-password
```

### Aceite
Token:
- único;
- single-use;
- expirável.

---

## LOOP 2.16 — Invalidar sessões após reset

### Implementar
Todas as sessões do usuário são removidas.

---

# FASE 3 — INSTITUIÇÕES E TEMAS

## LOOP 3.1 — CRUD administrativo de Institution

### Acesso
ADMIN apenas.

---

## LOOP 3.2 — InstitutionSetting

### Implementar

```text
address
phone
email
social_links
footer_links
appearance_default
```

---

## LOOP 3.3 — Theme

### Implementar campos iniciais:

```text
primary
primary_foreground
accent
accent_foreground
```

---

## LOOP 3.4 — Preparar configuração de logos

### Implementar
Preparar contratos/configurações institucionais para logos sem exigir upload ainda.

### Não implementar
Não criar vínculo funcional com Media antes da Fase 4.

### Aceite
A instituição permanece válida mesmo sem logos cadastrados.

---

## LOOP 3.5 — appearance_default

### Enum

```text
SYSTEM
LIGHT
DARK
```

---

## LOOP 3.6 — ThemeContext no frontend

### Implementar
Tema mínimo resolvido por instituição.

---

## LOOP 3.7 — InstitutionContext

### Implementar

```text
/
→ FUMEP

/etmsl
→ ETMSL

/cramam
→ CRAMAM
```

---

## LOOP 3.8 — Dark mode

### Implementar
Prioridade:

```text
preferência manual
↓
ADMIN
↓
sistema
```

---

## LOOP 3.9 — Testes de contraste

### Implementar
Validação para cores configuráveis.

---

# FASE 4 — BIBLIOTECA DE MÍDIA

## LOOP 4.1 — Media

### Implementar tabela.

Campos essenciais:

```text
id
filename
original_filename
mime_type
size
storage_key
checksum_sha256
processing_status
processing_error
created_by
created_at
```

---

## LOOP 4.2 — Upload de imagem

### Implementar
Browser → NestJS → MinIO → PostgreSQL.

---

## LOOP 4.3 — Validação de imagem

### Testar
- extensão;
- MIME;
- magic bytes;
- tamanho máximo.

---

## LOOP 4.4 — SHA-256

### Implementar
Checksum obrigatório.

---

## LOOP 4.5 — Duplicata

### Fluxo

```text
checksum já existe
↓
avisar
↓
Use existing
ou
Upload anyway
```

---

## LOOP 4.6 — BullMQ

### Implementar
Fila `media`.

---

## LOOP 4.7 — PROCESS_MEDIA

### Implementar
Worker recebe job.

---

## LOOP 4.8 — Sharp

### Implementar
Processamento de imagem.

---

## LOOP 4.9 — MediaVariant

### Criar:

```text
WebP
AVIF
thumbnail
```

---

## LOOP 4.10 — Status de processamento

### Cobrir

```text
PENDING
PROCESSING
READY
FAILED
```

---

## LOOP 4.11 — Upload de PDF

### Implementar
PDF até 30 MB.

---

## LOOP 4.12 — Bloquear SVG editorial

### Teste
Upload `.svg` por Editor → rejeitado.

---

## LOOP 4.13 — MediaCategory

### Implementar
Categorias.

---

## LOOP 4.14 — Busca da biblioteca

### Implementar
Busca por:
- nome;
- alt;
- caption;
- categoria.

---

## LOOP 4.15 — MediaUsage

### Implementar
Rastrear uso.

---

## LOOP 4.16 — Bloqueio de exclusão

### Cenário
Mídia em uso → exclusão bloqueada.

---

## LOOP 4.17 — Logos institucionais via Media

### Implementar

```text
logo_light_id
logo_dark_id
```

como referências nullable a `Media`.

### Implementar também
- seleção pela Biblioteca;
- MediaUsage;
- validação do tipo de mídia;
- fallback quando não houver logo dark.

### Aceite
FUMEP, ETMSL e CRAMAM selecionam logos pela Biblioteca sem duplicar arquivos.

---

# FASE 5 — PAGE BUILDER

## LOOP 5.1 — BlockRegistry

### Implementar
Registry vazio + infraestrutura.

---

## LOOP 5.2 — Schema comum dos blocos

### Implementar
- id;
- type;
- position;
- isVisible;
- schemaVersion;
- background;
- anchor.

---

## LOOP 5.3 — TEXT v1

### Implementar
Schema Zod.

---

## LOOP 5.4 — TEXT editor

### Implementar
Editor visual.

---

## LOOP 5.5 — TEXT renderer

### Implementar
Renderer público.

---

## LOOP 5.6 — HERO v1

### Implementar
Somente imagem.

---

## LOOP 5.7 — HERO editor e renderer

### Validar
alt e CTA.

---

## LOOP 5.8 — IMAGE v1

### Implementar
Media + alt + caption.

---

## LOOP 5.9 — Page Builder básico

### Implementar
Adicionar:

```text
TEXT
HERO
IMAGE
```

---

## LOOP 5.10 — Reordenação

### Implementar
Drag-and-drop.

### Alternativa acessível
Botões subir/descer.

---

## LOOP 5.11 — Duplicar bloco

### Implementar
Novo ID.

---

## LOOP 5.12 — Ocultar/exibir

### Implementar
`is_visible`.

---

## LOOP 5.13 — Excluir bloco

### Implementar
Atualizar MediaUsage.

---

## LOOP 5.14 — Anchors

### Implementar
Slug + unicidade.

---

## LOOP 5.15 — Backgrounds

### Implementar

```text
DEFAULT
LIGHT
INSTITUTION
IMAGE
```

---

## LOOP 5.16 — IMAGE_TEXT

### Implementar

```text
IMAGE_LEFT
IMAGE_RIGHT
```

---

## LOOP 5.17 — CARDS

### Implementar
Somente imagem.

Limite 12.

---

## LOOP 5.18 — QUICK_LINKS

### Implementar
Bloco de links rápidos com ícones controlados pelo sistema.

### Não implementar
- SVG arbitrário;
- HTML livre;
- biblioteca externa de ícones fornecida pelo Editor.

### Testes
- limites;
- URLs;
- teclado;
- foco;
- contraste.

### Aceite
QUICK_LINKS disponível no Registry, Editor e Renderer.

---

## LOOP 5.19 — CTA

### Implementar.

---

## LOOP 5.20 — SPACER

### Implementar

```text
SMALL
MEDIUM
LARGE
```

---

## LOOP 5.21 — FAQ

### Implementar
Limite 30.

---

## LOOP 5.22 — TABS

### Implementar
Limite 8.

---

## LOOP 5.23 — TABLE

### Implementar
Tabela estruturada.

---

## LOOP 5.24 — TIMELINE

### Implementar.

---

## LOOP 5.25 — STATISTICS

### Implementar.
Limite 12.

---

## LOOP 5.26 — CAROUSEL

### Implementar.
Limite 10.

---

## LOOP 5.27 — MAP

### Implementar
Campos estruturados.

---

## LOOP 5.28 — VIDEO

### Implementar
YouTube/Vimeo apenas.

---

## LOOP 5.29 — DOCUMENT

### Implementar
PDF da Media Library.

---

## LOOP 5.30 — Registry completo

### Aceite
Todos os blocos V1 registrados e validados.

---

## LOOP 5.31 — PageTemplate schema

### Implementar
Tabela `page_templates` com `blocks_snapshot` e escopo institucional opcional.

### Aceite
Template global ou institucional pode ser persistido.

---

## LOOP 5.32 — CRUD de PageTemplate

### Acesso
ADMIN.

### Implementar
- criar;
- editar metadados;
- ativar/desativar;
- visualizar snapshot.

### Aceite
Editor não recebe permissão de gerenciamento de templates.

---

## LOOP 5.33 — Criar página a partir de template

### Implementar
Copiar `blocks_snapshot` e gerar novos IDs de ContentBlock.

### Teste
Alteração posterior do template não modifica a página criada.

### Aceite
Página criada é independente do template.

---

## LOOP 5.34 — GALLERY_FEED registry

### Implementar
Registrar tipo, schema e editor de configuração do `GALLERY_FEED`.

### Observação
A consulta real será ativada na Fase 11, quando `Gallery` e `GalleryItem` existirem.

### Aceite
Registry valida o bloco sem depender ainda de dados de galeria.

---

# FASE 6 — PUBLICAÇÃO E VERSIONAMENTO

## LOOP 6.1 — Salvar rascunho

### Implementar
Página pode existir incompleta.

---

## LOOP 6.2 — Preview

### Implementar
Versão de trabalho autenticada.

---

## LOOP 6.3 — Renderer compartilhado

### Aceite
Preview e público usam mesmos componentes.

---

## LOOP 6.4 — Validação de publicação

### Implementar
Validar todos os blocos.

---

## LOOP 6.5 — Acessibilidade de imagem

### Regra

```text
informativa sem alt
→ bloqueia publicação
```

---

## LOOP 6.6 — PageVersion

### Implementar
Snapshot completo.

---

## LOOP 6.7 — Publish

### Implementar
Mudança de estado.

---

## LOOP 6.8 — Histórico

### Implementar
Visualização de versões antigas.

---

## LOOP 6.9 — Optimistic concurrency

### Implementar
409 em edição concorrente.

---

## LOOP 6.10 — AuditLog de Page Builder

### Implementar eventos principais.

---

## LOOP 6.11 — Menu

### Implementar
Tabela `menus`.

### Regra

```text
UNIQUE(institution_id, location)
```

### Aceite
Cada instituição possui menu independente na localização suportada.

---

## LOOP 6.12 — MenuItem

### Implementar

```text
parent_id
label
type
page_id
url
position
is_visible
open_in_new_tab
```

### Aceite
Item suporta página, URL interna e URL externa.

---

## LOOP 6.13 — Hierarquia de menu

### Implementar
Máximo de 2 níveis.

### Teste
Terceiro nível deve ser rejeitado.

### Aceite
Hierarquia respeita a arquitetura de navegação.

---

## LOOP 6.14 — CRUD e ordenação de menu

### Acesso
ADMIN.

### Implementar
Adicionar, editar, remover, ocultar, ordenar e mover dentro dos dois níveis permitidos.

### Aceite
Menu institucional é completamente configurável no CMS.

---

## LOOP 6.15 — Resolução pública de menu

### Implementar
Serviço/API que resolve o menu pela instituição atual.

### Aceite
FUMEP, ETMSL e CRAMAM devolvem estruturas independentes.

---

# FASE 7 — FRONTEND PÚBLICO

## LOOP 7.1 — Design tokens

### Implementar
Cores, spacing, radius, tipografia.

---

## LOOP 7.2 — Button

### Variantes

```text
PRIMARY
SECONDARY
OUTLINE
GHOST
```

---

## LOOP 7.3 — Header

### Implementar
Logo + Busca + Acessibilidade + Tema + Hamburger.

---

## LOOP 7.4 — Logo clicável

### Regra

```text
FUMEP → /
ETMSL → /etmsl
CRAMAM → /cramam
```

---

## LOOP 7.5 — Drawer

### Implementar
Menu lateral.

---

## LOOP 7.6 — Outras instituições

### Implementar
Bloco no final do drawer.

---

## LOOP 7.7 — Menu em 2 níveis

### Implementar.

---

## LOOP 7.8 — Breadcrumb

### Implementar.

---

## LOOP 7.9 — Footer enxuto

### Implementar
Dados de InstitutionSetting.

---

## LOOP 7.10 — Skip link

### Implementar.

---

## LOOP 7.11 — AccessibilityPanel

### Implementar inicialmente:
- fonte +;
- fonte -;
- alto contraste;
- destacar links;
- reduzir animações.

---

## LOOP 7.12 — VLibras

### Implementar integração prevista.

---

## LOOP 7.13 — Dark mode completo

### Testar:
- SYSTEM;
- LIGHT;
- DARK;
- override local.

---

## LOOP 7.14 — 404

### Implementar.

---

## LOOP 7.15 — 500

### Implementar.

---

## LOOP 7.16 — SEO base

### Implementar:
- title;
- description;
- canonical;
- Open Graph.

---

# FASE 8 — NOTÍCIAS

## LOOP 8.1 — Article

### Implementar tabela e repository.

---

## LOOP 8.2 — ArticleInstitution

### Implementar N:N.

---

## LOOP 8.3 — ArticleVersion

### Implementar
Snapshots imutáveis de artigos publicados.

### Testes
- `version_number` incremental;
- snapshot preservado;
- histórico consultável.

### Aceite
Nova publicação gera nova versão sem alterar snapshots anteriores.

---

## LOOP 8.4 — Category

### Implementar.

---

## LOOP 8.5 — Tag

### Implementar.

---

## LOOP 8.6 — ArticleCategory / ArticleTag

### Implementar.

---

## LOOP 8.7 — Capa obrigatória na publicação

### Regra
Rascunho pode não ter.

---

## LOOP 8.8 — ContentBlocks em Article

### Permitidos:

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

---

## LOOP 8.9 — CRUD administrativo

### Implementar.

---

## LOOP 8.10 — Publicação de artigo

### Implementar validação.

---

## LOOP 8.11 — Listagem pública

### Implementar.

---

## LOOP 8.12 — Detalhe público

### Implementar.

---

## LOOP 8.13 — NEWS_FEED

### Implementar bloco dinâmico.

---

# FASE 9 — CURSOS

## LOOP 9.1 — Course

### Implementar.

---

## LOOP 9.2 — CourseOffering

### Implementar.

Campos:

```text
modality
shift
duration
workloadHours
```

---

## LOOP 9.3 — Status de curso

### Enum:

```text
ACTIVE
TEMPORARILY_UNAVAILABLE
CLOSED
```

---

## LOOP 9.4 — CourseCurriculum

### Implementar PDF.

---

## LOOP 9.5 — CourseImage

### Implementar.

---

## LOOP 9.6 — CourseDocument

### Implementar.

---

## LOOP 9.7 — Coordinator

### Implementar campo/relacionamento conforme modelo final.

---

## LOOP 9.8 — CRUD administrativo

### Implementar.

---

## LOOP 9.9 — Listagem pública

### Regra
`CLOSED` não aparece.

---

## LOOP 9.10 — Página padronizada de curso

### Implementar.

---

## LOOP 9.11 — COURSE_FEED

### Implementar.

---

# FASE 10 — EVENTOS

## LOOP 10.1 — Event

### Implementar.

---

## LOOP 10.2 — EventInstitution

### Implementar.

---

## LOOP 10.3 — EventSchedule

### Implementar múltiplos horários.

---

## LOOP 10.4 — EventCategory

### Implementar.

---

## LOOP 10.5 — Endereço e mapa

### Implementar lat/long + address.

---

## LOOP 10.6 — URL de inscrição externa

### Implementar.

---

## LOOP 10.7 — CRUD administrativo

### Implementar.

---

## LOOP 10.8 — Listagem pública

### Implementar.

---

## LOOP 10.9 — Página de evento

### Implementar.

---

## LOOP 10.10 — EVENT_FEED

### Implementar
Próximos eventos.

---

# FASE 11 — GALERIAS E ESTÁGIO

## LOOP 11.1 — Gallery

### Implementar
Tabela, repository e service de `Gallery`.

### Aceite
Galeria pode ser vinculada à instituição.

---

## LOOP 11.2 — GalleryItem

### Implementar
Itens ordenados vinculados a `Media`.

### Campos principais

```text
gallery_id
media_id
caption
alt_text
position
```

### Aceite
Itens podem ser adicionados, removidos e reordenados.

---

## LOOP 11.3 — MediaUsage de GalleryItem

### Implementar
Registrar uso de cada mídia de galeria.

### Aceite
Mídia utilizada em galeria não pode ser excluída.

---

## LOOP 11.4 — Administração de galerias

### Implementar
CRUD e reordenação.

### Aceite
Editor autorizado gerencia galerias da sua instituição.

---

## LOOP 11.5 — GALLERY_FEED funcional

### Implementar
Conectar o bloco `GALLERY_FEED` às consultas reais de galeria.

### Aceite
Bloco público renderiza dados locais sem duplicá-los no ContentBlock.

---


## LOOP 11.6 — InternshipArea

### Implementar.

---

## LOOP 11.7 — InternshipCategory

### Categorias iniciais:

```text
Orientações
Formulários
Relatórios
Legislação
Documentos por curso
```

---

## LOOP 11.8 — InternshipDocument

### Implementar
`course_id` opcional.

---

## LOOP 11.9 — Administração

### Implementar.

---

## LOOP 11.10 — Página pública de Estágio

### Implementar.

---

# FASE 12 — BUSCA

## LOOP 12.1 — PostgreSQL extensions

### Implementar:

```text
unaccent
pg_trgm
```

---

## LOOP 12.2 — search_documents

### Implementar.

---

## LOOP 12.3 — search_document_institutions

### Implementar.

---

## LOOP 12.4 — tsvector

### Implementar pesos.

---

## LOOP 12.5 — GIN

### Implementar índices.

---

## LOOP 12.6 — pg_trgm

### Implementar similaridade.

---

## LOOP 12.7 — SearchService

### Implementar interface.

---

## LOOP 12.8 — Page indexing

### Implementar.

---

## LOOP 12.9 — Article indexing

### Implementar.

---

## LOOP 12.10 — Course indexing

### Implementar.

---

## LOOP 12.11 — Event indexing

### Implementar.

---

## LOOP 12.12 — Document indexing

### Regra
Somente metadados e contexto.

---

## LOOP 12.13 — REINDEX_SEARCH

### Implementar job.

---

## LOOP 12.14 — REBUILD_SEARCH_INDEX

### Implementar.

---

## LOOP 12.15 — Endpoint de busca

### Implementar.

---

## LOOP 12.16 — Autocomplete

### Regra

```text
>= 3 caracteres
máximo 8
```

---

## LOOP 12.17 — Filtros

### Implementar
- instituição;
- tipo;
- período.

---

## LOOP 12.18 — search_query_logs

### Implementar.

---

## LOOP 12.19 — Busca sem resultado

### Implementar analytics.

---

## LOOP 12.20 — Testes de relevância

### Obrigatório
Título exato deve superar menção no corpo.

---

# FASE 13 — INTEGRAÇÕES EXTERNAS

## LOOP 13.1 — ExternalSystem

### Implementar.

---

## LOOP 13.2 — SelectionProcess

### Implementar projeção local.

---

## LOOP 13.3 — Contest

### Implementar projeção local.

---

## LOOP 13.4 — Adapter de processo seletivo

### Implementar.

---

## LOOP 13.5 — Adapter de concurso

### Implementar.

---

## LOOP 13.6 — SYNC_SELECTION_PROCESSES

### Implementar.

---

## LOOP 13.7 — SYNC_CONTESTS

### Implementar.

---

## LOOP 13.8 — Retry e timeout

### Implementar.

---

## LOOP 13.9 — Ocultação imediata

### Regra

```text
ausente em resposta válida
→ is_visible = false
```

---

## LOOP 13.10 — Resposta inválida

### Regra

```text
não ocultar registros locais
```

---

## LOOP 13.11 — Status externo

### Regra
Não reinterpretar.

---

## LOOP 13.12 — Página pública de processo seletivo

### Implementar.

---

## LOOP 13.13 — Página pública de concurso

### Implementar.

---

## LOOP 13.14 — CTA oficial

### Implementar.

---

## LOOP 13.15 — SELECTION_PROCESS_FEED

### Implementar.

---

## LOOP 13.16 — CONTEST_FEED

### Implementar.

---

## LOOP 13.17 — Indexação

### Implementar busca.

---

# FASE 14 — ANALYTICS

## LOOP 14.1 — Matomo em desenvolvimento/staging

### Implementar ambiente local/institucional.

---

## LOOP 14.2 — Tracker no Next.js

### Implementar page views.

---

## LOOP 14.3 — AnalyticsService

### Implementar.

---

## LOOP 14.4 — MatomoAdapter

### Implementar.

---

## LOOP 14.5 — Overview

### Implementar métricas:

```text
acessos
visitantes
```

---

## LOOP 14.6 — Top páginas

### Implementar.

---

## LOOP 14.7 — Top notícias

### Implementar.

---

## LOOP 14.8 — Top cursos

### Implementar.

---

## LOOP 14.9 — Top eventos

### Implementar.

---

## LOOP 14.10 — Dispositivos

### Implementar.

---

## LOOP 14.11 — Referrers

### Implementar.

---

## LOOP 14.12 — Analytics de busca

### Integrar `search_query_logs`.

---

## LOOP 14.13 — Permissão ADMIN

### Implementar visão global.

---

## LOOP 14.14 — Permissão EDITOR

### Regra
Somente instituições autorizadas.

---

## LOOP 14.15 — Cache de analytics

### Implementar Redis curto.

---

# FASE 15 — SAÚDE E OPERAÇÃO

## LOOP 15.1 — SystemHealthService

### Implementar infraestrutura.

---

## LOOP 15.2 — PostgreSQL health

### Implementar.

---

## LOOP 15.3 — Redis health

### Implementar.

---

## LOOP 15.4 — MinIO health

### Implementar.

---

## LOOP 15.5 — Worker health

### Implementar.

---

## LOOP 15.6 — Matomo health

### Implementar.

---

## LOOP 15.7 — Queue status

### Implementar.

---

## LOOP 15.8 — Versão e commit

### Implementar
Exibir:

```text
version
commit
deploy date
```

---

## LOOP 15.9 — Página Saúde do Sistema

### Acesso
ADMIN apenas.

---

## LOOP 15.10 — Logs estruturados

### Implementar JSON.

---

## LOOP 15.11 — requestId

### Implementar propagação.

---

## LOOP 15.12 — log rotation

### Implementar configuração operacional.

---

## LOOP 15.13 — Nginx

### Implementar reverse proxy de staging.

---

## LOOP 15.14 — HTTPS

### Implementar staging/production.

---

## LOOP 15.15 — GitHub Actions CD

### Implementar deploy controlado.

---

## LOOP 15.16 — Imagens versionadas

### Implementar tags por commit.

---

## LOOP 15.17 — Rollback

### Implementar procedimento.

---

# FASE 16 — QA, SEGURANÇA E HOMOLOGAÇÃO

## LOOP 16.1 — Playwright base

### Implementar config.

---

## LOOP 16.2 — E2E Login

### Implementar.

---

## LOOP 16.3 — E2E Page Builder

### Implementar fluxo completo.

---

## LOOP 16.4 — E2E publicação

### Implementar.

---

## LOOP 16.5 — E2E mídia

### Implementar.

---

## LOOP 16.6 — E2E busca

### Implementar.

---

## LOOP 16.7 — E2E permissões

### Implementar matriz institucional.

---

## LOOP 16.8 — axe-core

### Implementar.

---

## LOOP 16.9 — Drawer por teclado

### Implementar teste.

---

## LOOP 16.10 — Autocomplete por teclado

### Implementar teste.

---

## LOOP 16.11 — Light/Dark

### Testar seis combinações:

```text
FUMEP Light
FUMEP Dark
ETMSL Light
ETMSL Dark
CRAMAM Light
CRAMAM Dark
```

---

## LOOP 16.12 — Responsividade

### Testar:

```text
320
375
768
1024
1280+
```

---

## LOOP 16.13 — Screenshots críticos

### Implementar apenas para:

```text
Header
Drawer
Homes
Curso
Notícia
Busca
Preview
HERO
CARDS
IMAGE_TEXT
Footer
```

---

## LOOP 16.14 — XSS

### Testar rich text.

---

## LOOP 16.15 — javascript: links

### Testar bloqueio.

---

## LOOP 16.16 — Upload malicioso

### Testar tipos inválidos.

---

## LOOP 16.17 — Health como Editor

### Esperado

```text
403
```

---

## LOOP 16.18 — Rate limiting

### Testar endpoints críticos.

---

## LOOP 16.19 — Lighthouse staging

### Executar auditoria.

---

## LOOP 16.20 — SEO

### Validar:
- title;
- description;
- canonical;
- Open Graph.

---

## LOOP 16.21 — 404/500

### Testar.

---

## LOOP 16.22 — Links quebrados

### Executar auditoria automática.

---

## LOOP 16.23 — Staging noindex

### Validar.

---

## LOOP 16.24 — Checklist editorial

### Validar FUMEP.

---

## LOOP 16.25 — Checklist editorial ETMSL

### Validar.

---

## LOOP 16.26 — Checklist editorial CRAMAM

### Validar.

---

## LOOP 16.27 — Checklist técnico

### Validar infraestrutura.

---

## LOOP 16.28 — Checklist acessibilidade

### Validar manualmente.

---

## LOOP 16.29 — Redirects essenciais

### Implementar apenas quando houver equivalentes úteis.

---

## LOOP 16.30 — Freeze de homologação

### Congelar mudanças finais.

---

## LOOP 16.31 — Simular go-live

### Executar troca em ambiente controlado.

---

## LOOP 16.32 — Simular rollback

### Garantir retorno à versão anterior.

---

## LOOP 16.33 — Runbook

### Documentar:

```text
deploy
rollback
health
logs
worker
reindex
integrações
```

---

## LOOP 16.34 — Go-live checklist final

### Só aprovar quando todos os bloqueadores críticos estiverem resolvidos.

---

# 5. REGRAS PARA USO COM IA / LOOPS

Cada solicitação à IA deverá ser extremamente delimitada.

Evitar:

```text
"Implemente o Portal FUMEP."
```

Preferir:

```text
"Implemente somente a entidade Institution com Drizzle,
migration, repository, service, controller REST administrativo,
schemas Zod e testes.

Não implemente User, Page, autenticação ou frontend ainda."
```

---

# 6. REGRA DE PRESERVAÇÃO

Cada novo loop deverá:

```text
preservar o que já funciona
```

Não reescrever módulos estáveis sem necessidade explícita.

---

# 7. REGRA DE ESCOPO

Toda solicitação deverá incluir:

```text
O que implementar
O que não implementar
```

Isso reduz expansão indevida de escopo.

---

# 8. REGRA DE TESTE

Sempre pedir à IA:

```text
implemente
+
adicione/ajuste testes
+
execute lint
+
execute typecheck
+
execute testes
+
execute build
```

---

# 9. REGRA DE ERRO

Se um loop falhar:

```text
corrigir o mesmo loop
```

Não iniciar funcionalidade nova.

---

# 10. COMMITS

Cada loop deve preferencialmente terminar em commit pequeno.

Exemplos:

```text
feat(db): add institution schema

feat(auth): add redis-backed login session

feat(media): add image upload

feat(builder): add text block v1
```

---

# 11. PULL REQUESTS

PRs deverão agrupar poucos loops relacionados.

Evitar PRs gigantes com múltiplas fases.

---

# 12. DEPENDÊNCIAS ENTRE FASES

Sequência recomendada:

```text
Fundação
↓
Domínio
↓
Auth
↓
Instituições
↓
Mídia
↓
Page Builder
↓
Publicação
↓
Frontend
↓
Conteúdos estruturados
↓
Busca
↓
Integrações
↓
Analytics
↓
Operação
↓
Hardening
```

---

# 13. NÃO ANTECIPAR COMPLEXIDADE

Não implementar antecipadamente:

```text
Kubernetes
Elasticsearch
OpenSearch
microserviços
event sourcing
CQRS completo
2FA
frontend separado por instituição
```

sem necessidade real.

---

# 14. PRINCÍPIO DE FONTE DE VERDADE

Sempre preservar:

```text
PostgreSQL
→ domínio do Portal

MinIO
→ arquivos

Redis
→ sessões, BullMQ e cache

Matomo
→ analytics de navegação

Sistemas externos
→ concursos/processos seletivos
```

---

# 15. CHECKLIST DE UM LOOP CONCLUÍDO

Antes de avançar:

```text
[ ] objetivo do loop cumprido

[ ] escopo extra não foi introduzido

[ ] lint aprovado

[ ] typecheck aprovado

[ ] testes aprovados

[ ] build aprovado

[ ] E2E aprovado quando aplicável

[ ] documentação atualizada quando necessário

[ ] commit pequeno e descritivo
```

---

# 16. MARCOS DO PROJETO

## MARCO A — Fundação pronta

Após Fase 0:

```text
web sobe
api sobe
worker sobe
postgres online
redis online
minio online
CI verde
```

---

## MARCO B — Segurança base pronta

Após Fase 2:

```text
login
sessão
logout
roles
instituições
CSRF
reset de senha
```

---

## MARCO C — CMS mínimo utilizável

Após Fase 6:

```text
mídia
Page Builder
preview
publicação
versionamento
```

---

## MARCO D — Portal público funcional

Após Fase 7:

```text
FUMEP
ETMSL
CRAMAM
temas
header
drawer
footer
páginas públicas
```

---

## MARCO E — Conteúdo institucional funcional

Após Fase 11:

```text
notícias
cursos
eventos
estágio
```

---

## MARCO F — Descoberta e integrações

Após Fase 13:

```text
busca
autocomplete
processos seletivos
concursos
```

---

## MARCO G — Administração operacional completa

Após Fase 15:

```text
analytics
health
logs
deploy
rollback
```

---

## MARCO H — Pronto para homologação final

Após Fase 16:

```text
QA
segurança
acessibilidade
performance
staging
checklists
runbook
```

---

# 17. ORDEM RECOMENDADA DE EXECUÇÃO

Não pular diretamente para:

```text
Home
Page Builder completo
Busca
Analytics
```

sem a fundação anterior.

O primeiro desenvolvimento real deverá começar em:

```text
LOOP 0.1
```

e avançar sequencialmente, desviando da ordem apenas quando houver motivo técnico documentado.

---

# 18. STATUS

Este documento passa a ser o **roteiro operacional de implementação da V1 do Portal FUMEP**.

Ele deverá ser utilizado em conjunto com os documentos de arquitetura já definidos:

```text
Modelo de Domínio

Storage e Biblioteca de Mídia

Busca e Indexação

Analytics

Deployment e Observabilidade

Page Builder e Content Blocks

Frontend e Design System

Integrações Externas

Testes e QA

Implantação e Transição
```

A implementação deve preservar as decisões desses documentos e utilizar este plano para controlar a ordem, o escopo e a validação de cada entrega.
