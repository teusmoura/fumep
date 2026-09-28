# Sessão Redis isolada — MIG 3.1

`apps/backend/app/sessions.py` fornece apenas o armazenamento e o cookie da futura autenticação FastAPI; ainda **não há endpoint de login nem sessão administrativa ativa no Nuxt**. O prefixo `migration:session:` impede colisão com as sessões do backend legado. Não migrar ou reutilizar sessões antigas implicitamente.

- Token opaco de 32 bytes aleatórios, entregue somente em cookie `fumep_session` HttpOnly, SameSite=Lax, Path=/ e Secure em produção; nada em localStorage/JWT.
- Registro server-side contém user_id, role, institution_ids, tempos e token CSRF aleatório (AUTH-002); não armazena senha. Inatividade máxima: 30 minutos. Prazo absoluto: 8 horas, não renovável por atividade.
- Criação usa `SET NX EX`; leitura/renovação usa `WATCH/MULTI/EXEC` para preservar TTL e evitar atualização perdida. Expiração, corrupção e invalidação removem a chave. Falhas de Redis não autorizam fallback inseguro.
- O cookie pode durar até 8 horas, mas Redis rejeita sessões ociosas antes disso. No futuro, login/guards devem usar `read_and_refresh` e revalidar autorização crítica no PostgreSQL.

Rodar `python -m pytest -q` em `apps/backend` usa fakeredis e deixa o teste de Redis real explicitamente ignorado. Para executá-lo, fornecer `FUMEP_REDIS_TEST_URL` apontando **somente** para Redis loopback no banco 15 e rodar o mesmo comando; o teste recusa outros hosts/DBs e cria chaves com prefixo único. Não usar credenciais ou dados de produção. O ambiente local do desenvolvimento passou nesse teste em 2026-09-25.
