---
name: execute-loop
description: Execute um loop atual do Portal FUMEP com aceite, checks aplicáveis, status e commit; use quando o usuário pedir para continuar ou concluir loops.
---

# Execute Loop

## Execução enxuta

- Leia `AGENTS.md`, `docs/CURRENT_LOOP.md` e o trecho pertinente de `docs/architecture/PLANO_IMPLEMENTACAO_V1_LOOPS_CANONICO.md` uma vez no início. Consulte apenas referências necessárias ao loop. Use busca direcionada no histórico, sem carregar `docs/LOOP_STATUS.md` inteiro.
- Confira `git status` e preserve trabalho preexistente. Execute apenas o loop atual; não antecipe o próximo nem inicie outro loop no mesmo turno.
- Implemente uma entrega verificável. Durante a edição, rode testes focados. Antes de aceitar, rode uma vez os checks aplicáveis à fatia e os legados afetados; reexecute o que uma correção atingir. Não reduza cobertura para economizar tokens.
- Registre em `docs/LOOP_STATUS.md` somente resultado, evidência de aceite, checks e bloqueios. Se todos os critérios passarem, prepare `docs/CURRENT_LOOP.md` para o próximo loop, faça commit e confirme Git limpo.
- Trate cerca de 8 mil tokens como meta por execução, não como licença para omitir validação. Se a fatia não couber, deixe checkpoint sucinto, preserve o trabalho e informe o que falta; não marque aceite parcial como concluído.

## Bloqueio arquitetural

Se houver contradição, consulte manifesto e documento especializado, use `$architecture-guard`, registre o conflito persistente e não invente decisão.

## Saída final

Informe loop, entrega, checks, commit, próximo loop e bloqueios, se houver.
