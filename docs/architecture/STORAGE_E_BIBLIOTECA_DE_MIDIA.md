# ARQUITETURA TÉCNICA V1 — STORAGE E BIBLIOTECA DE MÍDIA

## 1. OBJETIVO

Este documento define a arquitetura de **armazenamento de arquivos, biblioteca de mídia, processamento de imagens, reutilização de arquivos e controle de uso** do Portal FUMEP.

A solução será totalmente hospedada na infraestrutura institucional, utilizando:

```text
MinIO
+
PostgreSQL
+
NestJS
+
BullMQ
+
Sharp
```

O PostgreSQL armazenará metadados e relacionamentos, enquanto os arquivos físicos serão armazenados no MinIO.

---

# 2. PRINCÍPIO GERAL

Arquivos não serão armazenados diretamente no PostgreSQL.

A arquitetura será:

```text
PostgreSQL
→ metadados

MinIO
→ arquivos físicos
```

O banco de dados continuará sendo responsável por registrar:

- identidade da mídia;
- tipo;
- nome original;
- MIME type;
- tamanho;
- dimensões;
- categoria;
- descrição alternativa;
- usuário responsável pelo upload;
- variantes existentes;
- locais onde a mídia está sendo utilizada.

---

# 3. TIPOS DE MÍDIA

A biblioteca poderá armazenar inicialmente:

```text
IMAGE
DOCUMENT
VIDEO
OTHER
```

Na V1, entretanto, os uploads editoriais serão restritos principalmente a:

```text
Imagens
PDFs
```

Vídeos serão normalmente incorporados por URL através dos blocos de vídeo.

---

# 4. MINIO

O MinIO será o serviço oficial de Object Storage do portal.

Será executado na infraestrutura Ubuntu institucional.

Não haverá dependência de:

- AWS S3;
- Cloudflare R2;
- Azure Blob Storage;
- Google Cloud Storage;
- outros serviços de terceiros.

O sistema utilizará a API compatível com S3 fornecida pelo MinIO.

---

# 5. BUCKETS

A estrutura inicial utilizará dois buckets:

```text
portal-public

portal-private
```

## portal-public

Destinado a conteúdo disponível publicamente.

Exemplos:

- imagens institucionais;
- imagens de notícias;
- imagens de cursos;
- galerias;
- matrizes curriculares;
- PDFs;
- documentos de estágio;
- imagens de páginas;
- arquivos de eventos.

## portal-private

Reservado para:

- conteúdo administrativo;
- arquivos não publicados;
- futuras necessidades de conteúdo privado.

A V1 poderá utilizar predominantemente `portal-public`, mas a separação será prevista desde o início.

---

# 6. ORGANIZAÇÃO INTERNA DOS OBJETOS

Os arquivos não serão organizados fisicamente por instituição ou página.

Exemplo que não será utilizado:

```text
/etmsl/noticias/2026/foto.jpg
```

Isso dificultaria reutilização e movimentação de conteúdo.

A estrutura utilizará identificadores gerados pelo sistema.

Exemplo:

```text
portal-public/
│
├── images/
│   ├── originals/
│   │   └── <uuid>.jpg
│   │
│   └── variants/
│       ├── <uuid>-320.webp
│       ├── <uuid>-640.webp
│       ├── <uuid>-1280.webp
│       ├── <uuid>-320.avif
│       ├── <uuid>-640.avif
│       └── <uuid>-1280.avif
│
└── documents/
    └── <uuid>.pdf
```

---

# 7. NOMES INTERNOS

O nome original enviado pelo usuário será preservado apenas como metadado.

Exemplo:

```text
laboratorio-de-informatica.jpg
```

será armazenado fisicamente como algo semelhante a:

```text
550e8400-e29b-41d4-a716-446655440000.jpg
```

Isso evita:

- colisões;
- caracteres problemáticos;
- manipulação de paths;
- dependência de nomes de arquivos;
- conflitos entre instituições.

---

# 8. NOME ORIGINAL

O banco manterá:

```text
original_filename
```

para permitir que o Editor reconheça o arquivo na biblioteca.

O nome interno de armazenamento será independente.

---

# 9. URLs PÚBLICAS

O navegador não deverá receber diretamente endereços internos do MinIO.

Não utilizar publicamente:

```text
http://minio:9000/...
```

O acesso público será realizado através do domínio do portal.

Exemplo:

```text
https://portal.../media/...
```

O Nginx ou a aplicação realizará o encaminhamento necessário.

Isso desacopla a URL pública da tecnologia de storage.

---

# 10. BENEFÍCIO DO DESACOPLAMENTO

Se futuramente o mecanismo de armazenamento for substituído:

```text
MinIO
→ outro storage
```

as URLs públicas poderão permanecer compatíveis.

O frontend não deverá conhecer:

- bucket interno;
- porta do MinIO;
- hostname interno;
- credenciais;
- estrutura administrativa do storage.

---

# 11. UPLOAD DE ARQUIVOS

Na V1, os uploads passarão pelo backend NestJS.

Fluxo:

```text
Browser
↓
Next.js
↓
NestJS
↓
validação
↓
MinIO
↓
PostgreSQL
↓
BullMQ
```

Não será utilizado inicialmente upload direto:

```text
Browser → MinIO
```

---

# 12. MOTIVAÇÃO DO UPLOAD PELO BACKEND

Essa abordagem facilita:

- autenticação;
- autorização;
- validação;
- auditoria;
- limitação de tamanho;
- análise de tipo;
- geração de checksum;
- associação ao usuário;
- tratamento uniforme de erros.

Se futuramente houver necessidade de arquivos muito grandes, poderão ser avaliadas URLs pré-assinadas.

---

# 13. FORMATOS DE IMAGEM

Uploads editoriais de imagem aceitarão inicialmente:

```text
JPEG
PNG
WebP
AVIF
```

SVG não será permitido através da biblioteca editorial na V1.

---

# 14. SVG

SVG pode conter recursos ativos e exige tratamento específico de segurança.

Por isso:

```text
SVG
→ proibido para upload editorial na V1
```

Logotipos oficiais em SVG, caso necessários, poderão ser instalados de maneira controlada pelo Administrador ou durante o deploy.

---

# 15. DOCUMENTOS

Na V1, documentos enviados pelo CMS serão restritos a:

```text
PDF
```

O sistema deverá validar:

- extensão;
- MIME type;
- assinatura real do arquivo.

Não será suficiente confiar no nome terminado em `.pdf`.

---

# 16. LIMITES DE UPLOAD

Limites iniciais definidos:

```text
Imagem:
15 MB
```

```text
PDF:
30 MB
```

Os valores poderão ser posteriormente transformados em configuração administrativa ou variável de ambiente.

---

# 17. VALIDAÇÃO DE ARQUIVOS

Cada upload deverá passar por:

```text
extensão
+
MIME type
+
magic bytes / assinatura real
```

O objetivo é impedir que um arquivo executável ou de outro tipo seja aceito apenas por ter sido renomeado.

---

# 18. CHECKSUM

Cada arquivo enviado deverá ter calculado:

```text
SHA-256
```

O checksum será armazenado na entidade `Media`.

Adicionar ao modelo lógico:

```text
checksum_sha256 VARCHAR(64) NOT NULL
```

Índice:

```text
INDEX(checksum_sha256)
```

---

# 19. DETECÇÃO DE DUPLICIDADE

Ao realizar novo upload:

```text
calcular SHA-256
↓
consultar biblioteca
↓
checksum já existe?
```

Se não:

```text
prosseguir normalmente
```

Se sim:

```text
avisar o Editor
```

---

# 20. COMPORTAMENTO PARA ARQUIVO DUPLICADO

O sistema deverá permitir duas opções:

```text
[Usar arquivo existente]

[Enviar assim mesmo]
```

A duplicidade não será bloqueada automaticamente.

Isso permite situações em que dois registros distintos sejam desejáveis mesmo com conteúdo binário idêntico.

---

# 21. ENTIDADE MEDIA

A tabela lógica deverá possuir:

```text
media
-----
id

type

original_filename
stored_filename

mime_type
size_bytes

checksum_sha256

width
height

alt_text
caption
is_decorative

processing_status
processing_error

category_id
uploaded_by

created_at
```

---

# 22. STATUS DE PROCESSAMENTO

Adicionar:

```text
processing_status
```

Valores:

```text
PENDING
PROCESSING
READY
FAILED
```

---

# 23. PROCESSING_ERROR

Adicionar:

```text
processing_error TEXT NULL
```

Será utilizado para diagnóstico de falhas do Worker.

O painel não precisa expor detalhes técnicos completos ao Editor.

---

# 24. EXPERIÊNCIA DO PAINEL

Depois do upload:

```text
foto.jpg

Processando...
```

Após sucesso:

```text
foto.jpg

Pronta
```

Em caso de falha:

```text
foto.jpg

Falha no processamento

[Tentar novamente]
```

---

# 25. PROCESSAMENTO DE IMAGEM

Depois do upload:

```text
PROCESS_MEDIA
↓
Worker
↓
Sharp
```

O Sharp será responsável por:

- detectar dimensões;
- redimensionar;
- gerar thumbnails;
- converter para WebP;
- converter para AVIF;
- otimizar arquivos.

---

# 26. ORIGINAL

O original será preservado.

Fluxo:

```text
arquivo original
↓
MinIO
↓
variantes derivadas
```

Isso permite:

- regenerar variantes;
- alterar política de qualidade no futuro;
- gerar novos tamanhos sem novo upload;
- preservar material institucional original.

---

# 27. VARIANTES

Conjunto inicial sugerido:

```text
320 px
640 px
960 px
1280 px
1920 px
```

Nem todas as imagens precisam gerar todas as variantes.

---

# 28. REGRA DE DIMENSÃO

Nunca ampliar artificialmente uma imagem.

Exemplo:

```text
original = 900 px
```

Gerar:

```text
320
640
900/original
```

Não gerar:

```text
1280
1920
```

---

# 29. FORMATO DAS VARIANTES

Gerar inicialmente:

```text
WebP
AVIF
```

O original será mantido como fallback quando necessário.

---

# 30. THUMBNAIL

O CMS deverá possuir uma versão leve para a biblioteca.

Tamanho inicial sugerido:

```text
aproximadamente 320 px
```

Isso reduz uso de banda e memória na listagem administrativa.

---

# 31. MEDIA_VARIANTS

Estrutura:

```text
media_variants
--------------
id

media_id

format
width
height

size_bytes

storage_key

created_at
```

---

# 32. STORAGE_KEY

Não armazenar URL absoluta.

Armazenar:

```text
images/variants/<uuid>-1280.avif
```

A URL final será construída pela aplicação/configuração.

---

# 33. IMAGENS RESPONSIVAS

O frontend deverá utilizar as variantes disponíveis de acordo com:

- dispositivo;
- largura disponível;
- densidade de tela;
- formato suportado.

Prioridade preferencial:

```text
AVIF
↓
WebP
↓
original/fallback
```

---

# 34. TEXTO ALTERNATIVO PADRÃO

Cada imagem poderá possuir na biblioteca:

```text
alt_text
```

Esse será o texto alternativo padrão.

Exemplo:

```text
Fachada da Escola Técnica Municipal de Sete Lagoas.
```

---

# 35. ALT CONTEXTUAL

Uma mesma imagem pode assumir significado diferente dependendo do local onde for utilizada.

Por isso, cada bloco poderá fornecer um texto alternativo específico.

Exemplo:

```text
Media.alt_text:
Fachada da ETMSL.
```

Em uma notícia:

```text
Block.alt_text:
Alunos chegando à ETMSL durante a Feira de Profissões.
```

---

# 36. PRIORIDADE DO ALT

A regra será:

```text
alt contextual do bloco
↓
alt padrão da mídia
```

Se existir alt contextual:

```text
usar alt contextual
```

Caso contrário:

```text
usar alt padrão
```

---

# 37. BLOQUEIO DE PUBLICAÇÃO

Se a imagem for informativa:

```text
alt contextual = vazio
AND
alt padrão = vazio
```

então:

```text
PUBLICAÇÃO BLOQUEADA
```

O Editor deverá fornecer uma descrição acessível.

---

# 38. IMAGEM DECORATIVA

Se:

```text
is_decorative = TRUE
```

o frontend deverá renderizar:

```html
alt=""
```

Nesse caso não será necessário texto descritivo.

---

# 39. BIBLIOTECA CENTRAL

O CMS possuirá uma biblioteca central.

Estrutura conceitual:

```text
Biblioteca de Mídia
│
├── Todas
├── Imagens
├── Documentos
└── Categorias
```

---

# 40. INFORMAÇÕES EXIBIDAS

Na listagem poderão aparecer:

- miniatura;
- nome original;
- tipo;
- tamanho;
- dimensões;
- categoria;
- data de upload;
- usuário responsável;
- status de processamento.

---

# 41. DETALHES DA MÍDIA

Ao abrir um item:

```text
Pré-visualização

Nome original

Tipo

Tamanho

Dimensões

Alt padrão

Legenda

Categoria

Data de upload

Enviado por

Variantes disponíveis

Onde está sendo utilizado
```

---

# 42. REUTILIZAÇÃO

Imagens poderão ser reutilizadas em várias páginas e conteúdos.

Nos seletores de mídia:

```text
[Escolher da biblioteca]

[Enviar nova]
```

O Editor não precisará reenviar a mesma imagem para cada uso.

---

# 43. CATEGORIAS DE MÍDIA

Categorias poderão ser criadas pelos Editores.

Exemplos:

```text
Institucional
Laboratórios
Cursos
Eventos
Estágio
Logotipos
Notícias
```

Na V1:

```text
Media N : 1 MediaCategory
```

Cada arquivo possuirá no máximo uma categoria.

---

# 44. CATEGORIAS GLOBAIS E INSTITUCIONAIS

Uma categoria poderá ser:

```text
global
```

ou vinculada a uma instituição.

Isso permite, por exemplo:

```text
Laboratórios ETMSL
```

sem impedir categorias gerais.

---

# 45. BUSCA NA BIBLIOTECA

A biblioteca deverá permitir pesquisa por:

- nome original;
- texto alternativo;
- legenda;
- categoria.

---

# 46. FILTROS

Filtros previstos:

```text
Tipo
Categoria
Enviado por
Período
```

Tipos:

```text
Todos
Imagens
PDFs
```

---

# 47. ORDENAÇÃO

Opções:

```text
Mais recentes
Mais antigos
Nome
Maior tamanho
```

---

# 48. PAGINAÇÃO

A biblioteca não carregará todos os arquivos simultaneamente.

Será utilizada:

```text
paginação
+
busca
```

A paginação é preferida na V1 em relação a infinite scroll para facilitar navegação administrativa previsível.

---

# 49. RASTREAMENTO DE USO

A tabela `media_usages` deverá registrar cada utilização.

Exemplo:

```text
Media X

→ Page / Hero
→ Article / Cover
→ Course / Image
```

---

# 50. MEDIA_USAGE

Estrutura:

```text
media_usages
------------
id

media_id

entity_type
entity_id

field_name

created_at
```

---

# 51. VISUALIZAÇÃO DO USO

No painel:

```text
Onde esta mídia está sendo utilizada
```

Exemplo:

```text
Home ETMSL
Hero principal

Técnico em Informática
Imagem do curso

Semana da Tecnologia
Imagem de capa
```

---

# 52. EXCLUSÃO DE MÍDIA EM USO

Se:

```text
MediaUsage > 0
```

então:

```text
DELETE PROIBIDO
```

O sistema deverá informar onde o arquivo está sendo utilizado.

---

# 53. MENSAGEM DE BLOQUEIO

Exemplo:

```text
Não é possível excluir este arquivo.

Ele está sendo utilizado em:

• Home ETMSL
• Técnico em Informática
• Semana da Tecnologia
```

---

# 54. EXCLUSÃO DE MÍDIA NÃO UTILIZADA

Se não houver referências:

```text
confirmar exclusão
↓
remover variantes
↓
remover original
↓
remover metadados
↓
registrar AuditLog
```

---

# 55. CONSISTÊNCIA DA EXCLUSÃO

A exclusão deverá ser projetada de forma idempotente e resistente a falhas.

O sistema não deverá assumir que operações no PostgreSQL e MinIO são uma única transação.

Poderá ser utilizado posteriormente um job:

```text
DELETE_MEDIA
```

para garantir limpeza segura dos objetos.

---

# 56. DOCUMENTOS PÚBLICOS

Não haverá uma biblioteca pública independente de documentos.

Os arquivos serão disponibilizados sempre dentro de contexto.

Exemplos:

```text
Curso
→ Matriz curricular

Estágio
→ Formulário

Notícia
→ Documento

Página
→ Regulamento
```

---

# 57. MATRIZES CURRICULARES

Serão armazenadas como PDF no MinIO e relacionadas ao curso.

```text
Course
↓
CourseCurriculum
↓
Media
↓
PDF
```

---

# 58. DOCUMENTOS DE ESTÁGIO

Fluxo:

```text
InternshipCategory
↓
InternshipDocument
↓
Media
```

Podem ser:

```text
gerais
```

ou:

```text
específicos de determinado curso
```

---

# 59. VISUALIZAÇÃO DE PDF

O portal poderá oferecer:

```text
[Visualizar]

[Baixar]
```

Não será necessário desenvolver visualizador PDF próprio na V1.

O navegador poderá realizar a visualização quando suportada.

---

# 60. LOGOTIPOS

Logos institucionais poderão referenciar itens da biblioteca:

```text
Institution.logo_light_id
Institution.logo_dark_id
```

SVG oficial, se utilizado, terá entrada controlada e não ficará disponível como upload editorial comum.

---

# 61. AUTORIZAÇÃO

Editor só poderá realizar upload dentro do escopo das instituições autorizadas quando o arquivo estiver categorizado institucionalmente.

Administrador poderá gerenciar toda a biblioteca.

A reutilização de arquivos globais poderá ser permitida entre instituições.

---

# 62. AUDITORIA

Eventos relevantes:

```text
MEDIA_UPLOADED

MEDIA_DUPLICATE_DETECTED

MEDIA_UPDATED

MEDIA_PROCESSING_FAILED

MEDIA_PROCESSING_RETRIED

MEDIA_DELETE_BLOCKED

MEDIA_DELETED
```

---

# 63. BACKUP

O Portal FUMEP será integrado à política institucional já existente de backup dos servidores.

A infraestrutura atualmente possui:

```text
rotinas regulares de backup
+
backup diário
+
cópia em fita
```

---

# 64. COMPONENTES QUE DEVEM SER INCLUÍDOS NO BACKUP

O backup do portal deverá abranger, no mínimo:

```text
PostgreSQL
+
objetos MinIO
+
configurações necessárias à recuperação
```

Banco e storage fazem parte conjuntamente do estado persistente da aplicação.

---

# 65. CONSISTÊNCIA DO BACKUP

É importante que as rotinas institucionais contemplem tanto:

```text
dados relacionais
```

quanto:

```text
arquivos físicos
```

pois um backup contendo apenas PostgreSQL ou apenas MinIO não representa uma cópia completa do portal.

---

# 66. INFRAESTRUTURA

A arquitetura geral de mídia será:

```text
                 EDITOR
                    │
                    ▼
                 Next.js
                    │
                    ▼
                 NestJS
                    │
          ┌─────────┴──────────┐
          │                    │
          ▼                    ▼
     PostgreSQL              MinIO
      metadados              original
          │                    │
          └────────┬───────────┘
                   ▼
                 BullMQ
                   │
                   ▼
                 Worker
                   │
                  Sharp
                   │
          ┌────────┴────────┐
          │                 │
         WebP              AVIF
          │                 │
          └────────┬────────┘
                   ▼
                 MinIO
```

---

# 67. DECISÕES CONSOLIDADAS

Ficam definidas para a V1:

```text
MinIO institucional
Sem storage externo
PostgreSQL para metadados
Arquivos físicos fora do banco

Buckets public/private

Upload através do NestJS

JPEG
PNG
WebP
AVIF

PDF

Sem SVG editorial

15 MB por imagem
30 MB por PDF

SHA-256 para duplicidade

Duplicidade gera aviso,
mas não bloqueia upload

Sharp

WebP automático
AVIF automático
Thumbnail automático

Original preservado

Biblioteca reutilizável

Categorias de mídia

Busca e filtros

MediaUsage

Bloqueio de exclusão quando em uso

Alt contextual > alt padrão

Bloqueio de publicação
quando imagem informativa não tiver alt

Imagem decorativa usa alt=""

URLs públicas desacopladas do MinIO

Backup integrado às rotinas institucionais
com execução diária e cópia em fita
```

---

# 68. STATUS

Com este documento, a camada de **Storage e Biblioteca de Mídia da Arquitetura Técnica V1** é considerada definida.

As decisões deverão orientar posteriormente:

- schemas Drizzle;
- endpoints de mídia;
- implementação do MinIO;
- jobs `PROCESS_MEDIA`;
- processamento com Sharp;
- biblioteca administrativa;
- componentes seletores de mídia;
- validação de acessibilidade;
- controle de duplicidade;
- rastreamento de uso;
- exclusão segura;
- configuração de backup e restauração.
