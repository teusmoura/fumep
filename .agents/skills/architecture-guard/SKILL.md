---
name: architecture-guard
description: Audite uma alteração ou proposta contra a arquitetura canônica do Portal FUMEP e impeça regressões de decisões já fechadas.
---

# Architecture Guard

## Fontes

Leia primeiro:
- `docs/architecture/MANIFESTO_CANONICO_V1.md`
- documento especializado da área
- modelo lógico canônico quando houver impacto de dados

## Verificações mínimas

Procure regressões como:
- JWT;
- ORM diferente de Drizzle;
- storage fora de MinIO;
- jobs pesados síncronos quando há BullMQ;
- remoção do Worker;
- analytics de navegação paralelo ao Matomo;
- `PageInstitution`;
- terceiro nível de menu;
- CSS/grid livre no Page Builder;
- bypass de autorização no backend;
- mídia deletável quando em uso;
- documentos PDF indexados por OCR/conteúdo interno;
- consulta a API externa em cada visita pública.

## Resultado

Classifique:
- conforme;
- conforme com observação;
- conflito;
- bloqueador.

Nunca altere arquitetura silenciosamente.
