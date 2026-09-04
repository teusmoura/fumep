# AGENTS.md — apps/worker

Escopo: BullMQ Workers.

## Regras
- Jobs devem ser idempotentes quando aplicável.
- Retry deve ser limitado.
- Falha externa não pode corromper estado válido local.
- Registrar job_id, tipo, tentativa, duração e erro seguro.
- Não transformar Worker em segunda API.
- Respeitar `docs/architecture/JOBS_E_PROCESSAMENTO_ASSINCRONO.md`.

## Validação
Testar sucesso, retry, falha permanente e idempotência quando aplicável.
