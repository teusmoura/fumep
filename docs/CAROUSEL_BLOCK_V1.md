# CAROUSEL v1 — imagens da Biblioteca

Loop 5.26. Disponível em PAGE e ARTICLE com `schemaVersion: 1` e `data: { items[] }`. Cada slide contém `imageId`, `alt`, `caption?` e `url?`; 1–10 itens. `imageId` é UUID da Media Library, nunca URL física. Alt contextual até 300 caracteres, legenda até 500; URL, quando presente, passa pelo mesmo contrato seguro de links TEXT. Alt vazio pode existir apenas em draft incompleto: editor não aplica e renderer não mostra o carrossel até ser preenchido.

O editor Client recebe projeções de imagens READY da Biblioteca, permite selecionar, adicionar, editar, remover e reordenar slides. Valida toda a coleção antes de `onApply`, envia cópia isolada e retém o draft se o callback falha. O caller continua responsável por autorização, persistência, MediaUsage e publicação.

O renderer valida novamente bloco e todas as imagens resolvidas pelo caller: READY, tipo imagem, rota pública local segura, dimensões e IDs correspondentes. Falha fechado se qualquer slide não puder ser resolvido. O primeiro slide é renderizado no HTML inicial; a camada Client só controla seleção com botões anterior/próximo/diretos, teclas de seta/Home/End e anúncio de posição. Não há autoplay; links e legendas são controlados e escapados. `next/image` recebe tamanhos responsivos; fundo/tema seguem `BlockBackground`.

Sem endpoint, migration, Preview, publicação ou gateway de mídia novos neste loop.
