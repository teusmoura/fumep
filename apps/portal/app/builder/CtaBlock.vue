<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
defineProps<{ block: Extract<BuilderBlock, { type: "CTA" }> }>();
</script>

<template>
  <section
    class="builder-block builder-cta-block"
    :class="{ 'builder-surface': block.background === 'SURFACE' }"
    :id="block.anchor"
  >
    <h2>{{ block.data.title }}</h2>
    <p v-if="block.data.text">{{ block.data.text }}</p>
    <NuxtLink class="builder-cta" :to="block.data.buttonUrl">{{ block.data.buttonLabel }}</NuxtLink>
  </section>
</template>
