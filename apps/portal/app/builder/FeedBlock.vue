<script setup lang="ts">
import { computed } from "vue";
import type { BuilderBlock } from "./contracts";
import { feedItemsFor } from "./feeds";
type FeedBlock = Extract<
  BuilderBlock,
  {
    type:
      | "NEWS_FEED"
      | "EVENT_FEED"
      | "COURSE_FEED"
      | "CONTEST_FEED"
      | "SELECTION_PROCESS_FEED"
      | "GALLERY_FEED";
  }
>;
const props = defineProps<{ block: FeedBlock }>();
const labels = {
  NEWS_FEED: "Notícias",
  EVENT_FEED: "Eventos",
  COURSE_FEED: "Cursos",
  CONTEST_FEED: "Concursos",
  SELECTION_PROCESS_FEED: "Processos seletivos",
  GALLERY_FEED: "Galeria",
} as const;
const items = computed(() => feedItemsFor(props.block));
</script>

<template>
  <section
    class="builder-block"
    :id="block.anchor"
    :class="{ 'builder-surface': block.background === 'SURFACE' }"
    :aria-label="block.data.title || labels[block.type]"
  >
    <h2>{{ block.data.title || labels[block.type] }}</h2>
    <p class="builder-hint">
      Conteúdo de demonstração; este feed ainda não consulta dados publicados.
    </p>
    <ul class="builder-feed-list">
      <li v-for="(item, index) in items" :key="index">
        <img v-if="item.imageSrc" :src="item.imageSrc" :alt="item.imageAlt" />
        <h3>{{ item.title }}</h3>
        <p>{{ item.description }}</p>
        <NuxtLink v-if="item.url" :to="item.url">Abrir {{ item.title }}</NuxtLink>
      </li>
    </ul>
    <p v-if="!items.length">Nenhum item demonstrativo corresponde aos filtros.</p>
  </section>
</template>
