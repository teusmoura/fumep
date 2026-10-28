<script setup lang="ts">
import RealTextBlocks from "~/components/RealTextBlocks.vue";
import type { TextBlock } from "~/lib/migration-pages";

type NewsArticle = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  cover_image_alt: string;
  published_at: string;
  version_number: number;
  blocks: TextBlock[];
};

const route = useRoute();
const config = useRuntimeConfig();
const institution = String(route.params.institution);
const slug = String(route.params.slug);
const path = `/api/v1/public/institutions/${institution}/articles/${slug}`;
const apiBase = import.meta.server ? config.apiInternal : config.public.apiBase;
if (import.meta.server) useResponseHeader("Cache-Control").value = "no-store";
const { data: article, error } = await useAsyncData(`article-${institution}-${slug}`, () =>
  $fetch<NewsArticle>(`${apiBase}${path}`),
);
if (error.value || !article.value)
  throw createError({ statusCode: 404, statusMessage: "Notícia não encontrada" });
useHead({
  title: `${article.value.title} — Portal FUMEP`,
  meta: article.value.summary ? [{ name: "description", content: article.value.summary }] : [],
});
</script>

<template>
  <div v-if="article" class="builder-shell">
    <a class="skip-link" href="#article-main">Ir para o conteúdo</a>
    <header class="builder-header">
      <NuxtLink to="/">FUMEP</NuxtLink><span>{{ institution.toUpperCase() }}</span>
    </header>
    <main id="article-main" class="builder-public">
      <NuxtLink :to="`/noticias/${institution}`">Voltar às notícias</NuxtLink>
      <article>
        <h1>{{ article.title }}</h1>
        <p v-if="article.summary">{{ article.summary }}</p>
        <time :datetime="article.published_at">{{ article.published_at.slice(0, 10) }}</time>
        <figure>
          <img :src="`${config.public.apiBase}${path}/cover`" :alt="article.cover_image_alt" />
        </figure>
        <RealTextBlocks :blocks="article.blocks" />
      </article>
    </main>
  </div>
</template>
