<script setup lang="ts">
type NewsItem = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  cover_image_alt: string;
  published_at: string;
};

const route = useRoute();
const config = useRuntimeConfig();
const institution = String(route.params.institution);
const apiBase = import.meta.server ? config.apiInternal : config.public.apiBase;
const publicBase = `${config.public.apiBase}/api/v1/public/institutions/${institution}/articles`;
if (import.meta.server) useResponseHeader("Cache-Control").value = "no-store";
const { data: items, error } = await useAsyncData(`news-${institution}`, () =>
  $fetch<NewsItem[]>(`${apiBase}/api/v1/public/institutions/${institution}/articles`),
);
if (error.value) throw createError({ statusCode: 503, statusMessage: "Notícias indisponíveis" });
useHead({ title: `Notícias · ${institution.toUpperCase()} — Portal FUMEP` });
</script>

<template>
  <div class="builder-shell">
    <a class="skip-link" href="#news-public-main">Ir para o conteúdo</a>
    <header class="builder-header">
      <NuxtLink to="/">FUMEP</NuxtLink><span>{{ institution.toUpperCase() }}</span>
    </header>
    <main id="news-public-main" class="builder-public">
      <h1>Notícias</h1>
      <p v-if="!items?.length">Nenhuma notícia publicada.</p>
      <ol v-else class="builder-feed-list">
        <li v-for="item in items" :key="item.id">
          <article>
            <NuxtLink :to="`/noticias/${institution}/${item.slug}`">
              <img
                :src="`${publicBase}/${item.slug}/cover`"
                :alt="item.cover_image_alt"
                loading="lazy"
              />
              <h2>{{ item.title }}</h2>
            </NuxtLink>
            <p v-if="item.summary">{{ item.summary }}</p>
            <time :datetime="item.published_at">{{ item.published_at.slice(0, 10) }}</time>
          </article>
        </li>
      </ol>
    </main>
  </div>
</template>
