# Fila de mídia

Loop 4.6 configura somente o producer BullMQ `media`, namespace `bull:media`, compartilhado em `@fumep/jobs`. A API disponibiliza um provedor com encerramento pelo lifecycle NestJS. Upload ainda não enfileira jobs; consumidor PROCESS_MEDIA pertence ao loop 4.7.

`REDIS_URL` deve apontar para Redis interno (`redis:` ou `rediss:`). Credenciais não são registradas. PostgreSQL continua sendo a fonte de verdade do domínio. O Redis de desenvolvimento usa AOF; a fila não substitui o registro Media.

Defaults operacionais: três tentativas por job, backoff exponencial de 1 segundo, até 100 logs e sem stack traces retidos. Retention de concluídos: 86400 segundos/1000 jobs; falhos: 604800 segundos/5000 jobs. Valores positivos configuráveis por `MEDIA_QUEUE_COMPLETED_AGE`, `MEDIA_QUEUE_COMPLETED_COUNT`, `MEDIA_QUEUE_FAILED_AGE` e `MEDIA_QUEUE_FAILED_COUNT`. BullMQ aplica retention na finalização dos jobs, não por timer independente. Estes defaults não antecipam políticas de processamento.

Producer limita retries por request a um e reconexões iniciais a três; consumidores terão configuração própria para conexões bloqueantes. Diagnóstico: `pnpm --filter @fumep/api queue:check` executa leitura Redis via BullMQ, sem criar job ou consumir fila. Erros de conexão geram log estruturado sem URL/credenciais.

Testes reais usam namespace UUID exclusivo `fumep-test-queue-*`, verificam persistência, deduplicação e fechamento e removem apenas suas fixtures. Não usam FLUSHDB nem limpam `bull:media`. O addon nativo opcional msgpackr-extract permanece bloqueado; o fallback JavaScript passou nos testes.

CI provisiona Redis/MinIO pelo Compose no projeto efêmero `portal-fumep-ci`, além de PostgreSQL do runner. Credenciais desse workflow são fixtures descartáveis, não credenciais de implantação. A limpeza afeta somente esse projeto de testes. Execução remota da CI e validação Docker local não foram realizadas: CLI Docker indisponível no ambiente atual.
