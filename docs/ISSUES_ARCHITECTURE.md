# ISSUES DE ARQUITETURA

Use este arquivo apenas quando a implementação encontrar uma contradição real não resolvida pelo manifesto e pelos documentos especializados.

## Abertos

### AUTH-002 — Contrato de token e origem para proteção CSRF

Classificação: **bloqueador**.

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

## Resolvidos

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
