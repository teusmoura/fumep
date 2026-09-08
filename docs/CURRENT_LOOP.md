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
LOOP 1.5 — ATUAL
```

## Loop atual

### LOOP 1.5 — Page

Objetivo:

```text
Criar a estrutura mínima da entidade Page.
```

Implementar:

- tabela `pages`;
- campos mínimos `id`, `title`, `slug`, `status`, `created_by`, `updated_by`, `created_at` e `updated_at`;
- enum canônico de status de publicação necessário ao campo `status`;
- chaves estrangeiras de autoria para usuários;
- testes da estrutura mínima.

Não implementar:

- relação da página com instituição, reservada ao loop 1.6;
- campos adicionais de SEO, agendamento ou página inicial;
- blocos de conteúdo, versões, publicação ou preview.

Critério de aceite:

```text
A estrutura mínima de Page está disponível e validada no banco.
```

## Próximo loop

```text
LOOP 1.6 — Regra Page N:1 Institution
```
