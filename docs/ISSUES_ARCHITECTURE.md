# ISSUES DE ARQUITETURA

Use este arquivo apenas quando a implementação encontrar uma contradição real não resolvida pelo manifesto e pelos documentos especializados.

## Abertos

### MIG-AUTH-001 — Adaptador PostgreSQL/migrations Python antes das rotas de autenticação

Classificação: **bloqueador para concluir MIG 3.9**. Registrado em 2026-09-28; sem alteração de schema ou dados.

O documento canônico de migração preserva o schema/dados PostgreSQL existentes e exige fechar ORM/migrations Python antes de escrever na base. Hoje `apps/backend` contém apenas serviços isolados e test doubles; não há repositório Python de usuários/tokens, auditoria real ou revogação de todas as sessões. O aceite de MIG 3.9 proíbe sucesso fictício em rota administrativa. Expor login/reset agora omitiria persistência e controles obrigatórios; aplicar migrations automáticas sobre o histórico Drizzle sem baseline revisada poderia alterar a base indevidamente.

Decisão recomendada para aprovação: SQLAlchemy 2 para mapeamento explícito das tabelas existentes e Alembic para **novas** migrations Python, com baseline auditada contra o schema Drizzle e sem executar `create_all`, `autogenerate`, `stamp` ou `upgrade` na base existente automaticamente. Primeiro validar em banco de teste/cópia; depois implementar repositórios de usuários/tokens e auditoria, revogação Redis e fluxos HTTP completos. Alternativa: psycopg 3 com SQL parametrizado e migrations SQL manuais; mantém controle direto, mas amplia código de repositório/transação a manter para as próximas funcionalidades.

É necessária escolha explícita da estratégia de persistência/migrations e confirmação de que o banco de teste pode ser usado para validar a linha-base. Até lá, MIG 3.9 permanece ativo e nenhuma rota de autenticação administrativa será exposta.

## Resolvidos

### STACK-001 — Substituição da pilha V1 por FastAPI + Nuxt

Em 2026-09-25, o responsável interrompeu o loop 5.31 e autorizou explicitamente FastAPI no backend, Nuxt/Vue com SSR no frontend, preservando PostgreSQL, Redis e MinIO. Pediu implementação de cada funcionalidade antes da integração. A mudança conflita com a pilha histórica NestJS/Next.js/Drizzle/BullMQ/Sharp, por isso foi registrada e fechada como decisão arquitetural explícita, não como refatoração silenciosa. A precedência, invariantes preservados e etapas constam em `docs/architecture/MIGRACAO_FASTAPI_NUXT_CANONICA.md`. O trabalho não commitado do 5.31 foi preservado em stash recuperável. Escolhas de adaptadores Python de ORM/fila/imagem permanecem por definir antes da respectiva funcionalidade; não são autorização para alterar dados ou filas existentes prematuramente.

### MEDIA-002 — Estado durável e recuperação da exclusão física

Classificação architecture-guard: **resolvido por autorização explícita do responsável em 2026-09-17**. Contrato fechado em Storage §55.1–55.5, Jobs §6.1 e modelo lógico §8.2. A resolução da decisão não significa implementação concluída.

Evidências canônicas:
- Storage §§52–54 proíbe exclusão com MediaUsage e define variantes → original → metadados → auditoria;
- Storage §55 exige exclusão idempotente/resistente a falhas, explicita que PostgreSQL/MinIO não são uma única transação e admite DELETE_MEDIA posteriormente;
- modelo lógico §8.2 não possui estado/marcador de exclusão; processing_status no especializado/implementação pertence ao processamento de imagem, não deve ser reutilizado silenciosamente para exclusão;
- o plano 4.16 exige bloqueio de mídia em uso; não define lifecycle de exclusão/recuperação nem autoriza ampliar o modelo com tombstone/outbox/estado novo.

Conflito de segurança/consistência:
- remover arquivos primeiro e sofrer queda antes do commit PostgreSQL devolve o lock/rollback, mas deixa Media disponível (inclusive READY) sem original/variantes. Outro consumidor pode então registrar novo uso. Backup apenas em memória/compensação no catch não recupera uma queda do processo;
- remover metadados primeiro viola a sequência do especializado e perde a fonte durável para reconciliar objetos restantes;
- locks/FK resolvem concorrência enquanto o processo está vivo, não tornam a remoção física reversível depois de uma queda;
- implementar recuperação durável exige uma alteração de modelo/escopo ainda não fechada. Não se trata da preferência entre uma função síncrona e uma fila.

Parte independente já entregue em `f3914ea`: guard interno mantém lock da Media durante a seção crítica, reautoriza a categoria persistida, bloqueia MediaUsage/PROCESSING, registra MEDIA_DELETE_BLOCKED transacionalmente e não expõe owners estrangeiros.

Recomendação para aprovação:
- definir lifecycle de exclusão separado de processing_status, persistido no PostgreSQL antes de tocar objetos (por exemplo, deletion_requested_at/deletion_status, com contrato fechado);
- bloquear seleção/publicação/novos usos enquanto a mídia estiver nesse lifecycle;
- autorizar DELETE_MEDIA no Worker separado, payload restrito ao mediaId, remoção idempotente e retries limitados; PostgreSQL mantém a intenção/metadados até concluir limpeza/auditoria;
- definir recuperação/reconciliação de intenções persistidas quando enqueue ou processo falhar, sem assumir atomicidade PG/Redis/MinIO;
- revisar documentos especializados/modelo lógico e escopo 4.16 explicitamente, mantendo sem JWT, sem novo storage e sem outbox genérico inventado.

Decisão autorizada e fechada: estados NONE/REQUESTED/FAILED separados de processing_status; intenção e solicitante persistidos/auditados antes do enqueue; DELETE_MEDIA na fila media, payload somente mediaId; cleanup variantes → original → metadados/auditoria transacional; recuperação no startup e a cada minuto a partir do PostgreSQL. Limite durável de três tentativas de cleanup por ciclo, sem retry automático infinito após FAILED; ADMIN pode iniciar novo ciclo explicitamente, com sessão/CSRF/reautorização/auditoria. Campos, locks, tratamento de quedas, contrato REST e testes obrigatórios estão nos documentos canônicos. Nenhuma exclusão física, migration ou job foi implementado neste fechamento documental. O escopo adicional fica autorizado somente no 4.16; 4.17 permanece fechado até seu aceite.

### MEDIA-001 — Autorização de upload antes de MediaCategory

Classificação: resolvido por autorização explícita do responsável em 2026-09-16.

Decisão autorizada: antecipar somente o modelo mínimo MediaCategory, category_id em Media e autorização institucional ao 4.2. EDITOR poderá enviar em categorias de suas instituições; uploads sem categoria ou em categoria global permanecem exclusivos de ADMIN. A interface/gestão completa de categorias continua no 4.13. Não adicionar institution_id em Media ou ownership alternativo.

Evidências:
- Segurança §§3.2, 4 e 46 limita gestão de mídia do EDITOR às instituições atribuídas;
- Storage §61 vincula escopo institucional à categoria e permite reutilização global, sem definir criação de mídia global por EDITOR;
- modelo lógico §8.2 representa o vínculo via category_id → MediaCategory → Institution, não via institution_id em Media;
- MediaCategory pertence ao loop 4.13; no 4.2 não existe vínculo institucional persistido para o upload;
- uploaded_by identifica autoria, não substitui autorização institucional nem propriedade global.

Decisão necessária:
- política transitória para upload sem categoria no 4.2, sem ampliar implicitamente permissões do EDITOR;
- não antecipar tabela/ownership alternativo fora do plano sem autorização.

Recomendação:
- autorizar upload global somente por ADMIN no 4.2, mantendo sessão/CSRF e validações;
- EDITOR recebe 403 no upload até o vínculo institucional por MediaCategory ser implementado no 4.13;
- no 4.13, liberar upload categorizado para EDITOR autorizado e documentar a política de criação/reutilização global;
- não adicionar institution_id em Media nem antecipar categorias apenas para contornar a decisão.

A recomendação ADMIN-only acima foi substituída pela decisão autorizada após o responsável esclarecer que EDITOR precisa enviar arquivos já neste estágio. Implementação retomada no 4.2; categories integrais continuam no 4.13.

### THEME-001 — Fonte pública de tema institucional no loop 3.6

Classificação: **resolvido**.

Decisão: recomendação THEME-001 autorizada pelo responsável do projeto. Implementar a projeção pública restrita e consumir no servidor Next.js no loop 3.6, sem abrir o CRUD ADMIN.

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

Implementação autorizada no loop 3.6: endpoint público separado, projeção estrita validada por Zod e consumo server-only no Next.js. CRUD institucional continua restrito a ADMIN; não há acesso ao banco pelo frontend.

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
