<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
defineProps<{ block: Extract<BuilderBlock, { type: "FAQ" }> }>();
</script>

<template>
  <section
    class="builder-block"
    :id="block.anchor"
    :class="{ 'builder-surface': block.background === 'SURFACE' }"
  >
    <h2 v-if="block.data.title">{{ block.data.title }}</h2>
    <div v-for="(item, index) in block.data.items" :key="index" class="builder-faq-item">
      <details>
        <summary>{{ item.question }}</summary>
        <p>{{ item.answer }}</p>
      </details>
    </div>
  </section>
</template>
