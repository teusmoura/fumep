# CURRENT LOOP

## Estado

```text
LOOP 0.1 — CONCLUÍDO
LOOP 0.2 — CONCLUÍDO
LOOP 0.3 — CONCLUÍDO
LOOP 0.4 — CONCLUÍDO
LOOP 0.5 — CONCLUÍDO
LOOP 0.6 — CONCLUÍDO
LOOP 0.7 — CONCLUÍDO
LOOP 0.8 — CONCLUÍDO
LOOP 0.9 — CONCLUÍDO
LOOP 0.10 — CONCLUÍDO
LOOP 0.11 — CONCLUÍDO
LOOP 0.12 — CONCLUÍDO
LOOP 0.13 — CONCLUÍDO
LOOP 0.14 — CONCLUÍDO
LOOP 0.15 — CONCLUÍDO
LOOP 0.16 — CONCLUÍDO
LOOP 0.17 — CONCLUÍDO
LOOP 1.1 — CONCLUÍDO
LOOP 1.2 — CONCLUÍDO
LOOP 1.3 — CONCLUÍDO
LOOP 1.4 — CONCLUÍDO
LOOP 1.5 — CONCLUÍDO
LOOP 1.6 — CONCLUÍDO
LOOP 1.7 — CONCLUÍDO
LOOP 1.8 — CONCLUÍDO
LOOP 1.9 — CONCLUÍDO
LOOP 1.10 — CONCLUÍDO
LOOP 2.1 — CONCLUÍDO
LOOP 2.2 — CONCLUÍDO
LOOP 2.3 — CONCLUÍDO
LOOP 2.4 — CONCLUÍDO
LOOP 2.5 — CONCLUÍDO
LOOP 2.6 — CONCLUÍDO
LOOP 2.7 — CONCLUÍDO
LOOP 2.8 — CONCLUÍDO
LOOP 2.9 — CONCLUÍDO
LOOP 2.10 — CONCLUÍDO
LOOP 2.11 — CONCLUÍDO
LOOP 2.12 — CONCLUÍDO
LOOP 2.13 — CONCLUÍDO
LOOP 2.14 — CONCLUÍDO
LOOP 2.15 — CONCLUÍDO
LOOP 2.16 — CONCLUÍDO
LOOP 3.1 — CONCLUÍDO
LOOP 3.2 — CONCLUÍDO
LOOP 3.3 — CONCLUÍDO
LOOP 3.4 — CONCLUÍDO
LOOP 3.5 — CONCLUÍDO
LOOP 3.6 — CONCLUÍDO
LOOP 3.7 — CONCLUÍDO
LOOP 3.8 — CONCLUÍDO
LOOP 3.9 — CONCLUÍDO
LOOP 4.1 — CONCLUÍDO
LOOP 4.2 — CONCLUÍDO
LOOP 4.3 — CONCLUÍDO
LOOP 4.4 — CONCLUÍDO
LOOP 4.5 — CONCLUÍDO
LOOP 4.6 — CONCLUÍDO
LOOP 4.7 — CONCLUÍDO
LOOP 4.8 — CONCLUÍDO
LOOP 4.9 — CONCLUÍDO
LOOP 4.10 — CONCLUÍDO
LOOP 4.11 — CONCLUÍDO
LOOP 4.12 — CONCLUÍDO
LOOP 4.13 — CONCLUÍDO
LOOP 4.14 — CONCLUÍDO
LOOP 4.15 — CONCLUÍDO
LOOP 4.16 — ATUAL
```

## Loop atual

### LOOP 4.16 — Bloqueio de exclusão

Estado: parcialmente implementado, com MEDIA-002 autorizada e contrato fechado em 2026-09-17. O 4.15 está concluído e commitado em `ab0f177`; guard interno e testes commitados em `f3914ea`. Exclusão física/endpoint/migration/job ainda não disponibilizados. Não avançar ao 4.17 enquanto o aceite completo não for satisfeito.

Para retomar implementação: seguir Storage §55.1–55.5, Jobs §6.1, modelo lógico §8.2 e ampliação autorizada do plano 4.16. Estados NONE/REQUESTED/FAILED, intenção antes do enqueue, DELETE_MEDIA idempotente, três tentativas duráveis por ciclo, reconciliação no startup/a cada minuto e retry explícito ADMIN. Não reutilizar processing_status nem pressupor atomicidade PostgreSQL/Redis/MinIO. Os checks da entrega parcial passaram (278 testes, lint, typecheck, build, formatação e peers).

Objetivo:

```text
Bloquear exclusão de mídia em uso, preservando seus arquivos/referências.
```

Implementar:

- reler AGENTS.md, execute-loop e documentos canônicos necessários; confirmar 4.15 commitado e Git limpo;
- usar drizzle-data-model/nestjs-api/nextjs-frontend/security-access/testing-qa conforme escopo;
- implementar bloqueio transacional/backend de exclusão de mídia referenciada, com autorização institucional/CSRF;
- manter MediaUsage como fonte de integridade e preservar original/variantes em rejeição;
- retornar mensagem amigável e informações de uso somente quando os respectivos owners forem autorizados;
- implementar o lifecycle/recuperação MEDIA-002 conforme contratos canônicos agora autorizados, sem inventar outbox genérico/lixeira/restauração;
- testar mídia em uso, escopo/CSRF/concorrência/falhas aplicáveis e documentação/auditoria;
- checks, documentação, commit e Git limpo.

Não implementar:

- logos (4.17), Page Builder, novos consumidores ou biblioteca pública.

Critério de aceite:

```text
Mídia em uso não pode ser excluída; arquivos/referências preservados e testes/checks verdes.
```

## Próximo loop

```text
LOOP 4.17 — Logos institucionais via Media
```
