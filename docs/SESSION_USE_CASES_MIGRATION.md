# Leitura de sessão e logout isolados — MIG 3.6

`apps/backend/app/session_use_cases.py` usa o armazenamento Redis da MIG 3.1. `read(token)` retorna somente `user_id`, `role` e `institution_ids` para sessão ativa, ou `None` para ausência/expiração. Não retorna token, senha, hash nem tempos internos. A função não é autorização: o futuro endpoint/guard deverá revalidar o estado atual do usuário e suas permissões conforme a política MIG 3.4.

`logout(token, response, production=...)` remove a sessão e expira o cookie `fumep_session` com Path=/, HttpOnly, SameSite=Lax e Secure em produção. Ausência, token inválido ou logout repetido são idempotentes. Falha do Redis propaga erro e não confirma logout com expiração local apenas. A futura rota POST de logout deverá aplicar o contrato CSRF; nenhuma rota foi criada nesta fatia.
