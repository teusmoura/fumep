<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
defineProps<{ block: Extract<BuilderBlock, { type: "SPACER" }> }>();
</script>

<template>
  <div
    :id="block.anchor"
    class="builder-spacer"
    :class="`builder-spacer-${block.data.size.toLowerCase()}`"
    role="separator"
    aria-orientation="horizontal"
    aria-label="Separação de conteúdo"
  />
</template>
