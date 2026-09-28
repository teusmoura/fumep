# Política de autorização isolada — MIG 3.4

`apps/backend/app/authorization.py` fornece `require_admin` e `require_institutions`. Ambas recebem uma `SessionData` lida/validada do Redis e `CurrentUserAccess`, que **deve ser obtido por uma fonte confiável no backend** quando houver integração. Não aceitar esse estado de payload do navegador. O módulo não é guard HTTP nem acessa PostgreSQL.

ADMIN tem acesso global; EDITOR somente às instituições atribuídas. Em conteúdo vinculado a várias instituições, o Editor precisa possuir **todas**. Escopo-alvo vazio falha fechado. Conta desativada, ID/papel/instituições diferentes do snapshot da sessão também falham: mudança de permissão ou desativação não pode manter autorização antiga. O serviço de integração deverá invalidar as sessões antigas e buscar dados atuais; esta fatia apenas define e testa a decisão, sem simular persistência nem rotas.
