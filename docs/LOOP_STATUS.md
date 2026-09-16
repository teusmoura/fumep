# LOOP STATUS

## LOOP 0.1 — Concluído

Implementado:
- estrutura `apps/`;
- estrutura `packages/`;
- estrutura `infra/`;
- estrutura `docs/`;
- estrutura `.github/`;
- README;
- `.gitignore`;
- Git inicial.

Commit original:
```text
chore: initialize portal fumep monorepo
```

## LOOP 0.2 — Concluído

Escopo atual:
- configurar `pnpm-workspace.yaml` para `apps/*` e `packages/*`;
- criar o `package.json` privado da raiz;
- disponibilizar scripts comuns mínimos que tolerem pacotes ainda vazios;
- validar a instalação sem antecipar ferramentas dos loops seguintes.

Implementado:
- `pnpm-workspace.yaml` cobrindo `apps/*` e `packages/*`;
- `package.json` raiz privado com scripts comuns mínimos;
- `pnpm-lock.yaml` gerado pela instalação;
- `.pnpm-store/` ignorado pelo Git.

Ambiente observado:
- Node.js `v24.20.0`;
- pnpm `11.19.0`.

Checks executados com sucesso:
- `pnpm install`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test`;
- `pnpm build`.

Observação:
- os scripts comuns concluíram sem erros e informaram que ainda não há projetos com scripts próprios, comportamento esperado neste estágio.

Commit:
```text
chore: configure pnpm workspace
```

## LOOP 0.3 — Concluído

Escopo atual:
- criar `tsconfig.base.json` na raiz;
- habilitar modo estrito;
- definir alias básico para os pacotes `@fumep/*`;
- disponibilizar e validar `pnpm typecheck` sem criar aplicações ou configurar lint.

Implementado:
- `tsconfig.base.json` central com alvo ES2022, resolução de módulos para bundlers e emissão desabilitada;
- modo estrito habilitado;
- alias `@fumep/*` direcionado aos fontes dos pacotes do workspace;
- declaração sentinela neutra para validar a configuração antes da criação das aplicações;
- TypeScript `7.0.2` como dependência de desenvolvimento da raiz;
- script raiz `typecheck` executando o compilador com a configuração central.

Checks executados com sucesso:
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm test`;
- `pnpm build`;
- `pnpm install --frozen-lockfile`;
- `git diff --check`.

Observação:
- lint, testes e build ainda não encontram projetos com scripts próprios, comportamento esperado antes da criação das aplicações.

Commit:
```text
chore: configure central typescript
```

## LOOP 0.4 — Concluído

Escopo atual:
- criar o pacote mínimo `apps/web` com Next.js e App Router;
- fornecer layout, página padrão e estilos globais mínimos;
- manter renderização no servidor e HTML semântico;
- validar que a página abre localmente, sem antecipar Design System, temas ou integrações.

Implementado:
- pacote privado `@fumep/web` com Next.js `16.3.4`, React `19.2.8` e App Router;
- layout raiz em português do Brasil com metadados mínimos;
- página inicial renderizada no servidor com HTML semântico;
- estilos globais mínimos, incluindo skip link com foco visível;
- configuração TypeScript estendendo a base central;
- scripts `dev`, `build`, `start` e `typecheck` do frontend;
- script raiz `typecheck` ampliado para validar os projetos do workspace;
- regras locais do agente geradas e mantidas pelo Next.js 16;
- artefatos gerados do TypeScript e `next-env.d.ts` ignorados pelo Git.

Checks executados com sucesso:
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm test`;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `git diff --check`.

Critério de aceite validado:
- servidor de desenvolvimento iniciado em `http://127.0.0.1:3100`;
- `GET /` respondeu HTTP `200`;
- resposta continha `<title>Portal FUMEP</title>`, `<h1>Portal FUMEP</h1>` e `main-content`.

Commit:
```text
feat(web): create minimal nextjs app
```

## LOOP 0.5 — Concluído

Escopo atual:
- criar o pacote mínimo `apps/api` com NestJS;
- expor `GET /api/v1/health` por controller fino e service dedicado;
- documentar o endpoint no contrato OpenAPI;
- validar o endpoint com Vitest e Supertest;
- não criar domínio, persistência, autenticação ou integrações.

Implementado:
- pacote privado `@fumep/api` com NestJS `12.0.1` em ESM;
- bootstrap HTTP com prefixo global `/api/v1`;
- endpoint `GET /api/v1/health` com controller fino e service dedicado;
- resposta determinística `{ "status": "ok" }`;
- contrato OpenAPI e Swagger disponíveis em `/api/docs` e `/api/docs-json`;
- teste HTTP com Vitest `5.0.0` e Supertest `7.2.2`;
- build NestJS e configuração TypeScript baseada em `NodeNext`;
- TypeScript central ajustado para `6.0.3`, versão compatível com a API programática exigida pelo Nest CLI 12;
- script transitivo opcional de `@scarf/scarf` explicitamente bloqueado na política pnpm.

Checks executados com sucesso:
- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm test` — 1 arquivo e 1 teste aprovados;
- `pnpm build` — API e frontend compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `git diff --check`.

Critério de aceite validado:
- servidor NestJS iniciado localmente na porta `3001`;
- `GET /api/v1/health` respondeu HTTP `200` com `{ "status": "ok" }`;
- `GET /api/docs-json` respondeu HTTP `200` e incluiu `/api/v1/health`.

Commit:
```text
feat(api): create minimal nestjs health endpoint
```

## LOOP 0.6 — Concluído

Escopo atual:
- criar o pacote mínimo `apps/worker` em TypeScript;
- manter o Worker como processo independente da API;
- sinalizar inicialização e suportar encerramento controlado;
- validar que o processo inicia sem erro;
- não instalar ou configurar BullMQ, Redis, filas ou jobs.

Implementado:
- pacote privado `@fumep/worker` como aplicação independente;
- processo Node.js em TypeScript e ESM;
- configuração de typecheck e build baseada no TypeScript central;
- scripts `build`, `start` e `typecheck`;
- sinalização explícita de prontidão;
- manutenção do processo ativo e handlers de encerramento para `SIGINT` e `SIGTERM`;
- somente tipos de Node como dependência de desenvolvimento.

Checks executados com sucesso:
- `pnpm typecheck` — API, web e Worker aprovados;
- `pnpm lint`;
- `pnpm test` — teste existente da API aprovado;
- `pnpm build` — API, web e Worker compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `git diff --check`.

Critério de aceite validado:
- `pnpm --dir apps/worker start` iniciou o artefato compilado sem erro;
- processo emitiu `Worker FUMEP iniciado.` e permaneceu ativo;
- processo de validação encerrado após a comprovação.

Observação:
- nenhum teste específico de jobs foi criado porque BullMQ e jobs estão explicitamente fora deste loop.

Commit:
```text
feat(worker): create minimal typescript worker
```

## LOOP 0.7 — Concluído

Escopo atual:
- criar o pacote mínimo `packages/db` preparado para Drizzle ORM;
- expor uma entrada TypeScript/ESM sem schema, migration ou conexão;
- declarar o pacote como dependência workspace da API;
- validar a importação de `@fumep/db` pela API em tempo de compilação.

Implementado:
- pacote privado ESM `@fumep/db` com entrada pública e artefatos em `dist`;
- configuração TypeScript e build baseada no padrão central;
- Drizzle ORM `0.45.2` como dependência de runtime do pacote;
- marcador de tipo mínimo exportado, sem representar entidade de domínio;
- dependência workspace `@fumep/db` declarada em `apps/api`;
- importação de tipo pela API para validar resolução e contrato entre pacotes.

Checks executados com sucesso:
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm typecheck` — db, API, web e Worker aprovados;
- `pnpm lint`;
- `pnpm test` — teste existente da API aprovado;
- `pnpm build` — pacote db e aplicações compilados em ordem topológica;
- `git diff --check`.

Critério de aceite validado:
- vínculo workspace `apps/api/node_modules/@fumep/db` aponta para `packages/db`;
- API compilou com importação de tipo de `@fumep/db`;
- importação ESM do artefato compilado a partir de `apps/api` retornou `DB_IMPORT=ok`.

Observação:
- nenhum schema, migration, repository ou conexão com PostgreSQL foi criado neste loop.

Commit:
```text
feat(db): prepare drizzle package
```

## LOOP 0.8 — Concluído

Escopo atual:
- criar o pacote mínimo `packages/validation` com Zod;
- definir somente o schema da resposta de health já existente;
- testar payloads válido e inválido;
- consumir o tipo inferido pelo schema em `apps/api` e `apps/web`;
- não antecipar schemas completos de domínio ou ContentBlocks.

Implementado:
- pacote privado ESM `@fumep/validation` com Zod `4.5.4`;
- schema estrito `healthResponseSchema` para o contrato existente `{ status: "ok" }`;
- tipo `HealthResponse` inferido diretamente do schema;
- dependência workspace declarada em `apps/api` e `apps/web`;
- API usando o tipo compartilhado em `HealthService`;
- web usando o tipo compartilhado na página inicial;
- build TypeScript e entrada pública do pacote.

Testes adicionados:
- payload `{ status: "ok" }` é aceito;
- status inválido é rejeitado.

Checks executados com sucesso:
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm typecheck` — validation, db, API, web e Worker aprovados;
- `pnpm lint`;
- `pnpm test` — 2 testes do schema e 1 teste da API aprovados;
- `pnpm build` — pacote de validação e aplicações compilados;
- `git diff --check`.

Critério de aceite validado:
- importação runtime do schema a partir de `apps/api` retornou `API_SCHEMA=ok`;
- importação runtime do mesmo schema a partir de `apps/web` retornou `WEB_SCHEMA=ok`.

Observação:
- nenhum schema completo de domínio ou ContentBlock foi criado.

Commit:
```text
feat(validation): add shared health schema
```

## LOOP 0.9 — Concluído

Escopo atual:
- criar o pacote mínimo `packages/ui` para React;
- expor um componente apresentacional simples e server-compatible;
- declarar o pacote como dependência workspace da web;
- renderizar o componente na página inicial do Next.js;
- não antecipar Design System completo, temas, tokens ou componentes interativos.

Implementado:
- pacote privado ESM `@fumep/ui` para componentes React compartilhados;
- componente apresentacional `Message`, sem estado ou dependência de cliente;
- configuração TypeScript voltada a bundlers e build com declarações;
- React como peer dependency e tipos React para compilação isolada;
- dependência workspace `@fumep/ui` declarada no app web;
- parágrafo da home renderizado pelo componente compartilhado.

Checks executados com sucesso:
- `pnpm typecheck` — UI, validation, db, API, web e Worker aprovados;
- `pnpm lint`;
- `pnpm test` — 3 testes existentes aprovados;
- `pnpm build` — pacote UI e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `git diff --check`.

Critério de aceite validado:
- servidor Next.js iniciado localmente;
- `GET /` respondeu HTTP `200`;
- HTML continha `<p>Projeto institucional em construção.</p>` renderizado por `Message`.

Observação:
- uma porta ocupada por servidor de validação anterior foi identificada e o processo correspondente foi encerrado antes da prova final;
- nenhum Design System completo, tema, token ou componente interativo foi criado.

Commit:
```text
feat(ui): add shared message component
```

## LOOP 0.10 — Concluído

Escopo atual:
- configurar ESLint flat config na raiz para TypeScript e Next.js;
- adotar Prettier como formatter comum;
- adicionar scripts raiz de lint, correção e formatação;
- formatar e validar somente código/configuração do workspace;
- não antecipar regras específicas de funcionalidades futuras.

Implementado:
- configuração ESLint flat na raiz com regras recomendadas de Next.js, TypeScript e compatibilidade com Prettier;
- Prettier adotado como formatter comum, com configuração e exclusões explícitas;
- scripts raiz `lint`, `lint:fix`, `format` e `format:check`;
- arquivos existentes normalizados pelo formatter e import não utilizado removido;
- builds opcionais de dependências nativas não necessárias mantidos desabilitados pelo pnpm.

Checks executados com sucesso:
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck` — UI, validation, db, API, web e Worker aprovados;
- `pnpm test` — 2 testes do schema e 1 teste da API aprovados;
- `pnpm build` — pacotes e aplicações compilados, incluindo build estático do Next.js;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check` — nenhuma incompatibilidade de peer dependency;
- `git diff --check`.

Critério de aceite validado:
- `pnpm lint` concluído sem erros ou avisos.

Observação:
- nenhuma regra específica de funcionalidades futuras foi adicionada.

Commit:
```text
chore: configure lint and formatter
```

## LOOP 0.11 — Concluído

Escopo atual:
- criar o primeiro `docker-compose.dev.yml`;
- adicionar somente PostgreSQL, Redis e MinIO;
- limitar portas publicadas ao host local de desenvolvimento;
- manter credenciais reais fora do Git;
- não antecipar volumes, healthchecks, persistência ou bucket inicial dos loops 0.12 a 0.14.

Implementado:
- composição de desenvolvimento nomeada `portal-fumep-dev`;
- PostgreSQL 17, Redis 8 e MinIO com versão explícita;
- credenciais parametrizadas por variáveis obrigatórias, documentadas em `.env.example`;
- portas publicadas exclusivamente em `127.0.0.1` para uso local;
- arquivo `.env` local ignorado pelo Git para a validação dos containers.

Checks executados com sucesso:
- `docker compose --env-file .env -f docker-compose.dev.yml config --quiet`;
- `docker compose --env-file .env -f docker-compose.dev.yml up -d`;
- inspeção Docker dos três containers;
- logs de inicialização dos três serviços;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `git diff --check`.

Critério de aceite validado:
- `portal-fumep-dev-postgres-1` em estado `running` e aceitando conexões;
- `portal-fumep-dev-redis-1` em estado `running` e aceitando conexões;
- `portal-fumep-dev-minio-1` em estado `running`, com API e console inicializados.

Observação:
- volumes, healthchecks, persistência do Redis e bucket inicial permanecem reservados aos loops seguintes.

Commit:
```text
chore: add development infrastructure compose
```

## LOOP 0.12 — Concluído

Escopo atual:
- adicionar volume persistente ao PostgreSQL;
- adicionar healthcheck nativo com `pg_isready`;
- documentar e consumir `DATABASE_URL`;
- comprovar a conexão a partir do workspace da API com uma consulta mínima;
- não antecipar configuração Drizzle, migrations, schema ou domínio.

Implementado:
- volume nomeado `postgres_data` montado no diretório de dados do PostgreSQL;
- healthcheck com `pg_isready`, usando usuário e banco do ambiente;
- `DATABASE_URL` documentada em `.env.example` e configurada apenas no `.env` local ignorado;
- driver PostgreSQL mínimo no workspace da API;
- comando `db:check` que abre conexão, executa `SELECT 1` e a encerra corretamente.

Checks executados com sucesso:
- validação do Docker Compose;
- `docker compose ... up -d --wait postgres`;
- PostgreSQL confirmado como `healthy`;
- `pnpm --filter @fumep/api db:check`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `git diff --check`.

Critério de aceite validado:
- a API conectou ao PostgreSQL pela `DATABASE_URL` e executou consulta mínima com sucesso.

Observação:
- a integração com Drizzle e migrations permanece reservada ao loop 1.1.

Commit:
```text
feat(db): add postgres development connection check
```

## LOOP 0.13 — Concluído

Escopo atual:
- exigir senha no Redis de desenvolvimento;
- habilitar persistência AOF em volume nomeado;
- adicionar healthcheck autenticado;
- documentar e consumir `REDIS_URL`;
- comprovar `PING` a partir do workspace da API;
- não antecipar sessões, BullMQ ou cache.

Implementado:
- senha obrigatória do Redis recebida exclusivamente pelo ambiente;
- persistência AOF habilitada em volume nomeado `redis_data`;
- healthcheck autenticado com `redis-cli`;
- `REDIS_URL` documentada em `.env.example` e configurada apenas no `.env` ignorado;
- cliente Redis mínimo e comando `redis:check` no workspace da API.

Checks executados com sucesso:
- validação do Docker Compose;
- `docker compose ... up -d --wait redis`;
- Redis confirmado como `healthy`;
- PING sem senha rejeitado com `NOAUTH`;
- `pnpm --filter @fumep/api redis:check`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `git diff --check`.

Critério de aceite validado:
- a API conectou ao Redis autenticado e recebeu `PONG`.

Observação:
- sessões, BullMQ e cache permanecem fora deste loop.

Commit:
```text
feat(auth): secure development redis
```

## LOOP 0.14 — Concluído

Escopo atual:
- adicionar volume persistente ao MinIO;
- adicionar healthcheck HTTP nativo;
- criar idempotentemente os buckets canônicos `portal-public` e `portal-private`;
- documentar a configuração de acesso local;
- comprovar acesso a partir do workspace da API;
- não antecipar uploads, processamento ou Biblioteca de Mídia.

Implementado:
- volume nomeado `minio_data` para persistência dos objetos;
- healthcheck HTTP no endpoint interno de saúde do MinIO;
- hook pós-inicialização idempotente com o cliente `mc` já presente na imagem;
- buckets canônicos `portal-public` e `portal-private`;
- configuração local do endpoint documentada em `.env.example`;
- cliente MinIO mínimo e comando `storage:check` no workspace da API.

Checks executados com sucesso:
- validação do Docker Compose;
- `docker compose ... up -d --wait minio`;
- MinIO confirmado como `healthy`;
- listagem dos buckets pelo cliente `mc`;
- `pnpm --filter @fumep/api storage:check`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `git diff --check`.

Critério de aceite validado:
- a API acessou o MinIO e confirmou os dois buckets iniciais.

Observação:
- uploads, metadados, processamento e Biblioteca de Mídia permanecem fora deste loop.

Commit:
```text
feat(media): initialize development minio storage
```

## LOOP 0.15 — Concluído

Escopo atual:
- auditar o endpoint público `GET /api/v1/health` já criado no bootstrap;
- confirmar resposta estritamente igual a `{ "status": "ok" }`;
- validar contrato compartilhado, documentação OpenAPI e teste Supertest existentes;
- não expor dependências, versões, credenciais ou topologia interna;
- não antecipar health administrativo detalhado.

Implementado/auditado:
- rota pública `GET /api/v1/health` sob o prefixo global da API;
- controller fino delegando ao `HealthService`;
- resposta tipada pelo contrato compartilhado `HealthResponse`;
- documentação OpenAPI com exemplo público mínimo;
- teste Supertest que exige resposta exatamente igual a `{ "status": "ok" }`.

Checks executados com sucesso:
- execução HTTP real em porta isolada: status `200`;
- corpo real exatamente `{"status":"ok"}`;
- `Content-Type: application/json; charset=utf-8`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — contrato e endpoint aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `git diff --check`.

Critério de aceite validado:
- o corpo estritamente mínimo não contém hostname, versões, credenciais, topologia ou detalhes de dependências.

Observação:
- o endpoint havia sido criado no bootstrap inicial e não precisou de alteração artificial; este loop auditou e comprovou formalmente seu contrato público.

Commit:
```text
docs: validate minimal public health endpoint
```

## LOOP 0.16 — Concluído

Escopo atual:
- criar um workflow único de CI para Pull Requests direcionados à `main`;
- instalar pnpm e Node.js com cache de dependências;
- executar instalação congelada, lint, typecheck, testes e build;
- aplicar permissões mínimas e cancelamento de execuções obsoletas;
- não implementar deploy, publicação de imagens ou branch protection.

Implementado:
- workflow `.github/workflows/ci.yml` acionado em Pull Requests para `main`;
- job único em Ubuntu e Node.js 24, com cache do pnpm;
- pnpm obtido a partir da versão declarada pelo projeto;
- instalação com lockfile congelado;
- etapas separadas de lint, typecheck, testes e build;
- permissões `contents: read`, timeout e cancelamento de execuções obsoletas.

Checks executados com sucesso:
- `pnpm exec prettier --check .github/workflows/ci.yml` — YAML válido e formatado;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `git diff --check`.

Critério de aceite validado:
- o gatilho `pull_request` direcionado à `main` executa o job com toda a sequência canônica da CI.

Observação:
- deploy, imagens e branch protection não foram configurados.

Commit:
```text
ci: add initial pull request checks
```

## LOOP 0.17 — Concluído

Escopo atual:
- configurar a proteção da branch `main` no GitHub;
- exigir o check `Lint, types, tests and build` antes do merge;
- exigir que a branch esteja atualizada antes do merge;
- não adicionar reviews obrigatórios ou outras regras de governança.

Implementado:
- repositório publicado em `https://github.com/teusmoura/fumep`;
- proteção clássica habilitada na branch `main`;
- status check obrigatório `Lint, types, tests and build`;
- política estrita habilitada para exigir branch atualizada;
- force-push e exclusão da branch desabilitados.

Checks executados com sucesso:
- leitura da proteção pela API do GitHub;
- `required_status_checks.strict` confirmado como `true`;
- contexto obrigatório confirmado como `Lint, types, tests and build`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `git diff --check`.

Critério de aceite validado:
- merges na `main` ficam bloqueados enquanto o check obrigatório não for aprovado.

Observação:
- nenhuma exigência adicional de review, assinatura ou histórico linear foi adicionada.

Commit:
```text
docs: record main branch protection
```

## LOOP 1.1 — Concluído

Escopo atual:
- configurar o cliente Drizzle PostgreSQL em `packages/db`;
- adicionar configuração do Drizzle Kit;
- criar schema inicial vazio e diretório versionado de migrations;
- gerar e executar uma migration vazia no banco de desenvolvimento;
- não criar tabelas, dados iniciais ou repositories de domínio.

Implementado:
- cliente Drizzle sobre `postgres-js` exportado por `@fumep/db`;
- schema TypeScript inicial explicitamente vazio;
- `drizzle.config.ts` com dialeto PostgreSQL e carregamento seguro da `DATABASE_URL` local;
- scripts `db:generate` e `db:migrate` no pacote de banco;
- migration custom vazia `0000_initialize.sql` e metadados do Drizzle versionados;
- autorização explícita apenas dos scripts do `esbuild` necessários ao Drizzle Kit.

Checks executados com sucesso:
- `pnpm --filter @fumep/db db:generate` — 0 tabelas e nenhuma alteração adicional;
- `pnpm --filter @fumep/db db:migrate` — migration aplicada com sucesso e reaplicação idempotente;
- PostgreSQL de desenvolvimento confirmado como `healthy`;
- tabela interna `drizzle.__drizzle_migrations` com 1 registro;
- schema `public` confirmado com 0 tabelas;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 3 testes aprovados;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `git diff --check`.

Critério de aceite validado:
- a migration vazia foi executada e registrada no banco de desenvolvimento.

Observação:
- nenhuma tabela, entidade, seed ou repository de domínio foi criado.

Commit:
```text
feat(db): configure drizzle migrations
```

## LOOP 1.2 — Concluído

Escopo atual:
- criar a tabela `institutions` somente com os campos essenciais do loop;
- preservar UUID, TIMESTAMPTZ e snake_case;
- implementar repository com create, read, update e delete;
- testar o CRUD contra PostgreSQL isolado;
- preparar a CI para executar migrations e testes de banco;
- não antecipar tema, settings, mídia ou outras entidades.

Implementado:
- tabela `institutions` com UUID gerado no banco, `name`, `slug` único, `is_active` e timestamps com fuso;
- migration aditiva `0001_sudden_juggernaut.sql` gerada pelo Drizzle Kit;
- tipos inferidos `Institution` e `NewInstitution`;
- `InstitutionRepository` com criação, consulta por id, listagem ordenada, atualização e exclusão;
- teste de integração cobrindo o ciclo CRUD e exclusão inexistente;
- serviço PostgreSQL efêmero e etapa de migration adicionados à CI antes dos testes.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_2_test`;
- `pnpm --filter @fumep/db test` — CRUD aprovado em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 4 testes aprovados entre validation, db e API;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- repository criou, leu, listou, atualizou e excluiu uma instituição em PostgreSQL real.

Observação:
- nenhum campo de tema, setting, logo ou relacionamento futuro foi criado.

Commit:
```text
feat(db): add institution repository
```

## LOOP 1.3 — Concluído

Escopo atual:
- criar enum `user_role` com `ADMIN` e `EDITOR`;
- criar a tabela `users` com os campos definidos no loop;
- garantir unicidade case-insensitive do e-mail;
- testar migration, defaults, papéis e constraint de e-mail em PostgreSQL;
- não implementar login, hash, sessão ou vínculo institucional.

Implementado:
- enum PostgreSQL `user_role` restrito a `ADMIN` e `EDITOR`;
- tabela `users` com UUID, nome, e-mail, hash de senha, papel, estado ativo e timestamps com fuso;
- índice único funcional sobre `lower(email)`;
- índices de consulta para `role` e `is_active`;
- migration aditiva `0002_unusual_energizer.sql`;
- testes de schema para ambos os papéis, valor padrão ativo e unicidade case-insensitive;
- configuração Vitest restrita aos testes-fonte de `packages/db`, evitando coleta de artefatos compilados.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_3_test`;
- `pnpm --filter @fumep/db test` — 2 arquivos e 4 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 7 testes aprovados entre validation, db e API;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- tabela e modelagem de usuário foram aplicadas e testadas em PostgreSQL real.

Observação:
- nenhum login, serviço de hash, sessão ou vínculo institucional foi implementado.

Commit:
```text
feat(db): add user schema
```

## LOOP 1.4 — Concluído

Escopo atual:
- criar a tabela associativa `user_institutions`;
- definir chaves estrangeiras para usuário e instituição e chave primária composta;
- provar em PostgreSQL que um usuário pode pertencer a múltiplas instituições;
- não implementar autorização, login, sessão ou outras relações de domínio.

Implementado:
- tabela `user_institutions` com `user_id`, `institution_id` e timestamp com fuso;
- chave primária composta que impede vínculos duplicados;
- chaves estrangeiras com `ON DELETE CASCADE` para usuário e `ON DELETE RESTRICT` para instituição;
- migration aditiva `0003_broad_hulk.sql`;
- testes de associação múltipla e rejeição de vínculo duplicado;
- execução serial dos arquivos de integração do pacote de dados para preservar o isolamento das fixtures.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_4_test`;
- `pnpm --filter @fumep/db test` — 3 arquivos e 6 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 9 testes aprovados entre validation, db e API;
- `pnpm build` — pacotes e aplicações compilados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- um único usuário foi associado a duas instituições distintas em PostgreSQL real.

Observação:
- nenhuma regra de autorização, login, sessão ou relação de domínio futura foi implementada.

Commit:
```text
feat(db): add user institution relation
```

## LOOP 1.5 — Concluído

Escopo atual:
- criar a tabela `pages` com os oito campos mínimos definidos pelo plano;
- criar o enum canônico `publication_status` e validar seu padrão `DRAFT`;
- vincular autoria opcional a usuários e testar a estrutura em PostgreSQL;
- não implementar instituição, SEO, agendamento, blocos, versões ou publicação.

Implementado:
- enum PostgreSQL `publication_status` com `DRAFT`, `SCHEDULED`, `PUBLISHED` e `EXPIRED`;
- tabela `pages` com os oito campos mínimos, UUID e timestamps com fuso;
- estado padrão `DRAFT`, índice de status e autoria opcional referenciada em `users`;
- migration aditiva `0004_glorious_lockjaw.sql`;
- testes do padrão, campos mínimos, autoria e todos os estados do enum.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_5_test`;
- `pnpm --filter @fumep/db test` — 4 arquivos e 10 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 13 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- a estrutura mínima de `Page` foi criada e exercitada em PostgreSQL real.

Observação:
- `institution_id` e sua unicidade composta permanecem reservados ao loop 1.6; nenhum campo futuro foi antecipado.

Commit:
```text
feat(db): add minimum page schema
```

## LOOP 1.6 — Concluído

Escopo atual:
- adicionar a instituição obrigatória à página com relação N:1;
- garantir unicidade de slug por instituição;
- validar em PostgreSQL slugs iguais entre instituições e duplicidade proibida na mesma instituição;
- não criar associação N:N nem antecipar campos ou funcionalidades futuras.

Implementado:
- coluna obrigatória `pages.institution_id` com chave estrangeira para `institutions` e exclusão restrita;
- índice de consulta por instituição;
- índice único composto `pages_institution_slug_unique` sobre instituição e slug;
- migration aditiva `0005_old_mongu.sql`;
- teste que aceita o mesmo slug em instituições diferentes e rejeita repetição na mesma instituição;
- fixtures existentes de Page ajustadas para respeitar a nova relação obrigatória.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_6_test`;
- `pnpm --filter @fumep/db test` — 4 arquivos e 11 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 14 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- toda página exige exatamente uma instituição, com slug único no respectivo escopo institucional.

Observação:
- nenhuma tabela associativa Page–Institution ou funcionalidade de loops futuros foi criada.

Commit:
```text
feat(db): scope pages by institution
```

## LOOP 1.7 — Concluído

Escopo atual:
- criar `content_blocks` com os campos definidos no plano atual;
- restringir proprietários a `PAGE` e `ARTICLE`, persistir `data` em JSONB e ordenar por posição;
- aplicar defaults estruturais e unicidade de anchor por proprietário;
- não implementar Registry, schemas de blocos, renderização, preview, publicação ou versões.

Implementado:
- enum PostgreSQL `block_owner_type` limitado a `PAGE` e `ARTICLE`;
- tabela `content_blocks` com UUID, proprietário polimórfico, tipo, posição, visibilidade, versão de schema, fundo, mídia de fundo, anchor, JSONB e timestamps com fuso;
- defaults `is_visible = true`, `schema_version = 1` e `background = DEFAULT`;
- índice composto para leitura ordenada por proprietário;
- unicidade de anchor por proprietário;
- migration aditiva `0006_brainy_monster_badoon.sql`;
- testes para dados estruturados, ordenação, visibilidade, defaults, versões e anchor duplicado.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_7_test`;
- `pnpm --filter @fumep/db test` — 5 arquivos e 14 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 17 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- ContentBlock armazenou dados JSONB estruturados, visibilidade e posições ordenadas para um proprietário.

Observação:
- `background_media_id` permanece UUID sem chave estrangeira até a criação canônica da entidade de mídia; Registry, schemas Zod por bloco, renderização, preview, publicação e versões não foram antecipados.

Commit:
```text
feat(builder): add content block schema
```

## LOOP 1.8 — Concluído

Escopo atual:
- criar `page_versions` com snapshots JSONB numerados por página;
- garantir unicidade de versão e exclusão em cascata com a página;
- validar que alterações posteriores na página não modificam snapshots persistidos;
- não implementar restauração, versionamento por bloco, endpoints, preview ou publicação.

Implementado:
- tabela `page_versions` com UUID, referência à página, número, snapshot JSONB, autoria opcional e timestamp com fuso;
- exclusão em cascata das versões quando a página é removida;
- índice de consulta por página e unicidade composta de página e número de versão;
- migration aditiva `0007_open_leper_queen.sql`;
- testes que preservam o snapshot após alteração da página e rejeitam número duplicado na mesma página.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_8_test`;
- `pnpm --filter @fumep/db test` — 6 arquivos e 16 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 19 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- PageVersion preservou um snapshot numerado mesmo após a alteração dos dados vivos da página.

Observação:
- não há `updated_at`, restauração automática, versionamento individual de bloco, endpoint, preview ou publicação.

Commit:
```text
feat(builder): add immutable page versions
```

## LOOP 1.9 — Concluído

Escopo atual:
- criar `audit_logs` com ator opcional, ação, entidade, metadados, IP e timestamp;
- preservar eventos ao excluir fisicamente o usuário, anulando apenas a referência;
- testar a estrutura inicial em PostgreSQL;
- não implementar catálogo completo, instrumentação, endpoints ou interface de consulta.

Implementado:
- tabela `audit_logs` com UUID, usuário opcional, ação, tipo/id da entidade, metadata JSONB, endereço INET e timestamp com fuso;
- referência ao usuário com `ON DELETE SET NULL`, preservando integralmente o evento;
- índices para ator, entidade e ordenação temporal;
- migration aditiva `0008_fixed_sheva_callister.sql`;
- testes de persistência do evento e preservação após exclusão física do usuário.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_9_test`;
- `pnpm --filter @fumep/db test` — 7 arquivos e 18 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 21 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- AuditLog registrou evento administrativo e permaneceu armazenado após a exclusão física do ator.

Observação:
- nenhum catálogo completo, instrumentação, endpoint ou interface de auditoria foi antecipado.

Commit:
```text
feat(db): add initial audit log schema
```

## LOOP 1.10 — Concluído

Escopo atual:
- criar `redirects` com origem única, destino, código HTTP e timestamp;
- usar 301 como padrão e restringir códigos a 301, 302, 307 e 308;
- testar defaults, unicidade e constraint em PostgreSQL;
- não implementar resolução HTTP, geração automática, endpoints ou interface administrativa.

Implementado:
- tabela `redirects` com UUID, origem única, destino, código HTTP e timestamp com fuso;
- código padrão 301 e constraint PostgreSQL limitada a 301, 302, 307 e 308;
- migration aditiva `0009_eager_pestilence.sql`;
- testes de valor padrão, unicidade de origem, todos os códigos permitidos e rejeição de código inválido.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_1_10_test`;
- `pnpm --filter @fumep/db test` — 8 arquivos e 24 testes aprovados em banco limpo;
- migration aplicada no banco de desenvolvimento;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 27 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- Redirect armazenou origem única, destino e apenas códigos HTTP canônicos, usando 301 por padrão.

Observação:
- resolução HTTP, geração automática, endpoints e interface administrativa não foram antecipados.

Commit:
```text
feat(db): add redirect schema
```

## LOOP 2.1 — Concluído

Escopo atual:
- adicionar Argon2 ao backend com build nativo explicitamente permitido;
- criar serviço de geração e verificação de hashes Argon2id;
- testar hash diferente do texto, senha válida, senha inválida e salt distinto;
- não implementar login, sessão, cookies, recuperação, guards ou endpoints.

Implementado:
- dependência `argon2` adicionada à API e build nativo autorizado explicitamente no workspace;
- `PasswordHasherService` injetável com geração Argon2id e verificação pelo formato PHC do hash;
- testes confirmando prefixo Argon2id, ausência do texto original, senha válida, senha inválida e salts distintos.

Checks executados com sucesso:
- `pnpm rebuild argon2`;
- `pnpm --filter @fumep/api typecheck`;
- `pnpm --filter @fumep/api test` — 2 arquivos e 4 testes aprovados;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 30 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm ignored-builds` — `argon2` não aparece entre os builds explicitamente ignorados;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- a senha gerou hash Argon2id diferente do texto original e foi verificada corretamente sem exposição do segredo.

Observação:
- login, sessão, cookie, recuperação de senha, guards, autorização e endpoints não foram implementados.

Commit:
```text
feat(auth): add Argon2id password hashing
```

## LOOP 2.2 — Concluído

Escopo atual:
- implementar `POST /api/v1/auth/login` com validação Zod e OpenAPI;
- autenticar somente usuário ativo por e-mail normalizado e Argon2id;
- criar sessão Redis e cookie HttpOnly, SameSite=Lax e Secure em produção;
- testar sucesso, falhas e persistência Redis sem implementar guards, logout ou recuperação.

Implementado:
- contrato Zod compartilhado para login com normalização de e-mail e rejeição de campos extras;
- `AuthUserRepository` para localizar somente usuário ativo e carregar seu escopo institucional;
- `AuthService` com verificação Argon2id e payload server-side contendo usuário, papel, instituições e limites temporais;
- `RedisSessionStore` com identificador opaco aleatório, chave `session:{id}` e TTL de inatividade de 30 minutos;
- `POST /api/v1/auth/login` documentado no OpenAPI, com resposta neutra de credenciais inválidas;
- cookie `fumep_session` HttpOnly, SameSite=Lax, Path `/`, Secure em produção e Max-Age de 30 minutos;
- decisão AUTH-001 registrada como resolvida em favor da implementação Redis/cookie no loop 2.2;
- build pré-teste do contrato compartilhado para funcionamento em checkout limpo.

Checks executados com sucesso:
- migrations aplicadas do zero em `portal_fumep_loop_2_2_test`;
- `pnpm test` com PostgreSQL isolado e Redis real — 38 testes aprovados;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 38 testes aprovados entre validation, db e API;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm ignored-builds`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- credenciais válidas criaram sessão server-side e cookie seguro; senha incorreta, usuário ausente/inativo e payload inválido foram rejeitados.

Observação:
- guards, leitura e logout de sessão, recuperação de senha e autorização institucional não foram implementados.

Commit:
```text
feat(auth): implement login with Redis session
```

## LOOP 2.3 — Concluído

Escopo atual:
- tornar configuráveis os limites de inatividade e duração absoluta da sessão;
- consolidar uso dessas configurações no Redis, payload e cookie;
- validar defaults, overrides, modo produção, TTL e encerramento do cliente;
- não implementar leitura de sessão, logout, recuperação, guards ou autorização.

Implementado:
- `SessionConfig` central com inatividade e duração absoluta configuráveis por ambiente;
- defaults canônicos de 30 minutos e 8 horas, com rejeição de valores inválidos;
- cookie Secure derivado do ambiente e Max-Age derivado do limite de inatividade;
- payload com expiração absoluta derivada da configuração;
- TTL Redis derivado da mesma configuração;
- encerramento gracioso da conexão Redis no ciclo de vida do módulo;
- testes de defaults, overrides, produção, configurações inválidas, TTL e payload persistido.

Checks executados com sucesso:
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 41 testes aprovados entre validation, db e API, incluindo Redis real;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- a sessão permanece somente no Redis, usa limites temporais configuráveis e expõe ao navegador apenas cookie com flags canônicas.

Observação:
- leitura de sessão, logout, recuperação de senha, guards e autorização não foram implementados.

Commit:
```text
feat(auth): harden Redis session configuration
```

## LOOP 2.4 — Concluído

Escopo atual:
- implementar `GET /api/v1/auth/session` a partir do cookie opaco;
- consultar, validar e renovar a inatividade da sessão no Redis;
- rejeitar sessão ausente, desconhecida, corrompida ou absolutamente expirada;
- não implementar logout, recuperação, guards ou autorização institucional.

Implementado:
- contrato Zod estrito para o payload interno de sessão;
- leitura e validação do payload Redis por identificador opaco recebido no cookie;
- renovação do timestamp de atividade e do TTL de inatividade em sessão válida;
- remoção automática de payload corrompido ou absolutamente expirado;
- `GET /api/v1/auth/session` documentado no OpenAPI;
- resposta pública limitada a id, papel e instituições do usuário, sem session ID ou timestamps internos;
- testes Redis e E2E para sessão válida, ausente, desconhecida, corrompida e expirada.

Checks executados com sucesso:
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 45 testes aprovados entre validation, db e API, incluindo Redis real;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `pnpm exec prettier --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- uma sessão Redis válida foi consultada pelo cookie sem expor identificador ou dados internos; sessões inválidas foram rejeitadas.

Observação:
- logout, recuperação de senha, guards e autorização institucional não foram implementados.

Commit:
```text
feat(auth): expose current session endpoint
```

## LOOP 2.5 — Concluído

Escopo atual:
- implementar `POST /api/v1/auth/logout` de forma idempotente;
- remover do Redis a sessão indicada pelo cookie atual;
- invalidar `fumep_session` com as flags canônicas;
- testar remoção real, expiração do cookie e ausência de sessão;
- não implementar recuperação, guards, CSRF ou autorização institucional.

Implementado:
- contrato do armazenamento de sessão ampliado com remoção idempotente;
- exclusão da chave `session:{sessionId}` no adapter Redis;
- contrato do cookie centralizado para login, leitura e logout;
- `POST /api/v1/auth/logout` documentado no OpenAPI;
- cookie invalidado com Path `/`, HttpOnly, SameSite=Lax e Secure em produção;
- resposta idempotente mesmo quando o cookie ou a sessão já não existem;
- testes E2E e Redis para exclusão, cookie expirado e repetição segura.

Checks executados com sucesso:
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm --filter @fumep/api test` — 18 testes aprovados;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 48 testes aprovados entre validation, db e API, incluindo Redis real;
- `pnpm build`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- logout removeu a sessão do Redis e enviou ao navegador a expiração do cookie com as flags canônicas.

Observação:
- recuperação de senha, guards, CSRF e autorização institucional não foram implementados.

Commit:
```text
feat(auth): implement logout
```

## LOOP 2.6 — Concluído

Escopo atual:
- implementar `SessionGuard` com leitura do cookie e validação da sessão server-side;
- anexar a identidade autenticada à requisição;
- proteger `GET /api/v1/auth/session` como endpoint autenticado de prova;
- testar sessão válida, ausente e inválida via Supertest;
- não implementar regras de papel, instituição ou recuperação de senha.

Implementado:
- `SessionGuard` NestJS que lê o cookie canônico e valida a sessão pelo `AuthService`;
- identidade autenticada anexada como `request.auth` somente após validação;
- `GET /api/v1/auth/session` protegido pelo guard e simplificado para consumir a identidade da requisição;
- esquema de autenticação por cookie declarado no OpenAPI e associado ao endpoint protegido;
- guard registrado e exportado pelo módulo de autenticação para reutilização em endpoints futuros.

Checks executados com sucesso:
- `pnpm --filter @fumep/api typecheck`;
- `pnpm --filter @fumep/api test` — 18 testes aprovados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 48 testes aprovados entre validation, db e API, incluindo Redis real;
- `pnpm build`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- endpoint protegido aceitou sessão válida, expôs sua identidade e rejeitou cookie ausente ou sessão desconhecida com HTTP 401.

Observação:
- regras de papel, instituição e recuperação de senha não foram implementadas.

Commit:
```text
feat(auth): add session guard
```

## LOOP 2.7 — Concluído

Escopo atual:
- implementar `RoleGuard` com metadados declarativos de papéis permitidos;
- suportar somente os papéis canônicos `ADMIN` e `EDITOR`;
- executar o guard depois do `SessionGuard` em um controller de teste;
- testar papel permitido e papel autenticado não permitido;
- não implementar escopo institucional ou recuperação de senha.

Implementado:
- decorator `@Roles()` tipado pelos papéis presentes na sessão;
- `RoleGuard` com leitura de metadados no método ou controller;
- suporte estrito aos papéis canônicos `ADMIN` e `EDITOR`;
- rejeição HTTP 401 defensiva quando o guard recebe requisição sem identidade autenticada;
- registro e exportação do guard pelo módulo de autenticação;
- controller exclusivo de teste com cadeia `SessionGuard` seguida de `RoleGuard`.

Checks executados com sucesso:
- `pnpm --filter @fumep/api typecheck`;
- `pnpm --filter @fumep/api test` — 20 testes aprovados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 50 testes aprovados entre validation, db e API, incluindo Redis real;
- `pnpm build`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- endpoint protegido por `ADMIN` aceitou a sessão administrativa com HTTP 200 e rejeitou a sessão `EDITOR` com HTTP 403.

Observação:
- escopo institucional, conteúdo multi-institucional e recuperação de senha não foram implementados.

Commit:
```text
feat(auth): add role guard
```

## LOOP 2.8 — Concluído

Escopo atual:
- implementar `InstitutionGuard` com instituição-alvo declarada por parâmetro de rota;
- permitir acesso global a `ADMIN`;
- limitar `EDITOR` às instituições presentes na identidade autenticada;
- testar a regra isolada do guard;
- não implementar conteúdo multi-institucional nem a matriz E2E do próximo loop.

Implementado:
- decorator `@InstitutionParam()` para declarar explicitamente o parâmetro de rota que identifica a instituição-alvo;
- `InstitutionGuard` com leitura da identidade produzida pelo `SessionGuard`;
- acesso global para `ADMIN` independentemente de vínculo institucional;
- acesso de `EDITOR` limitado à presença da instituição-alvo em `institutionIds`;
- rejeição defensiva de requisição sem identidade autenticada;
- registro e exportação do guard pelo módulo de autenticação;
- testes unitários da regra institucional simples.

Checks executados com sucesso:
- `pnpm --filter @fumep/api typecheck`;
- `pnpm --filter @fumep/api test` — 22 testes aprovados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 52 testes aprovados entre validation, db e API, incluindo Redis real;
- `pnpm build`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- o guard permitiu acesso de Editor à instituição atribuída, negou instituição fora do escopo e preservou acesso global do Administrador.

Observação:
- conteúdo multi-institucional, matriz E2E de permissão e recuperação de senha não foram implementados.

Commit:
```text
feat(auth): add institution guard
```

## LOOP 2.9 — Concluído

Escopo atual:
- criar prova E2E da cadeia `SessionGuard`, `RoleGuard` e `InstitutionGuard`;
- representar um Editor vinculado somente à ETMSL;
- validar acesso à ETMSL com HTTP 200;
- validar tentativa de acesso ao CRAMAM com HTTP 403;
- não alterar a lógica dos guards nem implementar conteúdo multi-institucional.

Implementado:
- controller disponível somente na suíte E2E para representar um recurso institucional;
- sessão determinística de Editor vinculada exclusivamente à ETMSL;
- cadeia real `SessionGuard`, `RoleGuard` e `InstitutionGuard` aplicada à rota de teste;
- cenário ETMSL autorizado com HTTP 200;
- cenário CRAMAM rejeitado com HTTP 403.

Checks executados com sucesso:
- `pnpm --filter @fumep/api typecheck`;
- `pnpm --filter @fumep/api test` — 24 testes aprovados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 54 testes aprovados entre validation, db e API, incluindo Redis real;
- `pnpm build`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- Editor ETMSL recebeu HTTP 200 ao acessar ETMSL e HTTP 403 ao tentar acessar CRAMAM.

Observação:
- nenhuma lógica de produção foi alterada; conteúdo multi-institucional e recuperação de senha não foram implementados.

Commit:
```text
test(auth): cover simple institution permissions
```

## LOOP 2.10 — Concluído

Escopo atual:
- estender o metadado institucional para múltiplos parâmetros-alvo;
- exigir que `EDITOR` possua todas as instituições vinculadas;
- preservar acesso global de `ADMIN` e compatibilidade com escopo simples;
- testar Editor com escopo completo e parcial;
- não implementar entidades de conteúdo, CSRF, rate limiting ou recuperação de senha.

Implementado:
- novo decorator `@InstitutionParams()` para declarar múltiplas instituições-alvo;
- `@InstitutionParam()` simples preservado como atalho compatível;
- `InstitutionGuard` ampliado para exigir correspondência de todos os parâmetros declarados;
- regra de acesso global de `ADMIN` preservada;
- testes para Editor com todas as instituições exigidas e Editor com escopo parcial.

Checks executados com sucesso:
- `pnpm --filter @fumep/api typecheck`;
- `pnpm --filter @fumep/api test` — 25 testes aprovados;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 55 testes aprovados entre validation, db e API, incluindo Redis real;
- `pnpm build`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- Editor com escopo completo foi autorizado e Editor sem uma das instituições vinculadas foi rejeitado.

Observação:
- nenhuma entidade de conteúdo, proteção CSRF, rate limiting ou recuperação de senha foi implementada.

Commit:
```text
feat(auth): enforce multi-institution scope
```

## LOOP 2.11 — Bloqueado

Escopo analisado:
- proteção CSRF em métodos mutáveis autenticados;
- token CSRF, `SameSite=Lax` e validação de `Origin`/`Referer`;
- integração com sessão Redis e logout idempotente.

Bloqueio:
- os documentos canônicos não definem o padrão e armazenamento do token, seu canal de entrega, a configuração de origens confiáveis nem o tratamento do logout;
- a decisão afeta o contrato público da API, o payload de sessão Redis e a compatibilidade com o aceite do loop 2.5;
- o caso foi registrado como `AUTH-002` em `docs/ISSUES_ARCHITECTURE.md`, com uma proposta concreta de resolução.

Resultado:
- nenhuma alteração de código foi feita no loop 2.11;
- `docs/CURRENT_LOOP.md` permanece no loop 2.11 até decisão explícita.

## LOOP 2.11 — Concluído

Decisão AUTH-002 autorizada:
- token sincronizado e armazenado na sessão Redis;
- entrega por login e consulta de sessão, com envio em `X-CSRF-Token`;
- origem confiável configurada por `APP_ORIGIN`;
- logout sem cookie permanece idempotente e sessão válida exige token e origem.

Implementado:
- token criptográfico por sessão persistido e validado pelo schema Redis;
- token entregue no login e em `GET /auth/session` para uso no header `X-CSRF-Token`;
- validação com comparação em tempo constante;
- origem exata configurada por `APP_ORIGIN`, obrigatória em produção, aceitando `Origin` ou `Referer`;
- `CsrfGuard` reutilizável para `POST`, `PUT`, `PATCH` e `DELETE` autenticados;
- logout autenticado protegido, mantendo limpeza idempotente quando não existe sessão.

Checks executados com sucesso:
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 57 testes aprovados;
- `pnpm build`;
- `pnpm peers check`;
- `git diff --check`.

Critério de aceite validado:
- mutação autenticada rejeitou token ausente e origem hostil, preservando a sessão, e aceitou token/origem válidos.

Commit:
```text
feat(auth): add csrf protection
```

## LOOP 2.12 — Concluído

Escopo atual:
- limitar login a 5 tentativas por minuto por IP e por conta normalizada;
- manter contadores compartilhados e expiração atômica no Redis;
- contar payloads inválidos por IP e retornar HTTP 429 acima do limite;
- testar concorrência, expiração, isolamento e rejeição HTTP;
- não implementar recuperação de senha ou funcionalidades futuras.

Implementado:
- contadores Redis separados por IP e conta normalizada, com identificadores SHA-256 nas chaves;
- política inicial de 5 tentativas por janela de 60 segundos;
- incremento e expiração inicial atômicos por Lua, inclusive entre instâncias concorrentes;
- janela fixa sem renovação por tentativas bloqueadas;
- payloads inválidos também consomem o limite por IP;
- rejeição HTTP 429 antes de consultar credenciais, sem criar cookie ou sessão, com `Retry-After: 60` e OpenAPI;
- testes Redis reais de concorrência, isolamento, normalização, expiração e limites independentes;
- testes Supertest de limite HTTP e rejeição de spoofing de `X-Forwarded-For`.

Checks executados com sucesso:
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 62 testes aprovados;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Observação:
- uma incompatibilidade de inferência de tipos Redis foi corrigida antes do typecheck final;
- o endereço usado é o IP da conexão, sem confiar em headers de proxy fornecidos pelo cliente; configuração de proxy confiável permanece no escopo de deployment;
- recuperação de senha não foi implementada.

Critério de aceite validado:
- cinco tentativas foram permitidas e a sexta foi bloqueada, por IP ou conta, com retorno à janela inicial após expiração.

Commit:
```text
feat(auth): limit login attempts with Redis
```

## LOOP 2.13 — Concluído

Escopo atual:
- implementar solicitação inicial `POST /api/v1/auth/forgot-password` com contrato Zod;
- normalizar o e-mail e devolver resposta neutra sem consultar a existência de conta;
- limitar a 5 solicitações por hora por IP e conta com contadores Redis separados dos de login;
- testar validação, neutralidade, limites e isolamento entre políticas;
- reservar tokens e redefinição aos loops 2.14–2.15; não enviar e-mail nesta etapa.

Implementado:
- schema Zod estrito para e-mail normalizado da solicitação;
- endpoint REST e OpenAPI com resposta pública neutra em português;
- nenhuma consulta de usuário, cookie ou token na resposta desta etapa inicial;
- política Redis de 5 solicitações por hora por IP e conta, com namespace independente de login;
- adapter atômico existente reutilizado por políticas, sem duplicar acesso ao Redis;
- testes de validação, neutralidade, limites HTTP, janela de uma hora e isolamento de login.

Checks executados com sucesso:
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 68 testes aprovados;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- e-mails válidos receberam a mesma resposta e pedidos acima do limite receberam HTTP 429; payloads inválidos foram rejeitados e contados por IP.

Observação:
- o endpoint estabelece o contrato inicial previsto neste loop; tokens, envio de link e redefinição ainda não estão disponíveis.

Commit:
```text
feat(auth): add neutral password recovery request
```

## LOOP 2.14 — Concluído

Escopo atual:
- criar `password_reset_tokens` com UUID, hash único, datas com fuso e FK em cascata;
- emitir token aleatório de alta entropia, armazenando somente SHA-256;
- aplicar validade de 30 minutos e disponibilizar emissão apenas como serviço interno;
- testar migration limpa, repository, hash, expiração e cascata;
- não implementar reset, envio de e-mail ou invalidação de sessões.

Implementado:
- tabela canônica com UUID, `token_hash` único, datas TIMESTAMPTZ e referência a usuário com `ON DELETE CASCADE`;
- índices por usuário e expiração;
- migration aditiva `0010_groovy_meggan.sql`;
- repository Drizzle de persistência, sem campo para token original;
- serviço interno de emissão com 32 bytes aleatórios, representação base64url e hash SHA-256;
- expiração de 30 minutos e retorno do token apenas ao chamador interno;
- adapter lazy de banco com encerramento da conexão no ciclo de vida do módulo;
- build pré-teste dos pacotes db e validation para checkout limpo.

Checks executados com sucesso:
- todas as migrations aplicadas do zero em `portal_fumep_loop_2_14_test`;
- `pnpm --filter @fumep/db test` — 29 testes aprovados no banco isolado;
- migration aplicada no banco local;
- `pnpm format:check`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test` — 73 testes aprovados;
- `pnpm build`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Critério de aceite validado:
- tokens distintos de alta entropia foram emitidos com somente hash persistido e validade de 30 minutos; unicidade, FK e cascata foram comprovadas no PostgreSQL.

Observação:
- o gerador Drizzle foi repetido fora do sandbox após erro de runtime e concluiu sem alterar migrations anteriores;
- emissão é interna e ainda não está conectada ao envio de e-mail; reset e invalidação de sessões não foram antecipados.

Commit:
```text
feat(auth): add secure password reset tokens
```

## LOOP 2.15 — Concluído

Escopo autorizado (AUTH-003):
- endpoint Zod/OpenAPI e Argon2id;
- transação de senha, consumo e auditoria, condicionada à revogação Redis;
- testes de validade, concorrência e falha de revogação;
- reforço do ciclo de vida no loop 2.16.

Escopo analisado:
- reset por token único e expirável;
- atualização Argon2id e consumo atômico;
- exigência canônica de revogar sessões após o sucesso.

Implementado:
- contrato Zod estrito e endpoint REST documentado em OpenAPI;
- token SHA-256 validado por expiração e consumo, com bloqueio de linha para uso único concorrente;
- Argon2id, senha mínima de 10 caracteres e rejeição de conta desativada;
- senha, consumo e PASSWORD_RESET em transação; falha Redis faz rollback e permite retry;
- remoção atômica das sessões do usuário, incluindo sessões legadas; refresh condicional não recria sessão revogada;
- testes PostgreSQL e Supertest de sucesso, rejeição, concorrência, rollback, auditoria e revogação real Redis.

Checks aprovados:
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- `pnpm test`: 80 testes (6 validation, 32 db, 42 API);
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Aceite: token válido redefine a senha uma única vez; tokens desconhecidos, expirados ou consumidos falham. Revogação obrigatória comprovada.

Observações:
- AUTH-003 resolvida por autorização; 2.16 reforçará o ciclo de vida;
- falhas iniciais de import no teste, lint e formato corrigidas e checks repetidos;
- sem alteração de schema/migration; banco local de desenvolvimento;
- a revogação percorre sessões Redis em um script atômico (custo proporcional ao keyspace); apropriada ao escopo V1, sem índice adicional;
- emissão/envio de e-mail não antecipados; sem UI, acessibilidade visual não aplicável.

Commit: `feat(auth): reset passwords and revoke sessions`.

## LOOP 2.16 — Concluído

Escopo atual:
- múltiplas sessões, isolamento e sessão legada;
- refresh concorrente sem ressurreição e revogação idempotente;
- reset rejeitado preserva sessões; reset válido exige novo login.

Implementado e comprovado:
- duas sessões anteriores rejeitadas com HTTP 401 após reset;
- sessão de outro usuário preservada;
- novo login com nova senha e consulta de sessão aprovados;
- reset inválido não revoga sessões;
- sessão legada removida e revogação repetida segura;
- vinte refreshes concorrentes não ressuscitam sessão removida.

Checks aprovados:
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 82 testes: 6 validation, 32 db e 44 API;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Sem mudanças de produção, schema, migrations ou UI; aceite cumprido sem falhas. AUTH-003 orientou o loop a reforçar testes, pois a revogação já integra o 2.15.

Commit: `test(auth): verify password reset session lifecycle`.

## LOOP 3.1 — Concluído

Escopo atual:
- CRUD REST/OpenAPI de Institution usando repository existente;
- Zod estrito, ADMIN obrigatório e CSRF;
- testes de CRUD, validação, acesso e conflitos.

Implementado:
- módulo/controller/service NestJS e adapter lazy Drizzle;
- GET/POST `/api/v1/institutions` e GET/PATCH/DELETE por UUID;
- contratos Zod estritos, nomes com limite 150, slugs com limite 100 e updates não vazios;
- SessionGuard, ADMIN e CSRF; respostas 400/401/403/404/409 e exclusão 204;
- conflitos PostgreSQL mapeados sem SQL, nomes de constraints ou segredos;
- OpenAPI das cinco operações e seis testes Supertest;
- exportações do AuthModule ajustadas para reutilização dos guards entre módulos.

Checks aprovados:
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 88 testes: 6 validation, 32 db e 50 API;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Aceite cumprido: ADMIN opera CRUD, EDITOR/visitante bloqueados em todas as rotas, CSRF e conflitos comprovados em PostgreSQL. Falha inicial de injeção corrigida e checks repetidos. Sem schema/migration nova ou UI; campos de settings/tema/logo não antecipados.

Commit: `feat(api): add admin institution CRUD`.

## LOOP 3.2 — Concluído

Escopo atual:
- settings 1:1 em PostgreSQL com cascata;
- contato, links e aparência SYSTEM/LIGHT/DARK;
- contratos, repository, API ADMIN/CSRF e testes.

Implementado:
- tabela 1:1, FK cascata, contato e JSONB de links, enum de aparência com padrão SYSTEM;
- repository upsert parcial com preservação de campos e isolamento;
- GET/PATCH `/api/v1/institutions/:id/settings` com ADMIN/CSRF e OpenAPI;
- `email` da API mapeado a `contact_email` canônico no banco;
- URLs HTTP(S) sem credenciais, limites e entradas estritas;
- limpeza de campos com null e validação de aparência;
- migration `0011_small_caretaker.sql`, três testes DB, dois de contrato e cenário Supertest.

Checks aprovados:
- todas as migrations do zero em `portal_fumep_loop_3_2_test`, 35 testes DB aprovados;
- migration aplicada no banco local;
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 94 testes: 8 validation, 35 db e 51 API;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Aceite completo. ENOMEM do gerador no sandbox resolvido fora dele; tipagem de URL corrigida no pacote compartilhado. Sem UI, temas ou logos antecipados. O banco isolado foi preservado para diagnóstico.

Commit: `feat(institutions): add contact and appearance settings`.

## LOOP 3.3 — Concluído

Escopo atual:
- quatro tokens de cor de Theme incorporados a Institution;
- formato hexadecimal e contraste validado;
- persistência/configuração ADMIN e testes.

Implementado:
- Theme incorporado a Institution conforme permissão explícita do domínio canônico;
- primary, primary_foreground, accent, accent_foreground, com padrão neutro preto/branco;
- PATCH `/api/v1/institutions/:id/theme` protegido por ADMIN/CSRF e documentado;
- cores hexadecimais normalizadas, sem CSS livre, contraste mínimo 4.5:1 nos dois pares;
- migration `0012_free_havok.sql`, testes de repository, contrato e Supertest.

Checks aprovados:
- migrations do zero em `portal_fumep_loop_3_3_test`, 35 testes DB;
- migration aplicada no banco local;
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 97 testes: 10 validation, 35 db e 52 API;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Aceite cumprido. Arquitetura conforme com observação: Theme incorporado em Institution, sem tabela adicional; tokens mínimos neutros, não definição final de branding. Sem logos, frontend ou CSS livre. Sem falhas nesta rodada.

Commit: `feat(institutions): add controlled theme colors`.

## LOOP 3.4 — Concluído

Escopo atual:
- contrato opcional de referências futuras light/dark;
- instituição válida sem logos, com teste de ausência;
- sem upload, tabela Media, FK, consulta ou vínculo funcional.

Implementado:
- schema Zod estrito e tipo compartilhado de configuração de logo;
- variantes light/dark opcionais e nullable, referências futuras UUID;
- dois testes comprovam ausência permitida e rejeição de URLs/campos arbitrários;
- nenhum campo/API funcional de mídia criado.

Checks aprovados:
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 99 testes: 12 validation, 35 db e 52 API;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Aceite cumprido sem falhas: instituições válidas sem logo e contrato preparado sem dependência funcional Media. Sem schema/migration/UI.

Commit: `feat(validation): prepare optional institution logo configuration`.

## LOOP 3.5 — Concluído

Escopo atual:
- enum compartilhado SYSTEM/LIGHT/DARK;
- padrão e transições, sem duplicar persistência do 3.2;
- testes de preservação dos demais settings.

Implementado:
- enum Zod e tipo AppearanceDefault compartilhados;
- schema de settings reutiliza o enum;
- testes PostgreSQL do padrão SYSTEM e transições LIGHT/DARK/SYSTEM sem perda de contato;
- teste de contrato rejeita aliases, valores nulos e tipos inválidos.

Checks aprovados:
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 101 testes: 13 validation, 36 db e 52 API;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm peers check`;
- `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml`;
- `git diff --check`.

Aceite completo sem falhas; persistência já exigida no 3.2 foi reutilizada, sem migration duplicada. Sem frontend ou UI.

Commit: `test(institutions): consolidate appearance defaults and transitions`.

## LOOP 3.6 — Concluído

Escopo autorizado THEME-001:
- GET público restrito de tema por slug para instituições ativas;
- contrato compartilhado e OpenAPI, sem contatos/dados administrativos;
- consumo server-only Next.js e ThemeContext compartilhado;
- SSR, aparência e testes da fronteira pública.

Implementado:
- THEME-001 resolvido por autorização explícita; GET `/api/v1/public/institutions/:slug/theme` expõe somente identidade, quatro cores e aparência;
- instituições ausentes/inativas retornam 404 neutro; CRUD ADMIN/CSRF permanece protegido;
- contrato Zod estrito, OpenAPI e repository por slug, sem alteração de schema/migration;
- loader server-only sem credenciais, com timeout e validação; `API_INTERNAL_URL` obrigatório em produção;
- ThemeContext compartilhado, SSR e aparência LIGHT/DARK/SYSTEM; raiz FUMEP mantém fallback neutro quando a fonte está indisponível;
- testes de fronteira pública, loader, provider e semântica da página; sem rotas institucionais ou preferência manual dos próximos loops.

Checks aprovados:
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 109 testes: 13 validation, 36 db, 53 API e 7 frontend;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`, `pnpm peers check`;
- Prettier do workflow e `git diff --check`;
- sem script Playwright/axe disponível nesta etapa; testes SSR preservam main, heading e fallback, com foco/skip link existentes.

Falhas corrigidas: typings DOM, schema Swagger e transformação JSX OXC. Instalação concorrente foi refeita sequencialmente; suites API serializadas para eliminar timeout de inicialização sob contenção. Checks finais verdes, sem bloqueios.

Aceite cumprido. execute-loop disciplinou escopo/status; architecture-guard condicionou a fronteira pública à decisão THEME-001, agora autorizada. Loop anterior commitado e worktree inicialmente limpo.

Commit: `feat(theme): expose public themes and add server-loaded context`.

## LOOP 3.7 — Concluído

Escopo atual:
- InstitutionContext por rota: `/` FUMEP, `/etmsl` ETMSL e `/cramam` CRAMAM;
- página compartilhada com loader público e ThemeContext existentes;
- SSR, isolamento entre instituições e fallback sem dados privados;
- sem preferência manual de tema, menus ou conteúdo dos próximos loops.

Estado inicial: loop 3.6 concluído no commit `56ed3e0`, Git limpo.

Implementado:
- resolver por segmentos completos e identidade compartilhada (slug, nome institucional e rota da Home);
- InstitutionProvider/useInstitution sem estado global mutável, identidade disponível também no fallback;
- três entradas de rota usam uma única página server-rendered e carregam somente o tema da instituição atual;
- proteção adicional contra tema de slug divergente; fallback neutro não expõe detalhes internos;
- testes do contexto, rotas reais, retorno à FUMEP, isolamento e indisponibilidade; main/heading e skip link/foco existentes preservados.

Checks aprovados:
- `pnpm --filter @fumep/web test` (17 testes) e `pnpm --filter @fumep/web typecheck`;
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 119 testes: 13 validation, 36 db, 53 API e 17 frontend;
- `pnpm peers check`, `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml` e `git diff --check`;
- build confirma `/`, `/etmsl` e `/cramam` dinâmicas com renderização no servidor;
- Playwright/axe ainda sem script disponível; não executados nem declarados como aprovados.

Aceite cumprido sem falhas de execução/testes. Sem alteração de API, schema, dependências ou funcionalidades futuras. execute-loop manteve o escopo; nextjs-frontend orientou reutilização e SSR; testing-qa orientou fixtures determinísticas e testes de isolamento.

Commit: `feat(institutions): resolve public route context`.

## LOOP 3.8 — Concluído

Escopo atual:
- prioridade preferência manual → ADMIN → sistema nos três temas;
- controle LIGHT/DARK acessível compartilhado;
- cookie somente visual, lido no SSR para evitar flash da preferência persistida;
- testes de prioridade, SSR e interação, sem funcionalidades futuras.

Estado inicial: loop 3.7 concluído no commit `360cf6c`, Git limpo.

Implementado:
- prioridade centralizada manual → ADMIN → sistema, sem duplicação por instituição;
- ThemeSwitcher compartilhado com botão nativo, nome acessível estável no SSR, foco visível e tokens institucionais;
- cookie `fumep_appearance` apenas LIGHT/DARK, Path=/, SameSite=Lax, um ano e Secure em HTTPS; não acessa sessão/credenciais;
- leitura server-only via cookies async do Next.js; preferência manual já determina data-appearance no HTML inicial;
- SYSTEM mantém media query CSS antes da hidratação e acompanha mudanças do dispositivo; ADMIN explícito e manual não são sobrescritos;
- armazenamento bloqueado não impede alternância em memória;
- jsdom somente de desenvolvimento para testes de interação/foco e hidratação.

Checks aprovados:
- `pnpm --filter @fumep/web test` (25 testes antes do teste adicional de armazenamento) e `pnpm --filter @fumep/web typecheck`;
- `pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 128 testes finais: 13 validation, 36 db, 53 API e 26 frontend;
- `pnpm peers check`, `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml` e `git diff --check`;
- testes cobrem prioridades completas, três instituições, cookie inválido, Secure, storage bloqueado, foco, sistema e hidratação sem divergência;
- Playwright/axe e QA visual em navegador não executados; ainda sem script E2E disponível.

Aceite cumprido, checks verdes e sem falhas nesta rodada. Resolução inicial da preferência persistida no SSR e SYSTEM por CSS evitam troca visual tardia. Fallback neutro existente sem fonte de tema foi preservado. Sem API/migration ou funcionalidades futuras. execute-loop manteve escopo/status; nextjs-frontend orientou SSR sem flash e controle compartilhado; testing-qa orientou testes determinísticos de prioridade/interação.

Commit: `feat(theme): add persistent visitor dark mode preference`.

## LOOP 3.9 — Concluído

Escopo atual:
- reutilizar validação de contraste do 3.3;
- testar referências numéricas, limites, normalização e independência dos pares;
- Supertest comprova rejeição sem persistir alteração;
- testar tokens nos temas LIGHT/DARK das três instituições;
- sem alteração de branding, schema/migration ou escopo de mídia.

Estado inicial: loop 3.8 concluído no commit `520f2f1`, Git limpo.

Implementado:
- testes de referência sRGB (preto/branco, canais RGB e cinzas adjacentes ao limite), simetria e rejeição sem arredondar para 4.5;
- pares primary/foreground e accent/foreground testados independentemente, com posições invertidas;
- normalização dos quatro tokens e manutenção da validação no contrato público LIGHT/DARK/SYSTEM;
- Supertest/PostgreSQL comprova que quatro configurações inválidas retornam 400 sem alterar registro, timestamp ou projeção pública;
- testes SSR dos quatro tokens validados em FUMEP, ETMSL e CRAMAM LIGHT/DARK;
- validação de produção do 3.3 reutilizada sem duplicar regras, alterar branding ou criar migrations.

Checks aprovados:
- `pnpm --filter @fumep/validation test` (16 testes), `pnpm --filter @fumep/web test` (27 testes);
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 133 testes finais: 16 validation, 36 db, 54 API e 27 frontend;
- `pnpm peers check`, `.\\node_modules\\.bin\\prettier.cmd --check .github/workflows/ci.yml` e `git diff --check`;
- sem mudanças de dependências/lockfile; Playwright/axe e QA visual não executados, ainda sem script E2E disponível.

Aceite cumprido sem falhas nesta rodada. Contraste mínimo 4.5:1 aplicado aos dois pares e rejeição antes da persistência comprovada. Não é auditoria completa de acessibilidade visual. execute-loop manteve o escopo; testing-qa orientou referências determinísticas e prova de não persistência; nextjs-frontend orientou a matriz SSR das instituições.

Commit: `test(theme): verify contrast boundaries and persistence safety`.

## LOOP 4.1 — Concluído

Escopo atual:
- tabela Media e migration aditiva, metadados canônicos, checksum e status;
- repository mínimo create/findById e testes de constraints;
- migration em banco local e do zero, checks disponíveis;
- sem upload, Worker, categorias, variantes, MediaUsage ou logos.

Estado inicial: loop 3.9 concluído no commit `e40bc01`, Git limpo.
Observação de precedência: Storage §21/modelo lógico §8.2 definem stored_filename, size_bytes e uploaded_by; são usados em vez dos aliases filename, size e created_by do plano. category_id/FK/índice ficam no loop 4.13, sem tabela futura antecipada.

Implementado:
- Media com UUID, TIMESTAMPTZ, nomes canônicos, storage_key relativo e metadados de acessibilidade/dimensões;
- enums media_type e media_processing_status, padrão PENDING;
- SHA-256 obrigatório hexadecimal minúsculo, índice não único permite duplicidade;
- BIGINT preservado como bigint, tamanho não negativo e dimensões opcionais positivas;
- uploaded_by nullable com ON DELETE SET NULL e índices de tipo/uploader/data/checksum;
- repository somente create/findById, sem exclusão insegura antes de MediaUsage;
- migration aditiva `0013_windy_juggernaut.sql`, sem alterações nas tabelas anteriores.

Checks aprovados:
- geração e aplicação local da migration;
- todas as migrations do zero em `portal_fumep_loop_4_1_test`, com 40 testes DB aprovados;
- `pnpm --filter @fumep/db test` (40 testes também no ambiente local);
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- 137 testes finais: 16 validation, 40 db, 54 API e 27 frontend;
- `pnpm peers check`, Prettier do workflow e `git diff --check`;
- sem alteração de dependências/lockfile; E2E/axe não disponíveis nesta etapa; acessibilidade de metadados apenas, sem UI nova.

Falha resolvida: drizzle-kit no sandbox retornou uv_os_get_passwd ENOMEM; geração repetida com execução autorizada fora dessa restrição passou. Sem falhas pendentes.

Aceite cumprido. architecture-guard: conforme com observação de nomenclatura e categoria futura; drizzle-data-model orientou UUID/TIMESTAMPTZ, constraints e migration limpa; media-storage orientou metadados sem arquivos no banco e checksum não único; execute-loop manteve escopo/commit.

Commit: `feat(db): add canonical media metadata model`.

## LOOP 4.2 — Bloqueado por decisão MEDIA-001

Escopo analisado:
- upload autenticado/CSRF Browser → NestJS → MinIO → PostgreSQL;
- autorização de criação de mídia global antes de categorias institucionais.

Estado inicial: loop 4.1 concluído no commit `ef3b1d0`, Git limpo.
Evidências: Segurança limita EDITOR por instituição; Storage usa categoria institucional; MediaCategory só no 4.13. A documentação não define criação global por EDITOR neste estágio. uploaded_by não é ownership institucional.

Recomendação MEDIA-001: autorização explícita para upload somente ADMIN no 4.2; EDITOR 403 até categorizações/escopo no 4.13, sem schema alternativo ou antecipação de categoria.

Nenhuma implementação de upload ou alteração de permissão feita. CURRENT_LOOP permanece 4.2. execute-loop/architecture-guard exigem decisão antes dessa implementação; não declarar o loop concluído.
Checks completos da última implementação: 137 testes, format, lint, typecheck, build, peers e workflow verdes no 4.1, além de migrations local/do zero. Nesta análise só documentação mudou; `git diff --check` executado.

Commit de registro: `docs: record transitional media upload authorization decision`.
