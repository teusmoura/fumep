<script setup lang="ts">
import type { PageBlock, PublicGalleryItem, PublicNewsCard } from "~/lib/migration-pages";
defineProps<{
  blocks: PageBlock[];
  galleryFeeds?: Record<string, PublicGalleryItem[]>;
  newsFeeds?: Record<string, PublicNewsCard[]>;
  mediaBase?: string;
  newsApiBase?: string;
}>();
</script>

<template>
  <div class="builder-rendered">
    <section
      v-for="block in blocks.filter((item) => item.isVisible)"
      :id="block.anchor ?? undefined"
      :key="block.id"
      class="builder-block"
    >
      <template v-if="block.type === 'TEXT'">
        <h2>{{ block.data.title }}</h2>
        <p>{{ block.data.body }}</p>
      </template>
      <template v-else-if="block.type === 'GALLERY_FEED'">
        <h2>{{ block.data.title || "Galeria" }}</h2>
        <ol v-if="galleryFeeds?.[block.id]?.length" class="builder-feed-list">
          <li v-for="item in galleryFeeds[block.id]" :key="item.media_id">
            <figure>
              <img :src="`${mediaBase}/gallery-media/${item.media_id}`" :alt="item.alt_text" />
              <figcaption v-if="item.caption">{{ item.caption }}</figcaption>
            </figure>
          </li>
        </ol>
        <p v-else-if="!galleryFeeds">A galeria será carregada na página publicada.</p>
        <p v-else>Nenhuma imagem disponível nesta galeria.</p>
      </template>
      <template v-else-if="block.type === 'NEWS_FEED'">
        <h2>{{ block.data.title || "Notícias" }}</h2>
        <ol v-if="newsFeeds?.[block.id]?.length" class="builder-feed-list">
          <li v-for="item in newsFeeds[block.id]" :key="item.article_id">
            <article>
              <NuxtLink :to="`/noticias/${item.institution_slug}/${item.slug}`">
                <img
                  :src="`${newsApiBase}/api/v1/public/institutions/${item.institution_slug}/articles/${item.slug}/cover`"
                  :alt="item.cover_image_alt"
                  loading="lazy"
                />
                <h3>{{ item.title }}</h3>
              </NuxtLink>
              <p v-if="item.summary">{{ item.summary }}</p>
              <time :datetime="item.published_at">{{ item.published_at.slice(0, 10) }}</time>
            </article>
          </li>
        </ol>
        <p v-else-if="!newsFeeds">As notícias serão carregadas na página publicada.</p>
        <p v-else>Nenhuma notícia publicada para este filtro.</p>
      </template>
    </section>
  </div>
</template>
