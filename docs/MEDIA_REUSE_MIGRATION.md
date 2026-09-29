# MIG 4.5 — duplicidade e seleção isoladas

`MediaReuseService` calcula SHA-256 exclusivamente dos bytes de imagem aprovados pelo validador MIG 4.2. O cliente não fornece checksum. Havendo mídia IMAGE com mesmo hash, MIME e tamanho, o serviço oferece uma duplicata elegível ou permite a decisão explícita `UPLOAD_ANYWAY`; esta decisão **não grava** arquivo nem registro. A escolha de uma mídia existente usa `select(id)` e consulta novamente seus metadados e categoria, não confia no aviso anterior.

Para oferta e seleção, a mídia deve estar `READY`, com `deletion_status=NONE`, e ter categoria persistida e acessível; mídia sem categoria fica apenas para ADMIN. EDITOR não vê nem seleciona mídia global ou de outra instituição. Seleção admite imagem ou documento PDF pronto, mas uma revisão de upload de imagem nunca oferece PDF como duplicata. Resposta é projeção sem chave interna, checksum ou dados do responsável. Mídia ausente, estrangeira ou indisponível produz a mesma falha de seleção.

O repositório em memória existe somente nos testes. Não há endpoint, UI, escrita em MinIO/PostgreSQL, criação de MediaUsage ou envio real nesta fatia. Na integração, a revalidação de autorização e estado precisará ocorrer com a fonte persistida e a coordenação transacional prevista na arquitetura.
