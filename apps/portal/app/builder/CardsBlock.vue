<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
import { mediaFor } from "./contracts";
defineProps<{ block: Extract<BuilderBlock, { type: "CARDS" }> }>();
</script>

<template>
  <section
    class="builder-block"
    :class="{ 'builder-surface': block.background === 'SURFACE' }"
    :id="block.anchor"
  >
    <h2 v-if="block.data.title">{{ block.data.title }}</h2>
    <div class="builder-cards">
      <article v-for="(item, index) in block.data.items" :key="index" class="builder-card-tile">
        <img :src="mediaFor(item.imageId)?.src" :alt="item.alt" />
        <h3>{{ item.title }}</h3>
        <p v-if="item.description">{{ item.description }}</p>
        <NuxtLink v-if="item.url" :to="item.url">Saiba mais sobre {{ item.title }}</NuxtLink>
      </article>
    </div>
  </section>
</template>
