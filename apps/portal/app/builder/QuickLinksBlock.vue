<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
defineProps<{ block: Extract<BuilderBlock, { type: "QUICK_LINKS" }> }>();
const glyphs = { NONE: "", BOOK: "▤", CALENDAR: "▦", ARROW: "↗" } as const;
</script>

<template>
  <nav
    class="builder-block"
    :class="{ 'builder-surface': block.background === 'SURFACE' }"
    :id="block.anchor"
    :aria-label="block.data.title || 'Links rápidos'"
  >
    <h2 v-if="block.data.title">{{ block.data.title }}</h2>
    <ul class="builder-quick-links">
      <li v-for="(item, index) in block.data.items" :key="index">
        <NuxtLink :to="item.url"
          ><span v-if="item.icon !== 'NONE'" aria-hidden="true">{{ glyphs[item.icon] }}</span>
          {{ item.label }}</NuxtLink
        >
      </li>
    </ul>
  </nav>
</template>
