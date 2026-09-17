# Exclusão recuperável de mídia — loop 4.16 / MEDIA-002

Contrato canônico: Storage §55.1–55.5, Jobs §6.1 e modelo lógico §8.2. Migration 0018 aditiva: NONE/REQUESTED/FAILED, intenção/solicitante, três tentativas duráveis e erro allowlisted. Não é processamento de imagem, lixeira ou restauração.

## Uso administrativo

Na `/admin/media/library`, “Excluir arquivo” abre confirmação acessível. Sessão/CSRF e instituição são revalidados no backend; esconder ações não constitui autorização. DELETE `/api/v1/media/:id` retorna 202 `{ mediaId, status: "REQUESTED" }` após commit da intenção e MEDIA_DELETE_REQUESTED. Arquivos em uso ou PROCESSING retornam 409 antes de qualquer remoção, com MEDIA_DELETE_BLOCKED e sem revelar owners estrangeiros. IDs inválidos: 400; ausentes: 404. Falha PostgreSQL antes do commit: 503 sem enqueue; falha de enqueue depois do commit: intenção preservada e recuperada pelo Worker.

REQUESTED repetido não reinicia contador/solicitante nem duplica auditoria. REQUESTED/FAILED desaparecem da busca/duplicatas reutilizáveis/seleção/processamento consultável, e synchronize rejeita novos usos após obter o row lock. Consumidores futuros devem persistir owner/usages na mesma transação e revalidar disponibilidade ao publicar/restaurar. Nenhum consumidor de logos/Builder foi antecipado.

ADMIN tem formulário de recuperação por referência UUID na biblioteca. POST `/api/v1/media/:id/deletion/retry` aceita somente FAILED, com sessão/CSRF/reautorização e ausência de usos/PROCESSING, renova intenção/contador e audita MEDIA_DELETE_RETRY_REQUESTED. Não restaura objetos nem concede remoção forçada. EDITOR recebe 403. Não há listagem de diagnóstico completa neste loop; guardar a referência da solicitação para investigação autorizada.

## Worker e recuperação

Fila media, DELETE_MEDIA, payload Zod estrito somente mediaId, ID `delete-media-<uuid>`. O executor e reconciler compartilham advisory lock PostgreSQL por hash MEDIA_DELETE/UUID lowercase. O driver ReservedSql não implementa options/begin requeridos pelo Drizzle; usa-se cliente privado max=1, sem idle/max_lifetime, dedicado até o unlock/end (nunca devolvido a pool compartilhado). O endereço de conexão vem do factory em memória, sem gravá-lo/logá-lo. Queda do processo libera locks no servidor.

Reserva de tentativa em commit anterior ao I/O. Cleanup em transação com Media FOR UPDATE: verificar intenção/usos/PROCESSING, validar todo o conjunto de chaves contra UUID/prefixos canônicos antes de tocar objetos, remover variantes deduplicadas → original → Media/metadados + MEDIA_DELETED no mesmo commit. Objetos ausentes são sucesso. Falha conserva intenção/chaves; rollback não tenta restaurar arquivos por backup em memória. Auditoria final falha: Media continua indisponível e a próxima tentativa aceita objetos já ausentes.

Espera por cada remoção limitada a 15 segundos. Timeout não cancela necessariamente o request MinIO já enviado; uma conclusão tardia de remoção idempotente não torna Media selecionável, pois a intenção nunca retorna a NONE. Retries/recuperação usam as mesmas chaves, e IDs não são reaproveitados. Até três tentativas persistidas por ciclo, inclusive reservas anteriores a quedas. BullMQ usa backoff exponencial de 1 segundo. Exaustão/falha final: FAILED/auditoria/código sanitizado; nenhum retry de cleanup automático infinito. Falhas de dependência podem derrubar o processo; a intenção PostgreSQL é recuperada no próximo startup do Worker supervisionado, sem presumir que Redis/MinIO/PG são atômicos.

Reconciler local: startup e 60 segundos, sem sobreposição, lote até 100, cursor data/id para não deixar itens posteriores famintos, try advisory lock. Preserva waiting/delayed/active/waiting-children; recria ausentes e terminais completed/failed/unknown com orçamento. FAILED não é reenfileirado. Redis indisponível conserva intenção; PostgreSQL indisponível impede remoção. Shutdown encerra timer/aguarda scan, fecha Worker/producer e banco. Logs de execução possuem ID validado/tipo/tentativa/timestamps/duração/resumo seguro, nunca raw errors/segredos.

## Verificação e fixtures

Testes PostgreSQL reais cobrem constraints, idempotência, indisponibilidade, corrida uso/processamento × intenção, advisory lock através de commits, reserva durável, rollback/replay/exaustão/retry e chaves estrangeiras. Supertest cobre REST/CSRF/escopo/status/auditoria/falhas de enqueue/persistência; React/jsdom cobre confirmação/cancelamento/foco/202/409 e recuperação explícita.

Worker usa exclusivamente o banco de fixture `portal_fumep_loop_4_16_test`, derivado do DATABASE_URL para o mesmo servidor e com todas as migrations aplicadas. Esse banco foi criado do zero e preservado; não sobrescrever/drop de bancos existentes. Redis usa prefixos UUID exclusivos; MinIO usa chaves UUID das fixtures, com limpeza restrita. CI provisiona a base isolada antes dos testes; execução remota de CI não foi realizada localmente.

Testes Redis/MinIO reais cobrem retry, job perdido/terminal, scanners concorrentes, locks ativos, cursor >100 e shutdown. Falha real da auditoria é injetada por trigger temporária na base isolada, removida em finally. Quedas são verificadas em processo filho isolado que encerra após remover variante ou original; contagem/intenção sobrevivem, objetos restantes são limpos por replay e auditoria não duplica. Não terminar processos/conexões do banco principal para injetar falhas. E2E de navegador/axe/QA visual não foram executados.
