# Limite de tentativas de login isolado — MIG 3.7

`apps/backend/app/login_rate_limit.py` consome um orçamento inicial de 5 tentativas em janela fixa de 60 segundos **por IP e por e-mail normalizado**. A sexta tentativa recebe `RateLimitDecision(allowed=False, retry_after_seconds=...)`; não existe bloqueio permanente. Cada tentativa de login, inclusive a que resultar em credenciais incorretas, deve consumir orçamento antes da verificação. O adaptador HTTP futuro deve usar o IP de uma fonte confiável do proxy, não `X-Forwarded-For` fornecido diretamente pelo cliente.

Uma transação Redis `WATCH/MULTI/EXEC` incrementa os dois contadores de forma atômica e preserva TTL; concorrência reexecuta com limite de tentativas. Chaves têm prefixo isolado `migration:rate:login:` e HMAC-SHA-256 com segredo injetado em runtime (mínimo 32 bytes), sem e-mail/IP em texto puro. Não há consulta a usuário: a resposta de bloqueio é idêntica para conta existente/inexistente. Redis indisponível, dado corrompido ou contenção excessiva falham fechado; o futuro endpoint deverá traduzir isso em erro neutro, sem expor detalhes.

Esta fatia não liga o limitador ao login/HTTP e não implementa AuditLog ou atraso progressivo além do bloqueio temporário inicial. Essas proteções continuam obrigatórias antes de expor a rota administrativa em produção.
