<script setup lang="ts">
import type { TextBlock } from "~/lib/migration-pages";
defineProps<{ blocks: TextBlock[] }>();
</script>

<template>
  <div class="builder-rendered">
    <section
      v-for="block in blocks.filter((item) => item.isVisible)"
      :id="block.anchor ?? undefined"
      :key="block.id"
      class="builder-block"
    >
      <h2>{{ block.data.title }}</h2>
      <p>{{ block.data.body }}</p>
    </section>
  </div>
</template>
