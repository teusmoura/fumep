<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
defineProps<{ block: Extract<BuilderBlock, { type: "TEXT" }> }>();
</script>

<template>
  <section
    class="builder-block"
    :id="block.anchor"
    :class="{ 'builder-surface': block.background === 'SURFACE' }"
  >
    <h2>{{ block.data.title }}</h2>
    <p>{{ block.data.body }}</p>
  </section>
</template>
