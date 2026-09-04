# ARQUITETURA TÉCNICA V1 — DEPLOYMENT, OBSERVABILIDADE E OPERAÇÃO

## 1. OBJETIVO

Este documento define a arquitetura de **deployment, CI/CD, observabilidade, operação, health checks, logs, rollback e recuperação operacional** do Portal FUMEP.

As decisões aqui descritas consideram:

- servidor Ubuntu institucional;
- Docker Compose;
- Nginx;
- GitHub Actions;
- PostgreSQL;
- Redis;
- MinIO;
- Matomo;
- aplicações Next.js, NestJS e Worker;
- backups institucionais já existentes;
- acesso à Saúde do Sistema apenas para ADMIN.

---

# 2. INFRAESTRUTURA DE PRODUÇÃO

A arquitetura base será:

```text
INTERNET
   │
   │ HTTPS :443
   ▼
 NGINX
   │
   ├── /            → Next.js
   ├── /api/*       → NestJS
   └── /media/*     → acesso controlado ao storage
                       │
              REDE INTERNA DOCKER
                       │
       ┌───────────────┼────────────────┐
       │               │                │
   PostgreSQL        Redis            MinIO
                       │
                     BullMQ
                       │
                     Worker

                  Matomo
```

---

# 3. PRINCÍPIO DE EXPOSIÇÃO DE SERVIÇOS

Não deverão ser expostos diretamente à internet:

```text
PostgreSQL

Redis

MinIO Admin

Matomo Admin

Worker
```

A exposição pública deverá ocorrer preferencialmente apenas pelo Nginx.

---

# 4. NGINX

O Nginx será o reverse proxy oficial do Portal.

Responsabilidades principais:

- terminação HTTPS;
- roteamento para Next.js;
- roteamento para NestJS;
- acesso controlado a mídia;
- headers de segurança;
- limites básicos;
- logs de acesso e erro;
- suporte a compressão e cache quando aplicável.

---

# 5. ROTAS CONCEITUAIS

Exemplo:

```text
/                   → web
/api/*              → api
/media/*            → camada de mídia
```

O MinIO não deverá ter sua URL interna exposta diretamente ao navegador.

---

# 6. DOCKER COMPOSE

A infraestrutura será executada inicialmente com Docker Compose.

Estrutura esperada:

```text
docker-compose.yml
docker-compose.dev.yml
docker-compose.prod.yml
```

A existência e separação final dos arquivos poderão ser ajustadas na implementação.

---

# 7. SERVIÇOS DO COMPOSE

Serviços previstos:

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

---

# 8. IMAGENS DA APLICAÇÃO

As aplicações próprias terão imagens separadas:

```text
portal-web

portal-api

portal-worker
```

---

# 9. VERSIONAMENTO DE IMAGENS

As imagens deverão ser identificadas por versão ou commit.

Exemplo:

```text
portal-api:a82f7c1
portal-web:a82f7c1
portal-worker:a82f7c1
```

Não depender exclusivamente de:

```text
latest
```

`latest` poderá existir, mas não será a única referência de versão.

---

# 10. GITHUB ACTIONS

GitHub Actions será a plataforma oficial de CI/CD.

A pipeline deverá separar conceitualmente:

```text
CI
```

e:

```text
CD
```

---

# 11. CONTINUOUS INTEGRATION — CI

A CI será executada em:

- Pull Requests;
- pushes relevantes;
- branches definidas pela política do projeto.

Fluxo inicial:

```text
checkout
↓
install
↓
lint
↓
typecheck
↓
testes
↓
build
```

---

# 12. COMANDOS CONCEITUAIS DE CI

Exemplo:

```text
pnpm install

pnpm lint

pnpm typecheck

pnpm test

pnpm build
```

Os comandos finais dependerão da estrutura real do monorepo.

---

# 13. CONTINUOUS DEPLOYMENT — CD

Deploy de produção deverá ocorrer apenas a partir de branch ou fluxo autorizado.

Fluxo conceitual:

```text
main
↓
CI aprovada
↓
build das imagens
↓
versionamento das imagens
↓
deploy no servidor Ubuntu
↓
migrations
↓
subida da nova versão
↓
health checks
↓
sucesso
```

---

# 14. PULL REQUEST NÃO FAZ DEPLOY DE PRODUÇÃO

Um Pull Request não deverá realizar deploy direto de produção.

A etapa de produção deverá depender de merge e regras de branch apropriadas.

---

# 15. AMBIENTES

A arquitetura deverá suportar ao menos:

```text
development

production
```

Recomenda-se, quando houver infraestrutura disponível:

```text
development

staging

production
```

---

# 16. STAGING

Staging será particularmente útil para:

- Page Builder;
- temas;
- novos blocos;
- alterações de layout;
- validação pelo Marketing;
- integrações externas;
- migrations mais sensíveis.

Fluxo possível:

```text
nova versão
↓
staging
↓
validação
↓
produção
```

Staging poderá ser implantado posteriormente sem alterar a arquitetura principal.

---

# 17. BUILD

Sempre que viável, a compilação deverá ocorrer fora do servidor de produção.

Preferência:

```text
GitHub Actions
↓
build
↓
imagem versionada
↓
servidor recebe a imagem
↓
docker compose up
```

Evitar usar o servidor de produção como ambiente principal de compilação.

---

# 18. DEPLOY NO SERVIDOR

Como o servidor é institucional, o GitHub Actions poderá executar deploy por canal seguro.

Fluxo conceitual:

```text
GitHub Actions
↓
SSH
↓
Ubuntu institucional
↓
atualização das imagens
↓
docker compose
```

A implementação deverá usar credenciais mínimas e restritas.

---

# 19. SEGREDOS

Segredos de produção não deverão estar no Git.

Exemplos:

```text
DATABASE_URL

REDIS_PASSWORD

MINIO_SECRET

MATOMO_TOKEN

SESSION_SECRET

SMTP_PASSWORD
```

---

# 20. ARMAZENAMENTO DE SEGREDOS

Os segredos poderão existir:

- no ambiente do servidor;
- em arquivo de ambiente protegido;
- em secrets do GitHub apenas quando necessários ao pipeline.

O navegador nunca deverá receber segredos internos.

---

# 21. MIGRATIONS

As migrations do PostgreSQL serão gerenciadas com Drizzle.

Fluxo:

```text
deploy
↓
migrations controladas
↓
nova aplicação
```

---

# 22. REGRA DE MIGRATION SEGURA

Uma nova versão não deverá depender de alteração destrutiva aplicada de forma insegura.

Evitar:

```text
DROP COLUMN
```

simultaneamente com uma mudança crítica que ainda depende da coluna antiga.

---

# 23. ESTRATÉGIA EXPAND / MIGRATE / CONTRACT

Preferência:

```text
adicionar estrutura nova
↓
migrar dados
↓
nova aplicação passa a utilizar
↓
remover estrutura antiga posteriormente
```

Essa abordagem reduz risco de rollback incompatível.

---

# 24. MIGRATION E ROLLBACK

Rollback de aplicação não deverá depender automaticamente de rollback de banco.

Alterações destrutivas deverão ser feitas somente quando versões anteriores já não precisarem mais da estrutura.

---

# 25. ROLLBACK

A infraestrutura deverá permitir retornar à versão anterior da aplicação.

Exemplo:

```text
versão N
↓
falha
↓
versão N-1
```

---

# 26. IDENTIFICAÇÃO DE DEPLOY

Cada deploy deverá permitir identificar:

```text
versão

commit

data/hora

ambiente
```

Exemplo:

```text
Versão: 1.4.2

Commit: a82f7c1

Deploy: 26/08/2026 10:15
```

---

# 27. HEALTH CHECKS

Cada componente relevante deverá possuir verificação de saúde.

A API poderá disponibilizar:

```text
GET /api/v1/health
```

---

# 28. HEALTH CHECK PÚBLICO

Se existir endpoint público, ele deverá expor informação mínima.

Exemplo:

```json
{
  "status": "ok"
}
```

Não deverá expor:

- hostname interno;
- versão do banco;
- credenciais;
- topologia interna;
- detalhes de erro sensíveis.

---

# 29. HEALTH CHECK ADMINISTRATIVO

ADMIN poderá consultar informações mais detalhadas.

Itens previstos:

```text
Portal Web

API

Worker

PostgreSQL

Redis

MinIO

Matomo
```

---

# 30. SAÚDE DO SISTEMA

A página interna de Saúde do Sistema será acessível apenas por:

```text
ADMIN
```

EDITOR não terá acesso.

---

# 31. CONTEÚDO DA SAÚDE DO SISTEMA

Exemplo:

```text
SAÚDE DO SISTEMA

Portal Web            Online
API                   Online
Worker                Online

PostgreSQL            Online
Redis                 Online
MinIO                 Online
Matomo                Online

Fila media            0 pendentes
Fila content          2 pendentes
Fila integrations     0 pendentes
Fila maintenance      0 pendentes

Jobs falhos           0

Última sincronização:
Processos Seletivos   10:25
Concursos             10:25
```

---

# 32. INFORMAÇÕES DE VERSÃO

A Saúde do Sistema deverá exibir:

```text
Versão em execução

Commit

Data do deploy
```

Essas informações facilitam suporte e rastreabilidade.

---

# 33. JOBS

A tela de saúde poderá mostrar:

- jobs pendentes;
- jobs em execução;
- jobs falhos;
- última execução de sincronizações;
- estado do Worker.

Não deverá permitir operações perigosas indiscriminadas.

---

# 34. LOGS

A arquitetura deverá separar logs por responsabilidade.

Exemplo:

```text
Nginx
├── access.log
└── error.log

NestJS
└── application logs

Worker
└── worker logs

PostgreSQL
└── database logs

Portal
└── AuditLog
```

---

# 35. LOGS ESTRUTURADOS

Logs da aplicação deverão ser preferencialmente estruturados em JSON.

Exemplo:

```json
{
  "level": "error",
  "service": "api",
  "requestId": "abc123",
  "message": "Erro ao atualizar artigo",
  "timestamp": "2026-08-26T13:15:00Z"
}
```

---

# 36. REQUEST ID

Cada requisição deverá receber:

```text
requestId
```

O identificador deverá acompanhar o fluxo da requisição.

Exemplo:

```text
Nginx
↓
NestJS
↓
logs
↓
resposta de erro
```

---

# 37. USO DO REQUEST ID

Quando um usuário reportar erro, o suporte poderá utilizar o requestId para localizar o evento correspondente nos logs.

---

# 38. LOGS SENSÍVEIS

Nunca registrar:

```text
password

cookie de sessão

session id bruto

token de reset

segredo

chave de API
```

---

# 39. ROTAÇÃO DE LOGS

Logs não poderão crescer indefinidamente.

Deverá ser utilizado:

```text
logrotate
```

e/ou limites de logs do Docker.

---

# 40. POLÍTICA DE RETENÇÃO

A política final de retenção deverá ser configurável.

Exemplo conceitual:

```text
tamanho máximo por arquivo
+
quantidade máxima de arquivos
+
compressão dos históricos
```

---

# 41. VOLUMES PERSISTENTES

Dados importantes não poderão depender do filesystem descartável dos containers.

Persistência obrigatória para:

```text
PostgreSQL

MinIO

Redis

Matomo
```

---

# 42. POSTGRESQL

O volume do PostgreSQL deverá ser persistente e contemplado no processo institucional de backup.

---

# 43. MINIO

O armazenamento de objetos deverá ser persistente e contemplado nos backups.

Inclui:

- imagens originais;
- variantes;
- PDFs;
- demais arquivos autorizados.

---

# 44. REDIS

Redis será utilizado para:

```text
sessões

BullMQ

cache
```

Como possui sessões e filas, não será tratado apenas como cache descartável.

Persistência operacional deverá ser habilitada adequadamente.

---

# 45. MATOMO

O Matomo terá persistência própria de suas configurações e dados de analytics.

Seus dados deverão ser considerados na estratégia institucional de recuperação.

---

# 46. REINÍCIO AUTOMÁTICO

Após reinício do Ubuntu, os serviços deverão voltar automaticamente.

Exemplo:

```text
restart: unless-stopped
```

ou política equivalente.

---

# 47. DEPENDÊNCIAS

A aplicação não deverá considerar que um serviço está pronto apenas porque o container iniciou.

Deverá considerar:

```text
container healthy
```

---

# 48. EXEMPLO DE DEPENDÊNCIA

```text
PostgreSQL healthy
↓
API pode operar
```

Da mesma forma:

```text
Redis healthy
↓
Worker pode operar
```

---

# 49. HEALTHCHECKS DO DOCKER

Serviços relevantes deverão possuir `healthcheck`.

Exemplos:

- PostgreSQL;
- Redis;
- MinIO;
- API;
- Matomo quando aplicável.

---

# 50. OBSERVABILIDADE MÍNIMA V1

A V1 terá como observabilidade mínima:

```text
Nginx access/error logs

NestJS application logs

Worker logs

AuditLog

Health endpoints

Status do PostgreSQL

Status do Redis

Status do MinIO

Status do Matomo

Status do Worker

Estado das filas
```

---

# 51. NÃO DEPENDER DE FERRAMENTA EXTERNA

A V1 não dependerá obrigatoriamente de serviços externos de observabilidade.

Ferramentas futuras como:

- Grafana;
- Loki;
- Prometheus;

poderão ser adicionadas posteriormente se necessário.

---

# 52. AUDITLOG

AuditLog continuará sendo responsabilidade do banco do Portal.

Deverá registrar eventos relevantes, como:

- login;
- alteração de usuário;
- publicação;
- edição;
- exclusão;
- alteração de permissão;
- mídia;
- configuração institucional;
- menus.

AuditLog não substitui logs técnicos.

---

# 53. ERROS DA API

Erros internos deverão gerar logs detalhados no servidor.

Ao usuário, retornar apenas informação segura.

Exemplo:

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Não foi possível concluir a operação.",
    "requestId": "abc123"
  }
}
```

---

# 54. BACKUP

Não será criado um sistema paralelo de backup dentro do Portal.

A aplicação deverá se integrar às rotinas institucionais existentes.

A infraestrutura já possui:

```text
backup diário
+
backup em fita
```

---

# 55. ELEMENTOS QUE DEVEM SER CONTEMPLADOS NO BACKUP

Garantir cobertura de:

```text
PostgreSQL

MinIO

Matomo

configurações necessárias
```

---

# 56. REDIS E BACKUP

Redis possui natureza diferente.

Como contém:

- sessões;
- BullMQ;
- cache;

sua recuperação operacional deverá ser considerada, mas ele não substitui nenhuma fonte principal de dados.

PostgreSQL permanece fonte de verdade dos dados de domínio.

---

# 57. RECUPERAÇÃO

A documentação operacional deverá prever procedimentos para:

- restauração de PostgreSQL;
- restauração de objetos MinIO;
- reconfiguração do Compose;
- reconstrução do índice de busca;
- retomada do Worker;
- retomada do Matomo;
- reimplantação das imagens da aplicação.

---

# 58. RECONSTRUÇÃO DE DADOS DERIVADOS

Dados derivados deverão ser reconstruíveis.

Exemplos:

```text
search_documents
→ REBUILD_SEARCH_INDEX
```

Cache:

```text
Redis cache
→ reconstruído sob demanda
```

---

# 59. DEPLOY REPRODUZÍVEL

Princípio obrigatório:

> O deploy de uma nova versão não deverá depender de intervenção manual rotineira no servidor.

Após estabilização da pipeline:

```text
GitHub Actions
↓
deploy reproduzível
↓
migrations controladas
↓
health checks
↓
versão operacional
```

---

# 60. FALHA NO DEPLOY

Caso o health check final falhe:

```text
deploy
↓
health check falha
↓
processo sinaliza erro
↓
rollback da aplicação
```

A estratégia de rollback deverá preservar compatibilidade de banco.

---

# 61. ZERO OU BAIXO DOWNTIME

A V1 deverá buscar reduzir indisponibilidade durante deploys.

Não será requisito inicial implementar Kubernetes ou arquitetura de alta disponibilidade.

A solução deve permanecer simples e operacionalmente sustentável.

---

# 62. MANUTENÇÃO

Operações de manutenção deverão ser documentadas.

Exemplos:

```text
subir ambiente

parar ambiente

reiniciar serviço

ver logs

consultar health

executar migration

fazer rollback

reconstruir busca

reiniciar worker
```

---

# 63. REDE INTERNA

PostgreSQL, Redis, MinIO e Worker deverão operar em rede interna do Docker.

Apenas os componentes necessários deverão publicar portas no host.

---

# 64. FIREWALL

O servidor Ubuntu deverá manter firewall compatível com a política institucional.

A exposição pública deverá ser limitada principalmente a:

```text
80
443
```

Porta 80 poderá existir apenas para redirecionar HTTP para HTTPS.

---

# 65. HTTPS

Produção deverá operar exclusivamente com HTTPS para tráfego autenticado e público.

Nginx será responsável pela terminação TLS.

---

# 66. HEADERS DE SEGURANÇA

O Nginx e/ou aplicação deverão configurar:

```text
Content-Security-Policy

X-Content-Type-Options

Referrer-Policy

Permissions-Policy

Strict-Transport-Security
```

A política final deverá ser compatível com os recursos utilizados pelo portal.

---

# 67. CORS

Como Next.js e NestJS deverão preferencialmente operar sob a mesma origem:

```text
https://portal.exemplo.br
```

e:

```text
https://portal.exemplo.br/api
```

a arquitetura reduz necessidade de CORS amplo.

Nunca usar:

```text
Access-Control-Allow-Origin: *
```

em endpoints autenticados.

---

# 68. SERVIÇOS CRÍTICOS

Considerar como críticos ao Portal:

```text
Nginx

Web

API

PostgreSQL

Redis
```

MinIO será crítico para mídia.

Worker será crítico para processamento assíncrono, mas falhas temporárias não deverão necessariamente derrubar o portal público.

Matomo não será dependência crítica.

---

# 69. DEGRADAÇÃO GRACIOSA

Exemplo:

```text
Matomo offline
→ portal continua operando

Worker temporariamente offline
→ conteúdo síncrono continua operando
→ jobs aguardam retomada

MinIO offline
→ conteúdos textuais podem continuar disponíveis
→ mídia pode falhar
```

---

# 70. MONITORAMENTO FUTURO

A arquitetura deverá permitir futura adoção de:

```text
Prometheus

Grafana

Loki
```

sem necessidade de redesenhar o domínio.

Não são requisitos obrigatórios da V1.

---

# 71. DIRETÓRIOS DE INFRAESTRUTURA

Estrutura candidata do monorepo:

```text
infra/
├── nginx/
├── docker/
├── scripts/
└── environments/
```

---

# 72. SCRIPTS OPERACIONAIS

Poderão existir scripts versionados para:

```text
deploy

rollback

backup auxiliar

restore auxiliar

health

migrate

reindex
```

Esses scripts não deverão conter segredos.

---

# 73. GITHUB ACTIONS — WORKFLOWS

Estrutura possível:

```text
.github/
└── workflows/
    ├── ci.yml
    ├── deploy-staging.yml
    └── deploy-production.yml
```

Staging será opcional inicialmente.

---

# 74. BRANCH PROTECTION

A branch principal deverá possuir proteção compatível com:

- PR obrigatório;
- CI aprovada;
- restrição de merge conforme política da equipe.

---

# 75. STATUS DE DEPLOY

A pipeline deverá informar claramente:

```text
build aprovado

migrations aprovadas

deploy concluído

health check aprovado
```

ou o ponto exato de falha.

---

# 76. HISTÓRICO DE DEPLOYS

GitHub Actions e versionamento das imagens deverão permitir identificar os deploys anteriores.

Isso será a base para rollback e auditoria operacional.

---

# 77. ACESSO À INFRAESTRUTURA

Acesso SSH ao servidor deverá ser restrito aos responsáveis técnicos autorizados.

Não deverá ser compartilhada conta genérica sem necessidade.

---

# 78. PRINCÍPIO DE MENOR PRIVILÉGIO

Credenciais de deploy deverão possuir apenas as permissões necessárias.

Exemplo:

```text
usuário de deploy
→ gerenciar aplicação
→ não necessariamente possuir acesso administrativo irrestrito ao servidor
```

A viabilidade exata dependerá da infraestrutura institucional.

---

# 79. DISPONIBILIDADE DA SAÚDE DO SISTEMA

A rota administrativa poderá ser conceitualmente:

```text
/admin/system/health
```

A API:

```text
GET /api/v1/admin/system/health
```

Somente ADMIN.

---

# 80. AUTORIZAÇÃO DA SAÚDE DO SISTEMA

Fluxo:

```text
Request
↓
SessionGuard
↓
RoleGuard ADMIN
↓
SystemHealthService
```

---

# 81. SYSTEMHEALTHSERVICE

Responsável por consolidar:

```text
aplicação

banco

Redis

MinIO

Matomo

Worker

filas

versão

deploy

sincronizações
```

---

# 82. TIMEOUTS DE HEALTH CHECK

Verificações internas deverão possuir timeout curto.

A página de saúde não deverá ficar bloqueada por longos períodos caso um serviço esteja indisponível.

---

# 83. NÃO EXPOR SEGREDOS NA SAÚDE

A página não deverá exibir:

- connection strings;
- passwords;
- tokens;
- caminhos internos sensíveis;
- dumps de erro.

---

# 84. DECISÕES CONSOLIDADAS

Ficam definidas para Deployment, Observabilidade e Operação V1:

```text
Servidor Ubuntu institucional

Docker Compose

Nginx como reverse proxy

GitHub Actions para CI/CD

Next.js separado

NestJS separado

Worker separado

PostgreSQL interno

Redis interno

MinIO interno

Matomo interno

Imagens Docker versionadas

Não depender somente de latest

CI com lint, typecheck, testes e build

Deploy somente por fluxo autorizado

PR não faz deploy de produção

Migrations com Drizzle

Migrations destrutivas evitadas

Estratégia expand / migrate / contract

Rollback de aplicação

Health checks

Endpoint público mínimo

Saúde detalhada somente para ADMIN

Versão, commit e data do deploy visíveis ao ADMIN

Logs estruturados

Request ID

Rotação de logs

Volumes persistentes

Redis com persistência operacional

Inicialização automática

Healthchecks de containers

Segredos fora do Git

HTTPS obrigatório

Serviços internos não expostos

Backup integrado às rotinas institucionais

Backup diário e em fita já existentes

PostgreSQL, MinIO, Matomo e configurações contemplados

Dados derivados reconstruíveis

Deploy reproduzível

Possibilidade futura de Prometheus, Grafana e Loki
```

---

# 85. ARQUITETURA FINAL

```text
                        INTERNET
                            │
                            ▼
                         NGINX
                  HTTPS / Reverse Proxy
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
           Next.js                     NestJS
              │                           │
              │                           ├──────── PostgreSQL
              │                           │
              │                           ├──────── Redis
              │                           │             │
              │                           │           BullMQ
              │                           │             │
              │                           │           Worker
              │                           │
              │                           ├──────── MinIO
              │                           │
              │                           └──────── Matomo
              │
              └──────── Portal público/admin

GitHub
   │
   ▼
GitHub Actions
   │
   ├── CI
   │    ├── lint
   │    ├── typecheck
   │    ├── tests
   │    └── build
   │
   └── CD
        ├── imagens versionadas
        ├── migrations
        ├── deploy
        ├── health checks
        └── rollback quando necessário
```

---

# 86. STATUS

Com este documento, a camada de **Deployment, Observabilidade e Operação da Arquitetura Técnica V1** é considerada definida.

As decisões deverão orientar posteriormente:

- Dockerfiles;
- Docker Compose;
- configuração Nginx;
- workflows do GitHub Actions;
- políticas de branch;
- migrations;
- secrets;
- health endpoints;
- SystemHealthService;
- página administrativa de Saúde do Sistema;
- logs;
- requestId;
- volumes;
- políticas de restart;
- procedimentos de rollback;
- documentação operacional;
- integração com backups institucionais;
- futura evolução de observabilidade.
