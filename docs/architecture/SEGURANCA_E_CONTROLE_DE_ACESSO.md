# ARQUITETURA TÉCNICA V1 — SEGURANÇA E CONTROLE DE ACESSO

## 1. OBJETIVO

Este documento estabelece as decisões de segurança, autenticação, autorização, gerenciamento de sessões, proteção de conteúdo e recuperação de senha do Portal FUMEP.

As regras aqui definidas deverão orientar a implementação do frontend em **Next.js**, do backend em **NestJS**, do armazenamento de sessões em **Redis** e da persistência principal em **PostgreSQL com Drizzle ORM**.

---

# 2. PRINCÍPIOS GERAIS

A segurança do sistema deverá seguir os seguintes princípios:

- autenticação baseada em sessão;
- nenhum uso de JWT;
- nenhuma credencial ou token armazenado em `localStorage`;
- autorização sempre validada no backend;
- acesso administrativo limitado por função e instituição;
- privilégio mínimo;
- HTTPS obrigatório em produção;
- componentes internos não expostos diretamente à internet;
- auditoria das ações administrativas relevantes;
- validação e sanitização de todas as entradas;
- proteção específica para uploads;
- proteção contra CSRF, XSS, brute force e abuso de API.

---

# 3. PAPÉIS DO SISTEMA

A V1 possuirá dois papéis administrativos:

```text
ADMIN
EDITOR
```

## 3.1 Administrador

O Administrador possui acesso global ao CMS.

Pode:

- criar e desativar usuários;
- atribuir instituições aos Editores;
- criar páginas;
- editar páginas;
- criar e alterar menus;
- configurar instituições;
- gerenciar modelos de páginas;
- gerenciar mídia;
- gerenciar notícias;
- gerenciar cursos;
- gerenciar eventos;
- gerenciar estágio;
- gerenciar categorias e tags;
- acessar configurações globais;
- consultar registros de auditoria.

---

## 3.2 Editor

O Editor possui acesso apenas às instituições explicitamente atribuídas a ele.

Pode, dentro dessas instituições:

- editar páginas existentes;
- adicionar blocos;
- editar blocos;
- duplicar blocos;
- ocultar blocos;
- excluir blocos;
- reordenar blocos;
- criar e publicar notícias;
- excluir notícias;
- criar e editar cursos;
- criar e editar eventos;
- gerenciar estágio;
- gerenciar galerias;
- gerenciar mídia;
- criar categorias;
- criar tags.

Não pode:

- criar páginas;
- gerenciar usuários;
- definir permissões;
- alterar menus;
- alterar configurações globais;
- configurar instituições.

---

# 4. ESCOPO POR INSTITUIÇÃO

Um Editor poderá possuir acesso a uma ou mais instituições.

Exemplo:

```text
Editor A
├── FUMEP
└── ETMSL
```

Esse Editor poderá modificar conteúdos dessas duas instituições, mas não conteúdos exclusivos do CRAMAM.

O backend deverá validar esse escopo em todas as operações administrativas.

Ocultar elementos no frontend não constitui mecanismo de autorização.

---

# 5. CONTEÚDOS VINCULADOS A VÁRIAS INSTITUIÇÕES

Notícias e eventos poderão estar vinculados simultaneamente a várias instituições.

Exemplo:

```text
Notícia X
├── FUMEP
└── ETMSL
```

Para editar esse conteúdo, um Editor deverá possuir autorização para **todas as instituições vinculadas ao registro**.

Assim:

```text
Editor com FUMEP + ETMSL
→ autorizado
```

```text
Editor apenas ETMSL
→ não autorizado
```

Administrador possui acesso global.

---

# 6. AUTENTICAÇÃO

A autenticação será baseada em **sessão server-side**.

Não será utilizado JWT.

Fluxo:

```text
Usuário
↓
POST /auth/login
↓
NestJS valida e-mail e senha
↓
sistema cria identificador de sessão criptograficamente seguro
↓
sessão é armazenada no Redis
↓
identificador é enviado ao navegador em cookie seguro
↓
requisições seguintes utilizam automaticamente esse cookie
```

---

# 7. COOKIE DE SESSÃO

O cookie utilizado para identificação da sessão deverá possuir:

```text
HttpOnly = true
Secure = true em produção
SameSite = Lax
Path = /
```

O cookie não poderá ser acessado diretamente por JavaScript no navegador.

---

# 8. SESSÕES NO REDIS

As sessões serão armazenadas no Redis.

Estrutura conceitual:

```text
session:{sessionId}

userId
role
institutionIds
createdAt
lastActivityAt
absoluteExpiresAt
```

Dados críticos de autorização poderão ser novamente verificados no PostgreSQL quando necessário.

---

# 9. DURAÇÃO DA SESSÃO

A sessão possuirá dois limites:

```text
inatividade: 30 minutos
```

```text
duração máxima absoluta: 8 horas
```

Os valores deverão ser configuráveis.

Ao atingir qualquer limite, a sessão será invalidada.

---

# 10. LOGOUT

No logout:

```text
sessão removida do Redis
↓
cookie invalidado
↓
acesso administrativo encerrado
```

O sistema deverá possuir estrutura que permita futuramente:

```text
encerrar todas as sessões de determinado usuário
```

---

# 11. SENHAS

A política de senha da V1 será simples.

Requisitos:

```text
mínimo: 10 caracteres
```

Não será obrigatório:

- caractere especial;
- número;
- letra maiúscula;
- troca periódica de senha.

Frases longas deverão ser permitidas.

---

# 12. ARMAZENAMENTO DE SENHAS

Senhas nunca serão armazenadas em texto puro.

Será utilizado:

```text
Argon2id
```

Não utilizar:

```text
MD5
SHA-1
SHA-256 puro
```

O banco armazenará somente o hash produzido pelo algoritmo apropriado.

---

# 13. RECUPERAÇÃO DE SENHA

A recuperação será realizada através de **link temporário enviado por e-mail**.

Não haverá:

- perguntas secretas;
- códigos permanentes;
- recuperação por telefone;
- senha provisória enviada por e-mail.

---

# 14. FLUXO DE RECUPERAÇÃO

```text
Usuário seleciona "Esqueci minha senha"
↓
informa seu e-mail
↓
sistema apresenta resposta neutra
↓
caso exista usuário correspondente,
gera token criptograficamente seguro
↓
envia link temporário por e-mail
↓
usuário acessa o link
↓
define uma nova senha
↓
token é consumido
↓
todas as sessões anteriores são encerradas
↓
usuário realiza novo login
```

---

# 15. RESPOSTA DA SOLICITAÇÃO DE RECUPERAÇÃO

A resposta deverá ser a mesma independentemente da existência da conta.

Exemplo:

> Se existir uma conta associada a esse e-mail, enviaremos as instruções para redefinição da senha.

O sistema não deverá informar:

```text
"E-mail não encontrado"
```

Isso evita enumeração de usuários.

---

# 16. TOKEN DE RECUPERAÇÃO

O token deverá:

- ser criptograficamente aleatório;
- possuir alta entropia;
- ser de uso único;
- possuir validade de 30 minutos;
- nunca ser armazenado em texto puro no banco.

No banco será armazenado somente:

```text
hash(token)
```

---

# 17. TABELA PASSWORD_RESET_TOKENS

Adicionar ao Modelo de Dados Lógico:

```text
password_reset_tokens
---------------------
id              UUID PRIMARY KEY

user_id         UUID NOT NULL
                FK -> users.id

token_hash      TEXT NOT NULL

expires_at      TIMESTAMPTZ NOT NULL

consumed_at     TIMESTAMPTZ NULL

created_at      TIMESTAMPTZ NOT NULL
```

Índices recomendados:

```text
INDEX(user_id)
INDEX(expires_at)
```

A exclusão do usuário deverá eliminar tokens de recuperação associados.

---

# 18. LINK DE RECUPERAÇÃO

Formato conceitual:

```text
https://portal.fumep.../admin/redefinir-senha?token=<TOKEN>
```

O token original:

- aparece somente no link;
- não fica armazenado em texto puro no banco;
- deixa de ser válido após uso ou expiração.

---

# 19. REDEFINIÇÃO DE SENHA

Ao receber o token:

```text
hash(token recebido)
↓
buscar token_hash
↓
verificar expires_at
↓
verificar consumed_at IS NULL
↓
permitir nova senha
```

Após sucesso:

```text
password_hash atualizado
↓
consumed_at = NOW()
↓
sessões Redis do usuário removidas
↓
AuditLog recebe PASSWORD_RESET
```

---

# 20. RATE LIMITING NA RECUPERAÇÃO

A rota:

```text
POST /auth/forgot-password
```

deverá possuir limitação contra abuso.

Configuração inicial sugerida:

```text
5 solicitações por hora por IP
```

Também deverá existir controle complementar por conta/e-mail.

---

# 21. PROTEÇÃO CONTRA CSRF

Como o sistema utiliza cookies de sessão, as operações administrativas deverão possuir proteção contra CSRF.

Para:

```text
POST
PUT
PATCH
DELETE
```

utilizar:

```text
token CSRF
+
SameSite=Lax
+
validação de Origin/Referer
```

Requisições GET nunca deverão modificar estado.

---

# 22. CORS

Preferencialmente a aplicação pública e a API utilizarão o mesmo domínio lógico.

Exemplo:

```text
https://portal.fumep.../
```

e:

```text
https://portal.fumep.../api/
```

O Nginx fará o encaminhamento interno para Next.js e NestJS.

Isso reduz problemas envolvendo CORS e cookies.

Caso CORS seja necessário futuramente, somente origens explicitamente autorizadas serão permitidas.

Não utilizar:

```text
Access-Control-Allow-Origin: *
```

em operações autenticadas.

---

# 23. GUARDS DO NESTJS

O backend utilizará Guards para autenticação e autorização.

Estrutura:

```text
Request
↓
SessionGuard
↓
RoleGuard
↓
InstitutionGuard
↓
Controller
↓
Service
```

## SessionGuard

Responsável por:

- ler o cookie;
- localizar sessão no Redis;
- validar validade;
- identificar usuário.

## RoleGuard

Responsável por verificar:

```text
ADMIN
EDITOR
```

## InstitutionGuard

Responsável por verificar se o usuário possui autorização sobre as instituições vinculadas ao conteúdo.

---

# 24. RATE LIMITING

Deverão existir limites diferentes conforme a operação.

## Login

Configuração inicial:

```text
5 tentativas por minuto por IP
```

Complementado por controle por conta.

---

## Busca pública

Configuração inicial:

```text
60 a 120 requisições por minuto por IP
```

O valor final poderá ser calibrado após análise de utilização.

---

## API administrativa

Deverá possuir limites suficientemente altos para uso normal, mas capazes de impedir abuso automatizado.

---

# 25. PROTEÇÃO CONTRA BRUTE FORCE

Tentativas repetidas de autenticação deverão gerar atraso ou bloqueio temporário progressivo.

Não haverá bloqueio permanente automático da conta.

Falhas deverão ser registradas:

```text
AUTH_LOGIN_FAILED
```

---

# 26. AUDITORIA

Ações administrativas importantes deverão ser registradas.

Exemplos:

```text
LOGIN_SUCCESS
LOGIN_FAILED
LOGOUT

PASSWORD_RESET

USER_CREATED
USER_DISABLED
USER_PERMISSIONS_CHANGED

PAGE_CREATED
PAGE_UPDATED
PAGE_DELETED
PAGE_PUBLISHED

ARTICLE_CREATED
ARTICLE_UPDATED
ARTICLE_DELETED
ARTICLE_PUBLISHED

MEDIA_UPLOADED
MEDIA_DELETED
MEDIA_DELETE_BLOCKED

COURSE_UPDATED
EVENT_UPDATED

MENU_UPDATED
SETTING_UPDATED
```

---

# 27. DADOS DE AUDITORIA

Cada evento deverá registrar, quando aplicável:

```text
user_id
action
entity_type
entity_id
metadata
ip_address
created_at
```

Não registrar:

- senha;
- hash de senha;
- cookie;
- session ID completo;
- token de recuperação.

---

# 28. PROTEÇÃO CONTRA XSS

Conteúdo proveniente de editores ricos deverá ser sanitizado no backend.

Não será permitido conteúdo arbitrário contendo:

```text
<script>
javascript:
event handlers inline
iframes arbitrários
```

O conteúdo salvo deverá passar por sanitização antes da publicação.

---

# 29. VÍDEOS

Blocos de vídeo não aceitarão HTML arbitrário.

A V1 trabalhará com provedores previamente autorizados.

Inicialmente:

```text
YouTube
Vimeo
```

O sistema deverá extrair ou validar a URL e construir o embed de forma controlada.

---

# 30. UPLOAD DE ARQUIVOS

Uploads deverão ser validados por:

```text
extensão
+
MIME type
+
assinatura real do arquivo / magic bytes
```

Não confiar apenas no nome do arquivo fornecido pelo usuário.

---

# 31. FORMATOS DE IMAGEM

Inicialmente permitir:

```text
JPEG
PNG
WebP
AVIF
```

SVG não será permitido na V1 através do painel editorial.

---

# 32. DOCUMENTOS

Inicialmente permitir:

```text
PDF
```

Outros formatos poderão ser incluídos posteriormente se houver necessidade funcional.

---

# 33. NOMES DOS ARQUIVOS

O nome original será preservado somente como metadado.

No armazenamento interno deverá ser utilizado nome gerado pelo sistema.

Exemplo:

```text
550e8400-e29b-41d4-a716-446655440000.webp
```

Isso evita colisões e problemas com nomes manipulados.

---

# 34. TAMANHO DOS ARQUIVOS

Cada tipo deverá possuir tamanho máximo configurável.

A definição exata ficará para a configuração operacional da aplicação.

O backend deverá rejeitar uploads acima do limite antes de processá-los.

---

# 35. SEGURANÇA DO REDIS

Redis será executado apenas na rede interna da infraestrutura.

Não haverá exposição da porta Redis à internet.

Requisitos:

- ACL;
- senha forte;
- protected mode;
- acesso apenas pelos serviços necessários;
- possibilidade de usuários Redis diferentes para API e Worker.

---

# 36. SEGURANÇA DO POSTGRESQL

PostgreSQL também permanecerá apenas na rede interna.

Não será exposto à internet.

A aplicação não utilizará usuário administrativo `postgres`.

Usuários sugeridos:

```text
portal_app
```

para execução da aplicação.

E:

```text
portal_migration
```

para migrations.

A conta da aplicação não deverá possuir permissões administrativas desnecessárias.

---

# 37. MINIO

O MinIO será executado na infraestrutura Ubuntu institucional.

Não dependerá de serviços externos de Object Storage.

Estrutura lógica sugerida:

```text
public
private
```

O acesso de gravação deverá ocorrer pelo backend.

Credenciais administrativas do MinIO nunca deverão ser enviadas ao navegador.

---

# 38. SEGREDOS

Credenciais e segredos não poderão ser incluídos no Git.

Exemplos:

```text
DATABASE_PASSWORD
REDIS_PASSWORD
SESSION_SECRET
MINIO_SECRET_KEY
SMTP_PASSWORD
```

Em produção deverão ser armazenados em configuração restrita no servidor.

---

# 39. HTTPS

Todo tráfego externo em produção deverá utilizar HTTPS.

Requisições HTTP deverão ser redirecionadas para HTTPS.

O painel administrativo não poderá operar por HTTP em produção.

---

# 40. HEADERS DE SEGURANÇA

A aplicação deverá configurar:

```text
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
Strict-Transport-Security
```

A CSP deverá também controlar onde a aplicação pode ser incorporada utilizando:

```text
frame-ancestors
```

---

# 41. CONTENT SECURITY POLICY

A política deverá partir de uma configuração restritiva.

Conceitualmente:

```text
default-src 'self'
script-src 'self'
style-src 'self'
img-src 'self' data:
connect-src 'self'
```

Exceções deverão ser adicionadas somente quando realmente necessárias.

Exemplos futuros:

- Matomo;
- VLibras;
- YouTube;
- Vimeo.

---

# 42. ERROS DA API

Respostas públicas deverão utilizar códigos HTTP adequados:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
```

Nunca deverão ser enviados ao navegador:

- stack trace;
- SQL;
- caminhos internos;
- segredos;
- variáveis de ambiente;
- detalhes de infraestrutura.

---

# 43. LOGS

Separar conceitualmente:

```text
Access Log
Application Log
Audit Log
Security Log
```

## Access Log

Principalmente Nginx.

## Application Log

NestJS, Worker e demais componentes.

## Audit Log

Persistido no PostgreSQL.

## Security Log

Eventos de segurança relevantes, como falhas de autenticação e bloqueios.

---

# 44. CONTROLE DE CONCORRÊNCIA

Como vários Editores poderão editar conteúdos simultaneamente, deverá existir controle de concorrência otimista.

O sistema poderá utilizar:

```text
version
```

ou:

```text
updated_at
```

para identificar alterações concorrentes.

Exemplo:

```text
Editor A abre notícia
Editor B abre notícia

Editor B salva

Editor A tenta salvar versão antiga

→ 409 Conflict
```

O frontend deverá informar que o conteúdo foi alterado por outro usuário.

Não deverá sobrescrever silenciosamente a versão mais recente.

---

# 45. REAUTENTICAÇÃO

Não será exigida para operações editoriais comuns.

Poderá ser exigida para operações administrativas especialmente sensíveis, como:

- alteração de permissões;
- alteração de senha de outra conta;
- desativação de Administrador;
- operações críticas de segurança.

---

# 46. MATRIZ DE AUTORIZAÇÃO

| Operação | ADMIN | EDITOR autorizado |
|---|---:|---:|
| Acessar painel | Sim | Sim |
| Criar notícia | Sim | Sim |
| Editar notícia | Sim | Sim |
| Publicar notícia | Sim | Sim |
| Excluir notícia | Sim | Sim |
| Editar página | Sim | Sim |
| Adicionar blocos | Sim | Sim |
| Reordenar blocos | Sim | Sim |
| Criar página | Sim | Não |
| Criar curso | Sim | Sim |
| Editar curso | Sim | Sim |
| Gerenciar eventos | Sim | Sim |
| Gerenciar estágio | Sim | Sim |
| Gerenciar mídia | Sim | Sim |
| Criar categorias | Sim | Sim |
| Criar tags | Sim | Sim |
| Alterar menus | Sim | Não |
| Gerenciar usuários | Sim | Não |
| Definir instituições | Sim | Não |
| Configurar instituição | Sim | Não |
| Configuração global | Sim | Não |
| Consultar AuditLog | Sim | Não |

Todas as permissões do Editor permanecem condicionadas às instituições atribuídas à sua conta.

---

# 47. MATRIZ DE ACESSO POR INSTITUIÇÃO

Exemplo:

```text
EDITOR
instituições:
ETMSL
CRAMAM
```

Pode modificar:

```text
conteúdo ETMSL
conteúdo CRAMAM
conteúdo ETMSL + CRAMAM
```

Não pode modificar:

```text
conteúdo FUMEP
conteúdo FUMEP + ETMSL
conteúdo FUMEP + CRAMAM
conteúdo FUMEP + ETMSL + CRAMAM
```

---

# 48. ROTAS DE AUTENTICAÇÃO

Rotas previstas:

```text
POST /auth/login

POST /auth/logout

GET /auth/session

POST /auth/forgot-password

POST /auth/reset-password
```

Poderá existir futuramente:

```text
POST /auth/logout-all
```

---

# 49. LOGIN

Entrada:

```text
email
password
```

O sistema deverá:

1. normalizar o e-mail;
2. localizar usuário ativo;
3. verificar Argon2id;
4. aplicar rate limiting;
5. criar sessão;
6. registrar login;
7. enviar cookie.

---

# 50. USUÁRIO DESATIVADO

Quando:

```text
users.is_active = FALSE
```

o usuário não poderá:

- realizar login;
- continuar usando sessões existentes.

Ao desativar uma conta, todas as sessões Redis desse usuário deverão ser invalidadas.

---

# 51. ALTERAÇÃO DE PERMISSÕES

Quando um Administrador alterar as instituições ou o papel de um usuário:

```text
permissões alteradas
↓
sessões existentes do usuário invalidadas
↓
novo login obrigatório
```

Isso impede que uma sessão antiga mantenha permissões já removidas.

---

# 52. INFRAESTRUTURA DE REDE

Produção:

```text
INTERNET
   │
   │ 443
   ▼
 NGINX
   │
   ├──────────────► NEXT.JS
   │
   └──────────────► NESTJS
                       │
              REDE INTERNA
                       │
          ┌────────────┼────────────┐
          │            │            │
      PostgreSQL     Redis        MinIO
```

PostgreSQL, Redis e interfaces administrativas internas não serão expostos diretamente à internet.

---

# 53. DECISÕES DE SEGURANÇA V1

Ficam estabelecidas as seguintes decisões:

```text
Autenticação por sessão
Sem JWT
Redis para sessões
Cookie HttpOnly
Cookie Secure
SameSite=Lax
Argon2id
Senha mínima de 10 caracteres
Recuperação por link temporário
Token de recuperação de uso único
Validade do token: 30 minutos
RBAC ADMIN/EDITOR
Escopo por instituição
NestJS Guards
CSRF
Origin/Referer validation
Rate limiting
Proteção contra brute force
AuditLog
Sanitização de HTML
Upload restrito
PDF como documento inicial
SVG não permitido na V1
PostgreSQL interno
Redis interno
MinIO interno
HTTPS obrigatório
CSP
Headers de segurança
Controle de concorrência
Invalidação de sessão após mudança de senha/permissões
```

---

# 54. STATUS

Com estas definições, a camada de **Segurança e Controle de Acesso da Arquitetura Técnica V1** é considerada definida.

As decisões deverão ser utilizadas posteriormente para:

- schemas Drizzle;
- Guards NestJS;
- middleware;
- configuração Redis;
- configuração Nginx;
- telas de login;
- recuperação de senha;
- gerenciamento de usuários;
- validação de uploads;
- política de sessões;
- testes automatizados de segurança.