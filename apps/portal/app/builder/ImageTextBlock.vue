<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
import { mediaFor } from "./contracts";
defineProps<{ block: Extract<BuilderBlock, { type: "IMAGE_TEXT" }> }>();
</script>

<template>
  <section
    class="builder-block builder-image-text"
    :class="{
      'builder-surface': block.background === 'SURFACE',
      'builder-image-right': block.data.imagePosition === 'IMAGE_RIGHT',
    }"
    :id="block.anchor"
  >
    <img :src="mediaFor(block.data.imageId)?.src" :alt="block.data.imageAlt" />
    <div>
      <h2>{{ block.data.title }}</h2>
      <p>{{ block.data.text }}</p>
      <NuxtLink v-if="block.data.buttonLabel" class="builder-cta" :to="block.data.buttonUrl">{{
        block.data.buttonLabel
      }}</NuxtLink>
    </div>
  </section>
</template>
