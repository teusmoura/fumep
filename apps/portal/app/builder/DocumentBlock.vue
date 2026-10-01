<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
import { pdfFixture } from "./contracts";
defineProps<{ block: Extract<BuilderBlock, { type: "DOCUMENT" }> }>();
</script>

<template>
  <section
    class="builder-block"
    :id="block.anchor"
    :class="{ 'builder-surface': block.background === 'SURFACE' }"
    aria-label="Documento PDF"
  >
    <h2 v-if="block.data.title">{{ block.data.title }}</h2>
    <p v-if="block.data.description">{{ block.data.description }}</p>
    <p class="builder-hint">
      PDF de demonstração; não representa um arquivo persistido na Biblioteca de Mídia.
    </p>
    <a :href="pdfFixture.src" target="_blank" rel="noopener noreferrer" type="application/pdf">{{
      block.data.buttonLabel || "Abrir documento PDF em nova aba"
    }}</a>
  </section>
</template>
