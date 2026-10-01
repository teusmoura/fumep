<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
defineProps<{ block: Extract<BuilderBlock, { type: "TIMELINE" }> }>();
</script>

<template>
  <section
    class="builder-block"
    :id="block.anchor"
    :class="{ 'builder-surface': block.background === 'SURFACE' }"
    :aria-label="block.data.title || 'Linha do tempo'"
  >
    <h2 v-if="block.data.title">{{ block.data.title }}</h2>
    <ol class="builder-timeline">
      <li v-for="(item, index) in block.data.items" :key="index">
        <span v-if="item.date" class="builder-timeline-date">{{ item.date }}</span>
        <h3>{{ item.title }}</h3>
        <p>{{ item.description }}</p>
      </li>
    </ol>
  </section>
</template>
