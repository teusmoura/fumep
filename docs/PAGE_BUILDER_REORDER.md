# Reordenação — 5.10

QA local 1280×900/390×844 LIGHT/DARK: arrasto real entre handles mudou callback/ordem, Subir/Descer por teclado mudaram ordem com foco visível no status, limites e botões 44px, sem overflow global/console warnings. Fixture compacto ocultou formulários somente para observar o gesto; preservação de edits/identidade dos formulários coberta nos testes de interação. Fixture removido/viewport restaurado/aba fechada/servidor encerrado. Não certifica integração real de owner ou contraste global.

PageBuilder move blocos por handle Arrastar (drag-and-drop nativo HTML5) ou botões Subir/Descer nomeados por bloco/posição, instrução associada e limites desabilitados. Touch/teclado usam os botões; formulários não são draggable. Somente handle interno inicia referência efêmera em memória, limpa em drop/dragend; drops externos não são aceitos e conteúdo transferido não é interpretado.

reorderBuilderBlocks valida contexto/Registry/envelopes/IDs/positions e índices. Movimento inválido ou sem mudança não emite callback. Posições ficam consecutivas, mantendo UUID/conteúdo/visibilidade/versão/fundo/anchor/Media.id. Snapshot completo clonado para onApply; ordem local só muda após sucesso. Falha mantém ordem e edits, com status focável. Durante callback/adição pendente/desabilitado, reorder bloqueado por ref, não apenas botão.

React keys de li permanecem IDs, preservando editores/dados ainda não aplicados ao trocar posição. Esses edits não são silenciosamente aplicados por reorder; callback inclui apenas conteúdo aplicado ao draft. Salvamento real/autorização/MediaUsage e transação do proprietário continuam na fase 6, sem novas rotas/endpoints/persistência. Não implementa duplicar/ocultar/excluir ou CSS/grid livre.

Testes cobrem envelopes/índices/posições, referências preservadas/sem mutação, botões/limites, identidade DOM/draft não aplicado, axe semântico, drop externo/interno, falha e concorrência. axe em jsdom não mede contraste/layout; script test:e2e ainda inexistente.
