<script setup lang="ts">
import { computed, ref } from "vue";
import type { BuilderBlock } from "./contracts";
import { videoEmbedUrl } from "./contracts";
const props = defineProps<{ block: Extract<BuilderBlock, { type: "VIDEO" }> }>();
const playing = ref(false);
const embedUrl = computed(() => videoEmbedUrl(props.block.data.url));
</script>

<template>
  <section
    class="builder-block"
    :id="block.anchor"
    :class="{ 'builder-surface': block.background === 'SURFACE' }"
  >
    <h2>{{ block.data.title }}</h2>
    <p v-if="block.data.description">{{ block.data.description }}</p>
    <button v-if="!playing" type="button" @click="playing = true">
      Carregar vídeo de {{ block.data.url.includes("vimeo.com") ? "Vimeo" : "YouTube" }}
    </button>
    <iframe
      v-else-if="embedUrl"
      :src="embedUrl"
      :title="block.data.title"
      loading="lazy"
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
      class="builder-video-frame"
    />
  </section>
</template>
