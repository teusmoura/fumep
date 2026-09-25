# DOCUMENT v1 — loop 5.29

DOCUMENT representa um PDF da Biblioteca de Mídia em PAGE ou ARTICLE. `data` contém apenas `mediaId` UUID e textos opcionais `title`, `description`, `buttonLabel` com limites controlados. URL de MinIO e metadados físicos não entram no JSONB.

O editor recebe uma lista de documentos de Biblioteca fornecida pelo caller, filtra DOCUMENT/`application/pdf`/READY e retém alterações após falha de `onApply`. PageBuilder recebe `documents` separadamente de `images`; sem PDF elegível, não oferece criação. A seleção no cliente não concede autorização: o backend deve revalidar estado, pertencimento e MediaUsage ao salvar/publicar.

O renderer SSR só exibe conteúdo quando recebe projeção atual `id` coincidente, DOCUMENT/READY/NONE/`application/pdf`, nome válido e `href` interno sob `/media/`. O caller deve resolver a URL pública e a permissão; nenhum endpoint de entrega ou visualizador próprio é criado neste loop. O link nativo pode abrir o PDF no navegador conforme suporte. Background/tema são resolvidos pelo caller. Conteúdo inválido, oculto ou mídia indisponível falha fechado.
