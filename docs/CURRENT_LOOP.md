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
LOOP 3.8 — ATUAL
```

## Loop atual

### LOOP 3.8 — Dark mode

Estado: preparado; loop 3.7 concluído com três rotas institucionais e checks verdes.

Objetivo:

```text
Completar a prioridade de aparência: preferência manual → ADMIN → sistema.
```

Implementar:

- permitir visitante alternar LIGHT/DARK com controle acessível;
- preferência manual prevalece sobre appearanceDefault do ADMIN;
- quando ADMIN = SYSTEM e não há preferência manual, respeitar prefers-color-scheme;
- reutilizar ThemeContext/InstitutionContext nas três instituições;
- resolver aparência cedo, sem flash de tema, e testar prioridades/checks aplicáveis.

Não implementar:

- funcionalidades de mídia, menus ou outros loops futuros;
- credenciais/sessão em armazenamento local.

Critério de aceite:

```text
Dark mode funciona nas três instituições respeitando preferência manual, ADMIN e sistema, sem flash de tema e com controle acessível.
```

## Próximo loop

```text
LOOP 3.9 — Testes de contraste
```
