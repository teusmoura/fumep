# Contrato CSRF isolado — MIG 3.5

`apps/backend/app/csrf.py` fornece um token HMAC-SHA-256 derivado do identificador opaco de sessão e de um segredo **injetado em runtime** (mínimo 32 bytes). O token não é armazenado no Redis nem no cookie HttpOnly. A chave precisa ser provisionada fora do Git; em produção, a origem autorizada deve usar HTTPS.

`issue` exige sessão Redis ativa. `validate_mutation` aceita somente POST/PUT/PATCH/DELETE e exige token correto em comparação constante, sessão ativa e Origin ou Referer da origem configurada. Se ambos vierem, ambos devem corresponder; host parecido, porta ou protocolo divergente, userinfo, origem ausente e cookie inválido são recusados. GET não é operação mutável deste contrato e não deve alterar estado.

Esta fatia não expõe endpoint, header de emissão, middleware, UI ou configuração de produção. O futuro adaptador HTTP deverá extrair o cookie de sessão e o header de token, obter a origem confiável de configuração do servidor, aplicar a validação a toda mutação administrativa e devolver erro sem vazar token/segredo. Isso não substitui autorização por papel/instituição.
