# MIG 5.8 — checkpoint seguro de persistência PageTemplate

Em 2026-10-02, o responsável autorizou SQLAlchemy 2 e Alembic para **novas** migrations Python, com baseline auditada antes de escrever no PostgreSQL existente. Nenhuma migration Python foi executada no banco local `portal_fumep`.

Foi criado o banco local exclusivo `portal_fumep_mig58_test`. Nele, as migrations Drizzle commitadas 0000–0019 foram aplicadas do zero. A baseline Alembic `20261002_00` verificou tabelas/colunas fundamentais e a ausência de `page_templates` sem DDL nessas tabelas; a revisão `20261002_01` criou `page_templates` apenas nesse banco de teste. O teste SQLAlchemy insere/lê um template global e faz rollback. A configuração Alembic recusa alvos que não sejam exatamente esse banco local, e não chama `create_all`, `autogenerate` ou `stamp`.

O banco local preexistente `portal_fumep` contém `page_templates` apesar de a tabela não estar nas migrations Drizzle commitadas. Esse desvio não foi alterado. Antes de qualquer migração na base existente, será necessário auditar seu histórico e dados separadamente e planejar adoção sem recriação/duplicação. Não reutilizar essa tabela como prova de baseline.

No checkpoint inicial, o CRUD FastAPI **não foi aberto** porque ainda não existia login HTTP com revalidação de usuário PostgreSQL, sessão/CSRF e guard ADMIN integrado. O registry Nuxt também contém IDs de fixture e não é validador de snapshots de produção. `docs/ISSUES_ARCHITECTURE.md` registra as decisões de sequência. O loop 5.8 permanece aberto.

Atualização 2026-10-05: o MVP HTTP de autenticação foi entregue; a sequência foi reordenada para categorias e galerias funcionais antes do CRUD PageTemplate. A revisão Alembic `20261005_02` adicionou `categories` somente ao banco de teste dedicado. O banco preexistente permanece intocado e o loop PageTemplate ainda não foi aceito.

Atualização posterior: `20261005_03` adicionou `galleries` e `gallery_items` somente ao mesmo banco de teste; CRUD/itens/MediaUsage e feed de preview administrativo foram testados. PageTemplate volta a ser o loop atual, sem migração automática da base preexistente.
