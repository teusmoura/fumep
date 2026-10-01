<script setup lang="ts">
import { nextTick, ref } from "vue";
import type { BuilderBlock } from "./contracts";
const props = defineProps<{ block: Extract<BuilderBlock, { type: "TABS" }> }>();
const active = ref(0);
const tabId = (index: number) => `tab-${props.block.id}-${index}`;
const panelId = (index: number) => `panel-${props.block.id}-${index}`;
function onKeydown(event: KeyboardEvent, index: number) {
  const count = props.block.data.tabs.length;
  let next = index;
  if (event.key === "ArrowRight") next = (index + 1) % count;
  else if (event.key === "ArrowLeft") next = (index - 1 + count) % count;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = count - 1;
  else return;
  event.preventDefault();
  active.value = next;
  nextTick(() => document.getElementById(tabId(next))?.focus());
}
</script>

<template>
  <section
    class="builder-block"
    :id="block.anchor"
    :class="{ 'builder-surface': block.background === 'SURFACE' }"
  >
    <div role="tablist" aria-label="Abas de conteúdo" class="builder-tablist">
      <button
        v-for="(tab, index) in block.data.tabs"
        :id="tabId(index)"
        :key="index"
        type="button"
        role="tab"
        :aria-selected="active === index"
        :aria-controls="panelId(index)"
        :tabindex="active === index ? 0 : -1"
        @click="active = index"
        @keydown="onKeydown($event, index)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div
      v-for="(tab, index) in block.data.tabs"
      v-show="active === index"
      :id="panelId(index)"
      :key="index"
      role="tabpanel"
      :aria-labelledby="tabId(index)"
      tabindex="0"
      class="builder-tabpanel"
    >
      <p>{{ tab.content }}</p>
    </div>
  </section>
</template>
