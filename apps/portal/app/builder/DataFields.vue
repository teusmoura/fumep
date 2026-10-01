<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
import { mediaFixture } from "./contracts";

type DataBlock = Extract<BuilderBlock, { type: "TIMELINE" | "STATISTICS" | "CAROUSEL" }>;
const props = defineProps<{ block: DataBlock }>();
const emit = defineEmits<{ change: [block: BuilderBlock] }>();
const read = (event: Event) => (event.target as HTMLInputElement).value;
function items(): Record<string, string>[] {
  return props.block.data.items as unknown as Record<string, string>[];
}
function update(items: Record<string, string>[]) {
  emit("change", { ...props.block, data: { ...props.block.data, items } } as BuilderBlock);
}
function changeItem(index: number, field: string, value: string) {
  update(
    items().map((item, position) => (position === index ? { ...item, [field]: value } : item)),
  );
}
function limit() {
  return props.block.type === "TIMELINE" ? 50 : props.block.type === "STATISTICS" ? 12 : 10;
}
function addItem() {
  if (items().length >= limit()) return;
  const item: Record<string, string> =
    props.block.type === "TIMELINE"
      ? { date: "", title: "Novo marco", description: "Descrição" }
      : props.block.type === "STATISTICS"
        ? { value: "1", label: "Novo indicador", description: "" }
        : { imageId: mediaFixture[0].id, alt: "Fachada da ETMSL", caption: "", url: "" };
  update([...items(), item]);
}
function removeItem(index: number) {
  if (items().length > 1) update(items().filter((_, position) => position !== index));
}
function changeTitle(value: string) {
  if (props.block.type === "TIMELINE")
    emit("change", { ...props.block, data: { ...props.block.data, title: value } });
}
</script>

<template>
  <div class="builder-fields">
    <template v-if="block.type === 'TIMELINE'">
      <label :for="`${block.id}-title`">Título (opcional)</label>
      <input
        :id="`${block.id}-title`"
        :value="block.data.title"
        @input="changeTitle(read($event))"
      />
    </template>
    <fieldset v-for="(item, index) in items()" :key="index" class="builder-item-fieldset">
      <legend>
        {{
          block.type === "TIMELINE" ? "Marco" : block.type === "STATISTICS" ? "Indicador" : "Imagem"
        }}
        {{ index + 1 }}
      </legend>
      <template v-if="block.type === 'TIMELINE'">
        <label :for="`${block.id}-${index}-date`">Data (opcional)</label>
        <input
          :id="`${block.id}-${index}-date`"
          :value="item.date"
          @input="changeItem(index, 'date', read($event))"
        />
        <label :for="`${block.id}-${index}-title`">Título</label>
        <input
          :id="`${block.id}-${index}-title`"
          :value="item.title"
          @input="changeItem(index, 'title', read($event))"
        />
        <label :for="`${block.id}-${index}-description`">Descrição</label>
        <textarea
          :id="`${block.id}-${index}-description`"
          :value="item.description"
          rows="2"
          @input="changeItem(index, 'description', read($event))"
        />
      </template>
      <template v-if="block.type === 'STATISTICS'">
        <label :for="`${block.id}-${index}-value`">Valor</label>
        <input
          :id="`${block.id}-${index}-value`"
          :value="item.value"
          @input="changeItem(index, 'value', read($event))"
        />
        <label :for="`${block.id}-${index}-label`">Rótulo</label>
        <input
          :id="`${block.id}-${index}-label`"
          :value="item.label"
          @input="changeItem(index, 'label', read($event))"
        />
        <label :for="`${block.id}-${index}-description`">Descrição (opcional)</label>
        <textarea
          :id="`${block.id}-${index}-description`"
          :value="item.description"
          rows="2"
          @input="changeItem(index, 'description', read($event))"
        />
      </template>
      <template v-if="block.type === 'CAROUSEL'">
        <label :for="`${block.id}-${index}-media`">Mídia de demonstração</label>
        <select
          :id="`${block.id}-${index}-media`"
          :value="item.imageId"
          @change="changeItem(index, 'imageId', read($event))"
        >
          <option v-for="media in mediaFixture" :key="media.id" :value="media.id">
            {{ media.label }}
          </option>
        </select>
        <label :for="`${block.id}-${index}-alt`">Texto alternativo</label>
        <input
          :id="`${block.id}-${index}-alt`"
          :value="item.alt"
          @input="changeItem(index, 'alt', read($event))"
        />
        <label :for="`${block.id}-${index}-caption`">Legenda (opcional)</label>
        <input
          :id="`${block.id}-${index}-caption`"
          :value="item.caption"
          @input="changeItem(index, 'caption', read($event))"
        />
        <label :for="`${block.id}-${index}-url`">Caminho interno (opcional)</label>
        <input
          :id="`${block.id}-${index}-url`"
          :value="item.url"
          placeholder="/etmsl"
          @input="changeItem(index, 'url', read($event))"
        />
      </template>
      <button type="button" :disabled="items().length <= 1" @click="removeItem(index)">
        Remover item {{ index + 1 }}
      </button>
    </fieldset>
    <button type="button" :disabled="items().length >= limit()" @click="addItem">
      Adicionar item
    </button>
    <p class="builder-hint">Limite: {{ limit() }} itens.</p>
  </div>
</template>
