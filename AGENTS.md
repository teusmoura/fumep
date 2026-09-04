# AGENTS.md — Portal FUMEP

## Missão

Você está trabalhando na V1 do Portal FUMEP, um portal institucional multi-institucional para FUMEP, ETMSL e CRAMAM.

O projeto deve ser implementado em **loops pequenos, verificáveis e cumulativos**. Não antecipe funcionalidades de loops futuros.

## Fonte de verdade documental

Antes de implementar qualquer mudança arquitetural, consulte:

1. `docs/architecture/MANIFESTO_CANONICO_V1.md`
2. `docs/architecture/PLANO_IMPLEMENTACAO_V1_LOOPS_CANONICO.md`
3. o documento especializado correspondente em `docs/architecture/`

Em caso de conflito:

```text
documento especializado canônico
↓
Plano de Implementação canônico
↓
Modelo de Dados Lógico canônico
↓
Modelo de Domínio
```

Não use documentos históricos ou versões antigas fora de `docs/architecture/`.

## Arquitetura obrigatória V1

```text
Frontend: Next.js
Backend: NestJS
Linguagem: TypeScript
API: REST
Validação: Zod
OpenAPI: obrigatório
Banco: PostgreSQL
ORM: Drizzle ORM
Sessões: Redis
JWT: proibido
Filas: BullMQ
Worker: apps/worker separado
Storage: MinIO
Imagens: Sharp
Analytics: Matomo
Reverse proxy: Nginx
Orquestração: Docker Compose
CI/CD: GitHub Actions
E2E: Playwright
Unitários: Vitest
API tests: Supertest
Acessibilidade automatizada: axe-core
```

## Regra central de execução

Leia `docs/CURRENT_LOOP.md` antes de começar.

Trabalhe **somente no loop atual**.

Não implemente itens do próximo loop mesmo que pareçam fáceis.

Se perceber que o loop exige mudar uma decisão arquitetural:
1. não altere silenciosamente;
2. registre o conflito em `docs/ISSUES_ARCHITECTURE.md`;
3. pare essa parte da implementação;
4. continue apenas no que não depende da decisão conflitante.

## Processo obrigatório por loop

1. Ler o loop atual no plano canônico.
2. Inspecionar o estado do repositório.
3. Implementar somente o escopo do loop.
4. Criar/ajustar testes aplicáveis.
5. Executar checks aplicáveis.
6. Corrigir todas as falhas introduzidas.
7. Atualizar `docs/LOOP_STATUS.md`.
8. Atualizar `docs/CURRENT_LOOP.md` apenas se todos os critérios de aceite forem satisfeitos.
9. Commitar as alterações.
10. Confirmar `git status` limpo.

## Checks

Quando existirem no projeto:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Quando E2E já existir:

```bash
pnpm test:e2e
```

Não declare um loop concluído sem executar os checks disponíveis.

## Git

- Não criar branch automaticamente.
- Não reescrever histórico.
- Não usar `git reset --hard` para contornar problemas.
- Não alterar commits anteriores.
- Um loop concluído deve terminar em commit.
- Preferir commits pequenos e descritivos.

Formato sugerido:

```text
chore: ...
feat(db): ...
feat(auth): ...
feat(media): ...
feat(builder): ...
test: ...
docs: ...
```

## Escopo e simplicidade

Não introduzir sem decisão explícita:

- Kubernetes;
- Elasticsearch;
- OpenSearch;
- Meilisearch;
- microserviços;
- event sourcing;
- CQRS completo;
- JWT;
- 2FA;
- frontend separado por instituição;
- CSS livre no Page Builder;
- grid livre estilo Elementor.

## Segurança

- Autorização sempre no backend.
- Nunca confiar em esconder botão no frontend como controle de acesso.
- Nunca armazenar senha, token ou sessão em código ou Git.
- Nunca usar `localStorage` para credenciais/sessão.
- Sanitizar conteúdo rico.
- Validar upload por extensão, MIME e magic bytes.
- Não expor PostgreSQL, Redis, MinIO Admin, Matomo Admin ou Worker à internet.

## Qualidade

Definition of Done:

```text
funcionalidade
+
testes
+
documentação
+
acessibilidade aplicável
+
segurança básica
+
checks verdes
+
commit
```

## Skills do projeto

Skills repo-localizadas ficam em `.agents/skills/`.

Use-as quando a tarefa corresponder ao seu escopo:

- `execute-loop`: executar um loop do plano com disciplina de escopo.
- `architecture-guard`: verificar aderência às decisões canônicas.
- `nestjs-api`: implementar backend NestJS seguindo padrões do projeto.
- `drizzle-data-model`: implementar schema/migrations/repositories Drizzle.
- `nextjs-frontend`: implementar frontend Next.js e Design System.
- `testing-qa`: criar e executar testes conforme a estratégia V1.
- `page-builder`: trabalhar com ContentBlocks, Registry, Preview e publicação.
- `media-storage`: trabalhar com MinIO, Media, variantes, Sharp e MediaUsage.
- `security-access`: trabalhar com sessão Redis, guards, CSRF e permissões.
- `jobs-worker`: trabalhar com BullMQ, Worker, retries e idempotência.

## Comunicação final do agente

Ao concluir uma tarefa, informe objetivamente:

- loop trabalhado;
- arquivos alterados;
- testes/checks executados;
- resultado;
- commit criado;
- próximo loop;
- bloqueios, se houver.
