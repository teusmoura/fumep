# Login isolado — MIG 3.3

`apps/backend/app/login.py` recebe `LoginCredentials`, um `UserRepository` injetado e o `RedisSessionStore` da MIG 3.1. O repositório deve buscar pelo e-mail já normalizado e retornar identidade, hash Argon2id, papel, estado ativo e instituições atribuídas. Só existe test double na suíte; não há fixture de usuário em produção nem conexão PostgreSQL.

Usuário inexistente, senha errada, conta inativa e Editor sem instituição retornam a mesma `InvalidCredentialsError` e não criam sessão. O caminho de usuário inexistente executa verificação Argon2id com hash-isca aleatório gerado em memória; nenhuma senha-isca é persistida. ADMIN pode ter lista institucional vazia por possuir escopo global. A sessão contém somente ID, papel, instituições e tempos; jamais senha ou hash. Erro do Redis é propagado sem fallback de autenticação.

Este serviço **não é um endpoint público pronto para produção**. Rota/cookie, proteção CSRF, rate limiting, auditoria, revalidação e invalidação de sessões ao desativar ou alterar permissões, e adaptador PostgreSQL pertencem a fatias futuras. O serviço não simula esses controles. A escolha do ORM/migrations Python deverá ser fechada antes de escrever no banco existente.
