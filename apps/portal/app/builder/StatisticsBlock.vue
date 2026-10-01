<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
defineProps<{ block: Extract<BuilderBlock, { type: "STATISTICS" }> }>();
</script>

<template>
  <section
    class="builder-block"
    :id="block.anchor"
    :class="{ 'builder-surface': block.background === 'SURFACE' }"
    aria-label="Indicadores"
  >
    <ul class="builder-statistics">
      <li v-for="(item, index) in block.data.items" :key="index">
        <h3>{{ item.label }}</h3>
        <strong class="builder-statistics-value">{{ item.value }}</strong>
        <p v-if="item.description">{{ item.description }}</p>
      </li>
    </ul>
  </section>
</template>
