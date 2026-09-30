<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
import { blockRegistry } from "./registry";
defineProps<{ blocks: BuilderBlock[] }>();
</script>

<template>
  <div class="builder-rendered">
    <component
      :is="blockRegistry[block.type].renderer"
      v-for="block in blocks.filter((item) => item.isVisible)"
      :key="block.id"
      :block="block"
    />
  </div>
</template>
