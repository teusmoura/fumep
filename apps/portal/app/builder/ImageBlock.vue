<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
import { mediaFor } from "./contracts";
defineProps<{ block: Extract<BuilderBlock, { type: "IMAGE" }> }>();
</script>

<template>
  <figure
    class="builder-block"
    :id="block.anchor"
    :class="{ 'builder-surface': block.background === 'SURFACE' }"
  >
    <NuxtLink v-if="block.data.link" :to="block.data.link">
      <img
        :src="mediaFor(block.data.imageId)?.src"
        :alt="block.data.decorative ? '' : block.data.alt"
      />
    </NuxtLink>
    <img
      v-else
      :src="mediaFor(block.data.imageId)?.src"
      :alt="block.data.decorative ? '' : block.data.alt"
    />
    <figcaption v-if="block.data.caption">{{ block.data.caption }}</figcaption>
  </figure>
</template>
