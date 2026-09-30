<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
import { mediaFor } from "./contracts";
defineProps<{ block: Extract<BuilderBlock, { type: "HERO" }> }>();
</script>

<template>
  <section
    class="builder-block builder-hero"
    :id="block.anchor"
    :class="{ 'builder-surface': block.background === 'SURFACE' }"
  >
    <img
      :src="mediaFor(block.data.imageId)?.src"
      :alt="block.data.decorative ? '' : block.data.imageAlt"
    />
    <div>
      <h2>{{ block.data.title }}</h2>
      <p>{{ block.data.description }}</p>
      <NuxtLink v-if="block.data.buttonLabel" :to="block.data.buttonUrl" class="builder-cta">{{
        block.data.buttonLabel
      }}</NuxtLink>
    </div>
  </section>
</template>
