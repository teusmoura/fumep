# Contrato CSRF isolado — MIG 3.5

Conforme a decisão canônica AUTH-002, `apps/backend/app/sessions.py` gera token CSRF aleatório de 32 bytes por sessão e o armazena no payload Redis. O identificador da sessão permanece exclusivamente no cookie HttpOnly; o token CSRF é entregue separadamente no resultado de login e na consulta autenticada de sessão, para uso futuro no header `X-CSRF-Token`. Nenhum dos dois tokens deve ser registrado em log. Em produção, a origem autorizada deve usar HTTPS.

`issue` exige sessão Redis ativa. `validate_mutation` aceita somente POST/PUT/PATCH/DELETE e exige token correto em comparação constante, sessão ativa e Origin ou Referer da origem configurada. Se ambos vierem, ambos devem corresponder; host parecido, porta ou protocolo divergente, userinfo, origem ausente e cookie inválido são recusados. GET não é operação mutável deste contrato e não deve alterar estado.

Esta fatia não expõe endpoint, middleware, UI ou configuração de produção. O futuro adaptador HTTP deverá extrair o cookie de sessão e o header de token, obter a origem confiável de configuração do servidor, aplicar a validação a toda mutação administrativa e devolver erro sem vazar tokens. Logout com sessão válida exigirá CSRF; sem sessão, a limpeza de cookie pode permanecer idempotente. Isso não substitui autorização por papel/instituição.
