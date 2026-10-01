<script setup lang="ts">
import { computed, ref } from "vue";
import {
  createBlock,
  moveBlock,
  normalizePositions,
  validatePage,
  blockTypes,
  type BuilderBlock,
  type BlockType,
} from "~/builder/contracts";
import { demoBlocks } from "~/builder/demo";
import { blockRegistry } from "~/builder/registry";
import BuilderBlocks from "~/builder/BuilderBlocks.vue";

useHead({ title: "Page Builder demonstrativo — Portal FUMEP" });
const blocks = ref<BuilderBlock[]>(demoBlocks.map((block) => structuredClone(block)));
const errors = computed(() => validatePage(blocks.value));
function add(type: BlockType) {
  blocks.value = [...blocks.value, createBlock(type, blocks.value.length)];
}
function update(block: BuilderBlock) {
  blocks.value = blocks.value.map((item) => (item.id === block.id ? block : item));
}
function remove(index: number) {
  blocks.value = normalizePositions(blocks.value.filter((_, position) => position !== index));
}
</script>

<template>
  <div class="builder-shell">
    <a class="skip-link" href="#main-content">Ir para o conteúdo</a>
    <header class="builder-header">
      <NuxtLink to="/">FUMEP</NuxtLink>
      <span>Page Builder · demonstração local</span>
      <NuxtLink to="/builder-demo/public">Ver página pública de exemplo</NuxtLink>
    </header>
    <main id="main-content" class="builder-layout">
      <section aria-labelledby="editor-heading">
        <h1 id="editor-heading">Editar página</h1>
        <p class="builder-notice" role="status">
          Demonstração local: alterações não são salvas. Mídias são ilustrações da aplicação, não
          uploads.
        </p>
        <div class="builder-add" aria-label="Adicionar bloco">
          <button v-for="type in blockTypes" :key="type" type="button" @click="add(type)">
            Adicionar {{ blockRegistry[type].label }}
          </button>
        </div>
        <ol class="builder-list">
          <li v-for="(block, index) in blocks" :key="block.id" class="builder-card">
            <h2>{{ index + 1 }}. {{ blockRegistry[block.type].label }}</h2>
            <div class="builder-actions">
              <button
                type="button"
                :disabled="index === 0"
                :aria-label="`Mover ${blockRegistry[block.type].label} para cima`"
                @click="blocks = moveBlock(blocks, index, index - 1)"
              >
                ↑ Subir
              </button>
              <button
                type="button"
                :disabled="index === blocks.length - 1"
                :aria-label="`Mover ${blockRegistry[block.type].label} para baixo`"
                @click="blocks = moveBlock(blocks, index, index + 1)"
              >
                ↓ Descer
              </button>
              <button
                type="button"
                :aria-label="`Remover ${blockRegistry[block.type].label}`"
                @click="remove(index)"
              >
                Remover
              </button>
            </div>
            <component :is="blockRegistry[block.type].editor" :block="block" @change="update" />
          </li>
        </ol>
      </section>
      <section aria-labelledby="preview-heading" class="builder-preview">
        <h2 id="preview-heading">Prévia</h2>
        <p v-if="errors.length" role="alert">Corrija os blocos antes de visualizar.</p>
        <ul v-if="errors.length" class="builder-errors">
          <li v-for="error in errors" :key="error">{{ error }}</li>
        </ul>
        <BuilderBlocks v-else :blocks="blocks" />
      </section>
    </main>
  </div>
</template>
