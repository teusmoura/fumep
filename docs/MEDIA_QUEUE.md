# Fila de mídia

Loop 4.6 configurou o producer BullMQ `media`, namespace `bull:media`, compartilhado em `@fumep/jobs`. A API disponibiliza um provedor com encerramento pelo lifecycle NestJS. Loop 4.7 enfileira PROCESS_MEDIA após persistir Media e recebe o job no apps/worker.

`REDIS_URL` deve apontar para Redis interno (`redis:` ou `rediss:`). Credenciais não são registradas. PostgreSQL continua sendo a fonte de verdade do domínio. O Redis de desenvolvimento usa AOF; a fila não substitui o registro Media.

Defaults operacionais: três tentativas por job, backoff exponencial de 1 segundo, até 100 logs e sem stack traces retidos. Retention de concluídos: 86400 segundos/1000 jobs; falhos: 604800 segundos/5000 jobs. Valores positivos configuráveis por `MEDIA_QUEUE_COMPLETED_AGE`, `MEDIA_QUEUE_COMPLETED_COUNT`, `MEDIA_QUEUE_FAILED_AGE` e `MEDIA_QUEUE_FAILED_COUNT`. BullMQ aplica retention na finalização dos jobs, não por timer independente. Estes defaults não antecipam políticas de processamento.

Producer limita retries por request a um e reconexões iniciais a três; consumidores terão configuração própria para conexões bloqueantes. Diagnóstico: `pnpm --filter @fumep/api queue:check` executa leitura Redis via BullMQ, sem criar job ou consumir fila. Erros de conexão geram log estruturado sem URL/credenciais.

## Recepção PROCESS_MEDIA (4.7)

Payload estrito Zod: `{ mediaId: UUID }`. ID determinístico `process-media-<uuid>` (sem dois-pontos, proibidos pelo BullMQ). Nenhum byte, bucket, credential ou dado editorial vai no payload. Apenas upload novo enfileira; aviso/seleção de duplicata não.

Falha Redis após persistência mantém resposta de upload, original e Media PENDING, com log `media_enqueue_failed`. Não existe transação PostgreSQL/Redis. Recuperação pode reenfileirar pelo producer usando o ID persistido; não há ainda varredura automática de mídia neste loop.

Worker: `pnpm --filter @fumep/worker build`, então, na pasta apps/worker, `node --env-file=../../.env dist/main.js`. Conexões bloqueantes usam maxRetriesPerRequest=null (reconexão contínua não significa retry infinito de job); concorrência `MEDIA_WORKER_CONCURRENCY` de 1 a 32, default 2. SIGINT/SIGTERM fecha consumidor antes de PostgreSQL.

O consumidor relê Media do PostgreSQL e rejeita payload inválido/referência ausente/tipo diferente permanentemente. Indisponibilidade do lookup sofre até três tentativas. Logs estruturados registram identificação segura, tentativa, início/fim, duração e resumo sanitizado.

IMPORTANTE: 4.7 é um checkpoint incremental de recepção. Job concluído aqui significa apenas entrega validada, NÃO imagem processada. Media permanece PENDING; nenhum READY, dimensão ou variante é gravado. Não usar este checkpoint como pipeline final de produção. Sharp será adicionado no 4.8, variantes no 4.9 e estados no 4.10; mídias recebidas neste checkpoint precisarão de reprocessamento ao disponibilizar o pipeline completo.

Testes reais usam namespace UUID exclusivo `fumep-test-queue-*`, verificam persistência, deduplicação e fechamento e removem apenas suas fixtures. Não usam FLUSHDB nem limpam `bull:media`. O addon nativo opcional msgpackr-extract permanece bloqueado; o fallback JavaScript passou nos testes.

CI provisiona Redis/MinIO pelo Compose no projeto efêmero `portal-fumep-ci`, além de PostgreSQL do runner. Credenciais desse workflow são fixtures descartáveis, não credenciais de implantação. A limpeza afeta somente esse projeto de testes. Execução remota da CI e validação Docker local não foram realizadas: CLI Docker indisponível no ambiente atual.
