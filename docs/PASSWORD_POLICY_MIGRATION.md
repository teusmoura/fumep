# MIG 3.2 — contrato isolado de credenciais

`apps/backend/app/passwords.py` valida entradas sem expor senha em representação, serialização ou erros de validação. O e-mail de login é aparado, convertido em minúsculas e validado; a senha não é aparada nem normalizada. Login aceita uma senha legada curta para verificação; senhas **novas** exigem pelo menos 10 caracteres, sem regra arbitrária de composição.

Senhas novas são armazenáveis somente como hash PHC Argon2id (versão 19), com salt aleatório de 16 bytes, memória de 64 MiB, três iterações, quatro lanes e saída de 32 bytes. `verify_password` aceita apenas hashes Argon2id e retorna falso para senha incorreta ou hash malformado. A política não registra credenciais nem cria usuários. Não há endpoint de login, conexão PostgreSQL ou integração Nuxt nesta fatia.

Instalar dependências com `python -m pip install -r apps/backend/requirements-lock.txt` e executar `python -m pytest -q` dentro de `apps/backend`. O contrato HTTP e a persistência de usuários pertencem a loops posteriores.
