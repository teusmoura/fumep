# MediaUsage — loop 4.15

`media_usages` mantém UUID, media_id FK RESTRICT, entity_type VARCHAR(50), entity_id UUID, field_name VARCHAR(100), created_at TIMESTAMPTZ, índices por mídia/entidade e unicidade da tupla mídia/entidade/campo para idempotência. Não guarda bytes, sessão ou instituição redundante. Campos vazios são rejeitados. A entidade é polimórfica conforme modelo lógico, não uma FK para uma tabela nova inventada.

`MediaUsageRepository.synchronize(entityType, entityId, references)` é **interno**, não um endpoint de ownership fornecido pelo navegador. O consumidor deve resolver a entidade real, validar sua existência, escopo institucional e permissão de edição, extrair referências de campos controlados e persistir o owner com os usos na mesma transação externa (`new MediaUsageRepository(tx)`). Referências brutas/UUIDs não constituem autorização. Publicação/readiness e regras específicas continuam nos consumidores dos respectivos loops.

Sincronização valida formatos/limites de metadados, normaliza UUID, deduplica referências, serializa o mesmo owner com advisory transaction lock, bloqueia mídias em ordem estável e exige existência antes de alterar usos. Preserva UUID/data dos usos ainda existentes, remove somente os usos obsoletos daquela entidade e insere novos sem duplicação. Falha reverte tudo, inclusive quando integrada a uma transação externa. Colisão de hash do advisory lock apenas serializa entidades adicionais, sem misturar referências.

`findForMedia`/`hasUsage` permitem consultas internas; `removeEntity` sincroniza conjunto vazio e deve participar da exclusão autorizada do owner. Leitura externa futura precisa resolver/autorizar também os owners antes de expor nomes/IDs de outras instituições. Não há endpoint externo de criação/remoção de usos nem integração antecipada de logos/Page Builder. A seleção/upload não cria uso automaticamente.

FK RESTRICT preserva mídia referenciada no PostgreSQL. A exclusão administrativa e seus erros/auditoria pertencem ao 4.16; logos e seus usages ao 4.17. O rastreador não apaga objetos MinIO ou metadados de Media.

## Guard de exclusão — parte independente do 4.16

`MediaDeletionGuard.withUnusedMedia` é uma seção crítica interna, não endpoint/capability "pode excluir" reutilizável. Mantém FOR UPDATE durante a operação do consumidor, reautoriza a categoria atual e bloqueia antes da operação quando há MediaUsage ou processamento em andamento. MEDIA_DELETE_BLOCKED registra somente motivo, sem dados de owners de outra instituição. Referências novas via synchronize aguardam o mesmo lock da mídia. Ausência/negação não executam operação.

MEDIA-002 foi autorizada e fechada em 2026-09-17. O loop 4.16 implementa lifecycle NONE/REQUESTED/FAILED, intenção antes do enqueue, DELETE_MEDIA e recuperação PostgreSQL com orçamento durável de três tentativas. synchronize agora rejeita transacionalmente qualquer referência com deletion_status diferente de NONE, inclusive após esperar pelo lock; não remove usos antigos em uma substituição inválida. processing_status continua independente. Operação/recuperação, contratos REST e fixtures: docs/MEDIA_DELETION.md. Consumidores futuros ainda devem resolver/autorizar seus owners reais e validar publicação/restauração, sem confiar em IDs do navegador.

Testes PostgreSQL reais cobrem FK/checks/unicidade, referência inexistente/entrada inválida, repetição/IDs estáveis, substituição, isolamento de outro owner, remoção, concorrência e rollback da transação externa. Fixtures usam owners/mídias UUID exclusivos e limpeza restrita. Migration aditiva 0017 deve aplicar também do zero em banco de fixture limpo.
