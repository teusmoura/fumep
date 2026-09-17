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
LOOP 4.16 — CONCLUÍDO
LOOP 4.17 — ATUAL
```

## Loop atual

### LOOP 4.17 — Logos institucionais via Media

Estado: pronto para execução após commit do 4.16. Lifecycle/exclusão recuperável MEDIA-002 implementados e checks verdes (300 testes). Revalidar commit/Git limpo antes de iniciar; não reutilizar mídia REQUESTED/FAILED.

Objetivo:

```text
FUMEP, ETMSL e CRAMAM selecionam logos pela Biblioteca sem duplicar arquivos.
```

Implementar:

- reler AGENTS.md, execute-loop, plano/modelo lógico/Storage/Frontend e documentos necessários; confirmar 4.16 commitado e Git limpo;
- usar skills de dados, API, frontend, mídia, segurança e testes conforme escopo;
- adicionar Institution.logo_light_id/logo_dark_id como referências nullable a Media por migration aditiva;
- permitir seleção pela Biblioteca sem novo upload/cópia, com autorização backend/CSRF e validação do tipo/estado/disponibilidade;
- sincronizar MediaUsage de INSTITUTION/logo_light_id e logo_dark_id na mesma transação da instituição, preservando/removendo usos de forma idempotente;
- resolver apresentação pública de logo claro/escuro com fallback quando logo dark ausente, sem vazar URL/credencial interna MinIO;
- testar escopo, mídia inválida/indisponível, usos, fallback, migrations e acessibilidade aplicável;
- checks, documentação, commit e Git limpo.

Não implementar:

- Page Builder (fase 5), novos consumidores de conteúdo ou biblioteca pública independente.

Critério de aceite:

```text
As três instituições selecionam logos via Media, sem duplicação; MediaUsage/segurança/fallback e checks verdes.
```

## Próximo loop

```text
LOOP 5.1 — BlockRegistry
```
