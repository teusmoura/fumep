<script setup lang="ts">
import { computed } from "vue";
import type { BuilderBlock } from "./contracts";
const props = defineProps<{ block: Extract<BuilderBlock, { type: "MAP" }> }>();
const mapUrl = computed(() => {
  const { latitude, longitude, zoom } = props.block.data;
  return `https://www.openstreetmap.org/#map=${zoom}/${latitude}/${longitude}`;
});
</script>

<template>
  <section
    class="builder-block"
    :id="block.anchor"
    :class="{ 'builder-surface': block.background === 'SURFACE' }"
    aria-label="Localização"
  >
    <h2 v-if="block.data.title">{{ block.data.title }}</h2>
    <address>{{ block.data.address }}</address>
    <p>Coordenadas: {{ block.data.latitude }}, {{ block.data.longitude }}</p>
    <a :href="mapUrl" target="_blank" rel="noopener noreferrer">Abrir mapa em nova aba</a>
  </section>
</template>
