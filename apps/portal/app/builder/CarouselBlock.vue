<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { BuilderBlock } from "./contracts";
import { mediaFor } from "./contracts";
const props = defineProps<{ block: Extract<BuilderBlock, { type: "CAROUSEL" }> }>();
const active = ref(0);
const count = computed(() => props.block.data.items.length);
watch(count, (length) => {
  if (active.value >= length) active.value = Math.max(0, length - 1);
});
function move(delta: number) {
  active.value = (active.value + delta + count.value) % count.value;
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowRight") move(1);
  else if (event.key === "ArrowLeft") move(-1);
  else if (event.key === "Home") active.value = 0;
  else if (event.key === "End") active.value = count.value - 1;
  else return;
  event.preventDefault();
}
</script>

<template>
  <section
    class="builder-block"
    :id="block.anchor"
    :class="{ 'builder-surface': block.background === 'SURFACE' }"
    aria-label="Galeria de imagens"
    @keydown="onKeydown"
  >
    <div
      v-for="(item, index) in block.data.items"
      v-show="active === index"
      :key="index"
      class="builder-carousel-slide"
    >
      <figure>
        <img :src="mediaFor(item.imageId)?.src" :alt="item.alt" />
        <figcaption v-if="item.caption">{{ item.caption }}</figcaption>
      </figure>
      <NuxtLink v-if="item.url" :to="item.url">Saiba mais sobre a imagem {{ index + 1 }}</NuxtLink>
    </div>
    <div class="builder-carousel-controls" v-if="count > 1">
      <button type="button" @click="move(-1)">Imagem anterior</button>
      <span aria-live="polite">Imagem {{ active + 1 }} de {{ count }}</span>
      <button type="button" @click="move(1)">Próxima imagem</button>
    </div>
  </section>
</template>
