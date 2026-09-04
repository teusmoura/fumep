# ARQUITETURA TÉCNICA V1 — FRONTEND PÚBLICO, DESIGN SYSTEM E TEMAS INSTITUCIONAIS

## 1. OBJETIVO

Este documento define a arquitetura do **frontend público**, do **Design System**, dos **temas institucionais**, da **navegação**, da **responsividade**, da **acessibilidade visual**, do **dark mode**, do **header**, do **footer**, da **busca**, da **tipografia**, dos **componentes** e da **renderização institucional** do Portal FUMEP.

A proposta visual será:

```text
moderna
educacional
limpa
responsiva
institucional
acessível
```

O Portal FUMEP utilizará um único sistema visual para FUMEP, ETMSL e CRAMAM.

As instituições terão identidade própria, mas não interfaces independentes.

---

# 2. PRINCÍPIO GERAL

A arquitetura visual será:

```text
Design System único
↓
tokens compartilhados
↓
componentes compartilhados
↓
tema institucional
```

Estrutura conceitual:

```text
Design System
├── Tokens
│   ├── cores
│   ├── tipografia
│   ├── espaçamentos
│   ├── bordas
│   ├── sombras
│   └── breakpoints
│
├── Componentes
│   ├── Button
│   ├── Card
│   ├── Input
│   ├── Modal
│   ├── Drawer
│   ├── Breadcrumb
│   ├── Pagination
│   ├── Accordion
│   └── ...
│
└── Temas
    ├── FUMEP
    ├── ETMSL
    └── CRAMAM
```

---

# 3. IDENTIDADE COMPARTILHADA

O portal não terá três aplicações visuais diferentes.

O mesmo componente será reutilizado entre as instituições.

Exemplo:

```text
Button
+
ThemeContext
```

Não criar:

```text
FumepButton
EtmslButton
CramamButton
```

sem necessidade.

---

# 4. CONTEXTO INSTITUCIONAL

A própria URL ajudará a definir o contexto institucional.

Exemplo:

```text
/
→ FUMEP

/etmsl
→ ETMSL

/cramam
→ CRAMAM
```

A partir do contexto serão resolvidos:

```text
logo
cores
nome
menu
breadcrumbs
conteúdo
links institucionais
tema
```

---

# 5. EXEMPLO DE CONTEXTO

```text
/etmsl/cursos
↓
InstitutionContext = ETMSL
↓
logo ETMSL
↓
cores ETMSL
↓
menu ETMSL
↓
breadcrumbs ETMSL
```

---

# 6. HOME POR INSTITUIÇÃO

Rotas principais:

```text
/
→ Home FUMEP

/etmsl
→ Home ETMSL

/cramam
→ Home CRAMAM
```

---

# 7. LOGO DO HEADER

O logo da instituição atual será sempre clicável.

Destino:

```text
FUMEP
→ /

ETMSL
→ /etmsl

CRAMAM
→ /cramam
```

O comportamento deverá ser consistente em todas as páginas.

---

# 8. HEADER

O header será visualmente limpo.

Desktop:

```text
┌──────────────────────────────────────────────────────────────┐
│ LOGO                    Buscar   Acessibilidade   Tema   ☰  │
└──────────────────────────────────────────────────────────────┘
```

Mobile:

```text
┌──────────────────────────────────────┐
│ LOGO                Buscar  Tema  ☰ │
└──────────────────────────────────────┘
```

A acessibilidade continuará disponível no mobile, ainda que possa ser reposicionada.

---

# 9. MENU PRINCIPAL

O menu principal será recolhido em:

```text
hamburger
```

inclusive no desktop.

Não haverá menu horizontal principal permanentemente aberto.

---

# 10. DRAWER

Ao clicar no botão de menu:

```text
☰
```

será aberto um drawer lateral.

Desktop:

```text
painel lateral com largura limitada
```

Mobile:

```text
painel ocupando grande parte da largura
```

---

# 11. NÍVEIS DE MENU

O menu terá no máximo:

```text
2 níveis
```

Não haverá terceiro nível.

---

# 12. EXEMPLO DE DRAWER

```text
ETMSL

Cursos

Estágio

Institucional
  ├── Sobre
  └── Estrutura

Notícias

Eventos

──────────────

Outras instituições

FUMEP

CRAMAM
```

---

# 13. OUTRAS INSTITUIÇÕES

Ao final do drawer haverá uma seção:

```text
Outras instituições
```

Ela exibirá as instituições diferentes da atual.

Exemplos:

```text
Contexto FUMEP
→ ETMSL
→ CRAMAM
```

```text
Contexto ETMSL
→ FUMEP
→ CRAMAM
```

```text
Contexto CRAMAM
→ FUMEP
→ ETMSL
```

---

# 14. ACESSIBILIDADE DO DRAWER

O drawer deverá:

- receber foco corretamente;
- prender o foco enquanto aberto;
- fechar com `Escape`;
- devolver foco ao botão que o abriu;
- permitir navegação integral por teclado.

---

# 15. BREADCRUMBS

Breadcrumbs serão obrigatórios quando aplicáveis.

Exemplo:

```text
Início
› ETMSL
› Cursos
› Técnico em Informática
```

No mobile poderão usar rolagem horizontal ou simplificação visual, sem perder contexto.

---

# 16. LARGURA DE CONTEÚDO

Largura máxima inicial:

```text
1280px
```

Conteúdo centralizado.

---

# 17. GUTTERS

Tokens iniciais sugeridos:

```text
desktop
→ 32px

tablet
→ 24px

mobile
→ 16px
```

Os valores finais serão centralizados no Design System.

---

# 18. BREAKPOINTS

Estrutura inicial:

```text
mobile
< 640px

tablet
640px – 1023px

desktop
>= 1024px
```

A interface deverá depender prioritariamente de CSS Grid e Flexbox.

---

# 19. RESPONSIVIDADE

O frontend deverá funcionar adequadamente em:

```text
desktop
tablet
smartphone
```

No mobile, componentes deverão reorganizar-se naturalmente em uma coluna quando apropriado.

---

# 20. TIPOGRAFIA

A tipografia principal será sans-serif, moderna e legível.

A implementação deverá utilizar:

```text
font-family principal
+
fallback seguro
```

---

# 21. ESCALA TIPOGRÁFICA

Escala controlada:

```text
Display
H1
H2
H3
Body Large
Body
Small
Caption
```

O Editor não selecionará tamanhos arbitrários.

---

# 22. SEMÂNTICA

A hierarquia visual não deverá quebrar a hierarquia HTML.

Exemplo:

```text
H1
→ título principal da página

H2
→ seções

H3
→ subseções
```

Não utilizar heading apenas por aparência.

---

# 23. TOKENS DE COR

Componentes deverão usar tokens semânticos.

Exemplo:

```text
--color-primary
--color-primary-foreground

--color-background
--color-surface

--color-text
--color-text-muted

--color-border

--color-focus

--color-error
--color-success
--color-warning
```

---

# 24. TEMA INSTITUCIONAL

Estrutura conceitual:

```text
Theme
├── institutionId
├── logoLight
├── logoDark
├── primary
├── primaryForeground
├── accent
└── accentForeground
```

---

# 25. CONFIGURAÇÃO PELO ADMIN

ADMIN poderá configurar elementos institucionais controlados, como:

```text
logo
logo para modo escuro
cor institucional principal
cor secundária permitida
dados básicos
links sociais
```

Não deverá editar livremente todos os tokens internos do Design System.

---

# 26. CONTRASTE

Se ADMIN configurar cores institucionais, o sistema deverá validar contraste.

Uma configuração que cause contraste insuficiente deverá ser bloqueada ou sinalizada antes da publicação.

---

# 27. DARK MODE

O ADMIN poderá definir o comportamento padrão:

```text
appearance_default:
SYSTEM
LIGHT
DARK
```

---

# 28. SYSTEM

Quando:

```text
appearance_default = SYSTEM
```

o portal seguirá:

```text
prefers-color-scheme
```

do dispositivo.

---

# 29. LIGHT

Quando:

```text
appearance_default = LIGHT
```

o portal abrirá em modo claro por padrão.

---

# 30. DARK

Quando:

```text
appearance_default = DARK
```

o portal abrirá em modo escuro por padrão.

---

# 31. ESCOLHA DO VISITANTE

O visitante poderá alternar manualmente entre:

```text
LIGHT
DARK
```

A escolha poderá ser persistida localmente no navegador.

---

# 32. PRIORIDADE DE TEMA

Ordem:

```text
1. preferência manual do visitante

2. padrão definido pelo ADMIN

3. preferência do sistema,
   quando ADMIN = SYSTEM
```

---

# 33. EVITAR FLASH DE TEMA

O tema deverá ser resolvido cedo na renderização para evitar:

```text
LIGHT
↓
flash
↓
DARK
```

A implementação deverá evitar FOUC visual.

---

# 34. CONTROLE DE TEMA

O botão de tema deverá possuir label acessível.

Exemplo:

```text
Alternar para modo escuro
```

ou:

```text
Alternar para modo claro
```

---

# 35. ACESSIBILIDADE — PAINEL

O portal possuirá botão de acessibilidade.

A V1 deverá contemplar:

```text
Aumentar texto

Diminuir texto

Alto contraste

Destacar links

Reduzir animações

VLibras
```

---

# 36. ACESSIBILIDADE ESTRUTURAL

O painel não substitui acessibilidade estrutural.

A aplicação deverá continuar respeitando:

- HTML semântico;
- teclado;
- foco visível;
- contraste;
- labels;
- alt;
- screen readers;
- `prefers-reduced-motion`.

---

# 37. SKIP LINK

Deverá existir:

```html
<a href="#main-content" class="skip-link">
  Ir para o conteúdo principal
</a>
```

E:

```html
<main id="main-content">
```

O skip link será visualizado ao receber foco.

---

# 38. FOCUS

Todos os elementos interativos deverão utilizar:

```text
focus-visible
```

claramente perceptível.

Não remover `outline` sem alternativa acessível.

---

# 39. CARDS

Cards terão visual moderno e educacional.

Estrutura típica:

```text
┌─────────────────────┐
│                     │
│       imagem        │
│                     │
├─────────────────────┤
│ Categoria           │
│ Título              │
│ Texto curto         │
│                     │
│ Saiba mais →        │
└─────────────────────┘
```

---

# 40. CARDS — ESTILO

Evitar:

- excesso de sombras;
- excesso de bordas;
- efeitos decorativos;
- animações exageradas.

Priorizar:

```text
imagem
espaço em branco
hierarquia
legibilidade
```

---

# 41. IMAGENS

O frontend deverá utilizar variantes otimizadas da Biblioteca de Mídia.

Prioridade:

```text
AVIF
↓
WebP
↓
fallback
```

---

# 42. IMAGENS RESPONSIVAS

Não carregar imagens maiores que o necessário.

Exemplo:

```text
card 320px
→ não carregar imagem de 1920px
```

---

# 43. LAZY LOADING

Imagens abaixo da primeira dobra deverão normalmente usar lazy loading.

O HERO principal poderá receber prioridade de carregamento.

---

# 44. BOTÕES

Variantes públicas:

```text
PRIMARY
SECONDARY
OUTLINE
GHOST
```

`DANGER` ficará restrito principalmente ao painel administrativo.

---

# 45. LINKS

Links deverão ser visualmente identificáveis.

Hover não poderá ser o único indicador de link.

---

# 46. ANIMAÇÕES

As animações serão discretas.

Exemplos:

```text
drawer
accordion
fade curto
hover leve
```

---

# 47. REDUÇÃO DE MOVIMENTO

Se:

```text
prefers-reduced-motion: reduce
```

animações deverão ser removidas ou reduzidas.

---

# 48. HOME FUMEP

Exemplo de composição:

```text
HERO

Avisos / destaques

Acesso à ETMSL e CRAMAM

Notícias

Eventos

Links rápidos

Indicadores

CTA
```

A Home será construída pelo Page Builder.

---

# 49. HOME ETMSL

Exemplo:

```text
HERO

Cursos

Processos seletivos

Notícias

Estágio

Eventos

Links rápidos
```

Também Page Builder.

---

# 50. HOME CRAMAM

Mesma lógica, com conteúdo e identidade próprios.

---

# 51. FOOTER

O footer será enxuto.

Estrutura conceitual:

```text
Logo / instituição

Endereço

Contato principal

Links essenciais

Redes sociais

Copyright
```

---

# 52. O QUE NÃO TERÁ NO FOOTER

Evitar:

```text
mapa incorporado

menu completo duplicado

grandes grupos de links

blocos promocionais

estrutura excessivamente alta
```

---

# 53. DADOS DO FOOTER

Os dados deverão vir de configuração.

Exemplo:

```text
InstitutionSetting
```

Campos possíveis:

```text
address
phone
email
socialLinks
footerLinks
```

---

# 54. BUSCA NO HEADER

A busca estará sempre disponível.

Preferência no desktop:

```text
botão de busca
↓
overlay ou painel
↓
campo de pesquisa
```

Em vez de grande campo permanentemente aberto.

---

# 55. AUTOCOMPLETE

Após:

```text
3 caracteres
```

a busca utilizará o SearchService definido na arquitetura de Busca e Indexação.

---

# 56. RESULTADOS DE BUSCA

A página de resultados deverá priorizar lista clara.

Exemplo:

```text
Busca por "informática"

[Todos] [FUMEP] [ETMSL] [CRAMAM]

[Páginas] [Notícias] [Cursos] [...]

--------------------------------

CURSO
Técnico em Informática
ETMSL
Descrição...
```

---

# 57. LOADING

Evitar spinners indiscriminados.

Preferir:

```text
skeletons
```

quando houver carregamento assíncrono perceptível.

---

# 58. EMPTY STATES

Exemplos:

```text
Nenhuma notícia publicada nesta categoria.
```

```text
Nenhum resultado encontrado.
```

A interface não deverá ficar visualmente vazia.

---

# 59. ERROR STATES

Erros públicos serão amigáveis.

Exemplo:

```text
Não foi possível carregar este conteúdo.
Tente novamente.
```

Sem stack trace.

---

# 60. PÁGINA 404

Página personalizada:

```text
Página não encontrada

[Voltar ao início]

[Pesquisar no portal]
```

---

# 61. PÁGINA 500

Deverá manter identidade institucional, sem revelar detalhes técnicos.

---

# 62. SEO

O frontend deverá gerar:

```text
title

meta description

canonical

Open Graph

metadados sociais quando aplicável
```

---

# 63. URLS

URLs legíveis.

Exemplo:

```text
/etmsl/cursos/tecnico-em-informatica
```

Evitar:

```text
/page?id=8938
```

---

# 64. SSR

Conteúdo público deverá aproveitar recursos de renderização no servidor do Next.js.

---

# 65. CACHE E REVALIDAÇÃO

Páginas públicas relativamente estáveis poderão utilizar cache e revalidation conforme a arquitetura de cache já definida.

---

# 66. JAVASCRIPT

Conteúdo básico não deverá depender de JavaScript para existir.

JavaScript será utilizado onde necessário, como:

```text
menu
autocomplete
carrossel
tabs
accordion
tema
acessibilidade
```

---

# 67. PERFORMANCE

Princípios:

```text
HTML enxuto

CSS compartilhado

imagens responsivas

fontes otimizadas

lazy loading

mínimo JavaScript possível
```

---

# 68. SERVER COMPONENTS

Quando compatível com a versão de Next.js utilizada, componentes públicos deverão preferir renderização no servidor quando não houver necessidade real de interação cliente.

---

# 69. CLIENT COMPONENTS

Client-side será utilizado apenas em componentes que precisem de interação.

Exemplos:

```text
Drawer

Autocomplete

Carousel

Tabs

Accordion

Theme Switcher
```

---

# 70. RENDERIZAÇÃO INSTITUCIONAL

O mesmo bloco poderá ser usado em todas as instituições.

Exemplo:

```text
CTA
↓
ThemeContext
↓
FUMEP / ETMSL / CRAMAM
```

---

# 71. THEME CONTEXT

A aplicação deverá expor contexto de tema com:

```text
instituição atual

modo light/dark

tokens resolvidos

identidade visual
```

---

# 72. DESIGN SYSTEM E PAGE BUILDER

Blocos do Page Builder deverão utilizar apenas componentes e tokens oficiais.

O Page Builder não poderá produzir CSS arbitrário.

---

# 73. BACKGROUND INSTITUTION

Quando um bloco usar:

```text
background = INSTITUTION
```

o frontend resolverá a cor a partir do tema institucional atual.

---

# 74. BACKGROUND IMAGE

Quando:

```text
background = IMAGE
```

o frontend deverá garantir contraste e legibilidade do conteúdo.

Poderá aplicar overlay previsto no Design System.

---

# 75. TIPOGRAFIA DO PAGE BUILDER

O Editor selecionará significado, não tamanho.

Exemplo:

```text
Título

Texto

Destaque
```

O frontend resolverá estilos automaticamente.

---

# 76. COMPONENTES COMPARTILHADOS

Componentes esperados:

```text
Button

Link

Card

Badge

Input

Textarea

Select

Checkbox

Radio

Switch

Drawer

Modal

Breadcrumb

Pagination

Accordion

Tabs

Table

Skeleton

Alert

EmptyState

ErrorState

SearchBox

ThemeSwitcher

AccessibilityPanel
```

---

# 77. TOKENS DE ESPAÇAMENTO

Os espaçamentos deverão usar escala consistente.

Exemplo conceitual:

```text
xs
sm
md
lg
xl
2xl
```

Não espalhar valores arbitrários por componentes.

---

# 78. BORDAS E RADIUS

A aplicação deverá usar tokens para:

```text
border width
border color
border radius
```

Evitar estilos divergentes entre módulos.

---

# 79. SOMBRAS

Sombras deverão ser discretas e centralizadas em tokens.

Não serão elemento dominante do design.

---

# 80. ESTADOS DE INTERAÇÃO

Componentes interativos deverão possuir estados:

```text
default

hover

focus

active

disabled
```

---

# 81. ESTADO DISABLED

Estado desabilitado deverá permanecer legível e semanticamente correto.

---

# 82. ACESSIBILIDADE DE CORES

A cor não será utilizada como único meio de comunicar:

```text
erro

sucesso

seleção

estado
```

---

# 83. CONTEÚDO TEXTUAL

Textos deverão respeitar largura de leitura adequada.

Conteúdo muito largo em desktop não deverá ocupar toda a largura de 1280px quando isso prejudicar legibilidade.

---

# 84. TABELAS

Tabelas deverão ter tratamento responsivo.

Quando necessário:

```text
scroll horizontal local
```

em vez de quebrar a página inteira.

---

# 85. CARROSSEL

O carrossel deverá:

- ser utilizável por teclado;
- possuir controles visíveis;
- não depender de autoplay;
- respeitar reduced motion.

Autoplay não será obrigatório.

---

# 86. FAQ

FAQ deverá usar accordion acessível.

O estado aberto/fechado deverá ser perceptível por tecnologia assistiva.

---

# 87. TABS

Tabs deverão utilizar semântica e teclado adequados.

---

# 88. MAPAS

Blocos de mapa deverão permanecer responsivos.

O mapa não deverá impedir navegação por teclado.

---

# 89. VÍDEOS

Embeds deverão manter aspect ratio responsivo.

---

# 90. FONTE DE DADOS INSTITUCIONAL

Configurações visuais deverão vir de:

```text
Institution

InstitutionSetting

Theme
```

ou estruturas equivalentes definidas no domínio.

---

# 91. ALTERAÇÃO DE LOGO

ADMIN poderá alterar logo institucional dentro das regras de mídia e branding.

---

# 92. LOGO LIGHT / DARK

Quando necessário, cada instituição poderá possuir:

```text
logoLight

logoDark
```

para preservar contraste.

---

# 93. FALLBACK DE LOGO

Se não houver variante específica para dark mode, o sistema deverá utilizar uma alternativa segura prevista pela implementação.

---

# 94. NAVEGAÇÃO ENTRE INSTITUIÇÕES

A troca entre FUMEP, ETMSL e CRAMAM será explícita na seção:

```text
Outras instituições
```

do drawer.

Não será necessário botão permanente “Voltar para FUMEP”.

---

# 95. CONTEXTO AO TROCAR INSTITUIÇÃO

Ao acessar outra instituição, o portal deverá atualizar:

```text
logo
tema
menu
breadcrumbs
Home
conteúdo contextual
```

sem trocar de sistema visual.

---

# 96. FOOTER POR INSTITUIÇÃO

O footer poderá refletir os dados da instituição atual.

Exemplo:

```text
ETMSL
→ endereço e contatos ETMSL

CRAMAM
→ endereço e contatos CRAMAM
```

A FUMEP poderá ter seus próprios dados.

---

# 97. DARK MODE E INSTITUIÇÕES

O dark mode deverá funcionar para todos os temas institucionais.

Cada combinação deverá respeitar contraste.

---

# 98. TESTES VISUAIS

O Design System deverá ser testado em:

```text
FUMEP Light

FUMEP Dark

ETMSL Light

ETMSL Dark

CRAMAM Light

CRAMAM Dark
```

---

# 99. TESTES RESPONSIVOS

Testar ao menos:

```text
320px

375px

768px

1024px

1280px+

```

---

# 100. TESTES DE ACESSIBILIDADE

Deverão contemplar:

```text
teclado

focus

contraste

screen reader

skip link

drawer

tabs

accordion

formulários

autocomplete
```

---

# 101. TESTES DE PERFORMANCE

Deverão avaliar:

```text
peso de imagens

JavaScript enviado

tempo de renderização

cache

Core Web Vitals quando aplicável
```

---

# 102. ESTRUTURA DE PACOTES

Estrutura candidata:

```text
packages/ui/
├── components/
│   ├── button/
│   ├── card/
│   ├── breadcrumb/
│   ├── drawer/
│   └── ...
│
├── blocks/
│   ├── hero/
│   ├── text/
│   └── ...
│
├── theme/
│   ├── tokens.ts
│   ├── theme-provider.tsx
│   └── institution-theme.ts
│
└── accessibility/
```

---

# 103. PRINCÍPIO DE DESIGN

A interface deverá ser:

```text
moderna
educacional
limpa
consistente
responsiva
acessível
```

sem reproduzir visual antigo ou excessivamente burocrático.

---

# 104. DECISÕES CONSOLIDADAS

Ficam definidas para Frontend Público, Design System e Temas Institucionais V1:

```text
Design System único

Temas:
FUMEP
ETMSL
CRAMAM

Visual moderno e educacional

Conteúdo máximo aproximado:
1280px

Menu hamburger também no desktop

Drawer lateral

Máximo de 2 níveis de menu

Logo sempre clicável

Logo leva à Home da instituição atual

Seção "Outras instituições"
no final do drawer

Breadcrumbs

Footer enxuto

Sem mapa no footer

Sem duplicação integral do menu no footer

Dark mode

ADMIN define:
SYSTEM
LIGHT
DARK

Visitante pode sobrescrever localmente

Preferência SYSTEM respeita
prefers-color-scheme

Evitar flash de tema

Acessibilidade integrada

Skip link

VLibras

Focus visível

Reduced motion

Cards com imagens em destaque

Imagens responsivas AVIF/WebP

Lazy loading

Design tokens

Sem cores/fontes arbitrárias pelo Editor

Validação de contraste para tema institucional

SSR para conteúdo público

Mínimo JavaScript possível

ThemeContext

Componentes compartilhados

Page Builder usa Design System

Busca disponível no header

URLs legíveis

SEO

404 e 500 personalizadas

Testes light/dark por instituição

Testes responsivos

Testes de acessibilidade
```

---

# 105. ARQUITETURA RESUMIDA

```text
                    VISITANTE
                        │
                        ▼
                     Next.js
                        │
                InstitutionContext
                        │
            ┌───────────┼───────────┐
            │           │           │
            ▼           ▼           ▼
          FUMEP       ETMSL       CRAMAM
            │           │           │
            └───────────┼───────────┘
                        │
                        ▼
                  ThemeContext
                        │
                        ▼
                  Design System
                        │
             ┌──────────┼──────────┐
             │          │          │
             ▼          ▼          ▼
          Header      Blocks     Footer
             │          │          │
             └──────────┼──────────┘
                        ▼
                   Portal Público
```

---

# 106. STATUS

Com este documento, a camada de **Frontend Público, Design System e Temas Institucionais da Arquitetura Técnica V1** é considerada definida.

As decisões deverão orientar posteriormente:

- tokens;
- ThemeContext;
- InstitutionContext;
- componentes compartilhados;
- header;
- drawer;
- breadcrumbs;
- footer;
- dark mode;
- acessibilidade;
- Page Builder;
- busca;
- SEO;
- responsividade;
- testes visuais;
- testes de acessibilidade;
- testes de performance.
