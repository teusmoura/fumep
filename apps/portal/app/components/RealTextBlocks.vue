<script setup lang="ts">
import type { PageBlock, PublicGalleryItem } from "~/lib/migration-pages";
defineProps<{
  blocks: PageBlock[];
  galleryFeeds?: Record<string, PublicGalleryItem[]>;
  mediaBase?: string;
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
    </section>
  </div>
</template>
