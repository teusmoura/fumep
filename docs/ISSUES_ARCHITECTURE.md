# ISSUES DE ARQUITETURA

Use este arquivo apenas quando a implementação encontrar uma contradição real não resolvida pelo manifesto e pelos documentos especializados.

## Abertos

### THEME-001 — Fonte pública de tema institucional no loop 3.6

Classificação: **bloqueador**.

Contexto e evidências:
- o loop 3.6 exige tema mínimo resolvido por instituição no frontend;
- o documento especializado de frontend, seções 70–71 e 90, exige tema institucional e dados vindos de Institution/InstitutionSetting/Theme;
- o loop 3.1 reserva o CRUD institucional exclusivamente a ADMIN;
- `InstitutionController` aplica SessionGuard e Roles("ADMIN") à classe, inclusive aos GETs;
- `apps/web/AGENTS.md` proíbe acesso direto ao banco e invenção de endpoints;
- a documentação canônica não define rota/contrato de leitura pública de tema institucional;
- os temas e appearance_default já são configuráveis/persistidos, portanto cópia estática não refletiria a fonte institucional.

Decisão necessária:
- definir como o frontend público recebe essa projeção sem sessão administrativa e sem abrir o CRUD;
- confirmar a inclusão dessa leitura no escopo 3.6.

Recomendação:
- autorizar GET `/api/v1/public/institutions/:slug/theme`, público e somente leitura;
- retornar somente id, slug, os quatro tokens e appearanceDefault para instituições ativas;
- retornar 404 para instituição inexistente/inativa, sem contatos, usuários, metadados administrativos ou credenciais;
- usar SYSTEM se ainda não houver settings;
- manter todo o CRUD atual protegido e documentar/testar a projeção com Zod/OpenAPI/Supertest;
- consumir a projeção no servidor Next.js e repassar apenas dados públicos ao ThemeContext.

Nenhuma abertura de autorização, endpoint público ou acesso direto ao banco implementado sem decisão. Loop 3.6 permanece atual.

## Resolvidos

### AUTH-003 — Limite entre Reset password (2.15) e invalidação de sessões (2.16)

Classificação: **resolvido**.

Decisão: recomendação AUTH-003 autorizada pelo responsável do projeto; revogação no 2.15 e reforço dos testes de ciclo de vida no 2.16.

Contexto:
- o plano canônico exige `POST /auth/reset-password` no loop 2.15;
- o loop 2.16 reserva explicitamente a remoção de todas as sessões do usuário após reset;
- a seção 19 do documento especializado de segurança define o sucesso do reset como atualização da senha, consumo do token, remoção das sessões Redis e auditoria;
- a skill `security-access` mantém como invariante que reset invalida sessões.

Conflito:
- concluir o endpoint no 2.15 sem revogação mantém sessões anteriores utilizáveis após troca de senha, contrariando a regra de segurança;
- revogar todas as sessões já no 2.15 antecipa o escopo explícito do 2.16.

Decisão recomendada:
- implementar a revogação de todas as sessões como parte do sucesso do reset no loop 2.15;
- usar o loop 2.16 para reforçar testes de ciclo de vida, múltiplas sessões e isolamento entre usuários.

Decisão necessária:
- autorizar o ajuste de escopo recomendado; ou
- definir uma separação alternativa que não permita disponibilizar reset com sessões antigas ainda válidas.

### AUTH-002 — Contrato de token e origem para proteção CSRF

Classificação: **resolvido**.

Decisão: recomendação AUTH-002 autorizada pelo responsável do projeto.

Contexto:
- o `LOOP 2.11` exige proteção de métodos mutáveis;
- o documento especializado exige token CSRF, `SameSite=Lax` e validação de `Origin`/`Referer`;
- a sessão atual é server-side no Redis e o cookie `fumep_session` é HttpOnly;
- o logout atual é idempotente mesmo sem uma sessão válida.

Lacunas canônicas:
- não está definido se o token será sincronizado e armazenado na sessão Redis ou implementado por double-submit cookie;
- não está definido como o frontend receberá ou renovará o token;
- não está definida a fonte de configuração das origens confiáveis;
- não está definido se logout exige token quando existe sessão, preservando o comportamento idempotente sem cookie.

Decisão recomendada:
- gerar token criptograficamente seguro por sessão e armazená-lo no payload Redis;
- retornar o token nas respostas autenticadas de login e consulta de sessão, para envio posterior no header `X-CSRF-Token`;
- configurar origens confiáveis por `APP_ORIGIN`, obrigatória em produção, comparando exatamente `Origin` ou a origem extraída de `Referer`;
- exigir token e origem nas mutações administrativas protegidas; tratar explicitamente o logout para preservar a limpeza idempotente sem cookie e exigir CSRF quando houver sessão válida.

Decisão necessária:
- autorizar a recomendação acima; ou
- definir outro padrão de token, entrega, origens confiáveis e tratamento de logout.

### AUTH-001 — Limite entre Login (2.2) e Sessão Redis (2.3)

Classificação: **resolvido**.

Decisão: implementar criação da sessão Redis e cookie no loop 2.2; o loop 2.3 será usado para robustecimento e testes do ciclo de vida da sessão server-side.

Contexto:
- o `LOOP 2.2` do plano canônico exige `POST /api/v1/auth/login` e aceita quando credenciais válidas criam sessão;
- o `LOOP 2.3` reserva explicitamente a implementação da sessão server-side Redis e do cookie;
- o documento especializado de segurança, que possui precedência maior, define o fluxo de login como uma operação única que cria a sessão no Redis e envia o cookie.

Conflito:
- concluir o aceite do loop 2.2 sem Redis/cookie exigiria uma implementação temporária de sessão não prevista;
- implementar Redis/cookie no loop 2.2 anteciparia explicitamente o escopo do loop 2.3.

Decisão necessária:
- mover a criação efetiva da sessão e o cookie para o loop 2.2, tornando o 2.3 um loop de robustecimento/testes; ou
- redefinir o aceite do 2.2 para validar credenciais e produzir os dados de sessão por uma abstração, deixando persistência Redis e cookie para o 2.3.

## Regra

Não transformar uma preferência de implementação em "problema de arquitetura".
Registrar somente decisões que exijam alteração do escopo ou de uma regra canônica.
