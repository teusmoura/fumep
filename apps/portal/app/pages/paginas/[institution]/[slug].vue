<script setup lang="ts">
import RealTextBlocks from "~/components/RealTextBlocks.vue";
import type { PublicPage } from "~/lib/migration-pages";

const route = useRoute();
const config = useRuntimeConfig();
const apiBase = import.meta.server ? config.apiInternal : config.public.apiBase;
const mediaBase = `${config.public.apiBase}/api/v1/public/institutions/${route.params.institution}/pages/${route.params.slug}`;
if (import.meta.server) useResponseHeader("Cache-Control").value = "no-store";
const { data: page, error } = await useAsyncData(
  `public-${route.params.institution}-${route.params.slug}`,
  () =>
    $fetch<PublicPage>(
      `${apiBase}/api/v1/public/institutions/${route.params.institution}/pages/${route.params.slug}`,
    ),
);
if (error.value || !page.value)
  throw createError({ statusCode: 404, statusMessage: "Página não encontrada" });
useHead({ title: `${page.value.title} — Portal FUMEP` });
</script>

<template>
  <div v-if="page" class="builder-shell">
    <a class="skip-link" href="#main-content">Ir para o conteúdo</a>
    <header class="builder-header">
      <NuxtLink to="/">FUMEP</NuxtLink><span>{{ page.institution_slug }}</span>
    </header>
    <main id="main-content" class="builder-public">
      <h1>{{ page.title }}</h1>
      <RealTextBlocks
        :blocks="page.blocks"
        :gallery-feeds="page.gallery_feeds"
        :media-base="mediaBase"
      />
    </main>
  </div>
</template>
