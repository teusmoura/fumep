<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
import { pdfFixture } from "./contracts";
type ExternalBlock = Extract<BuilderBlock, { type: "MAP" | "VIDEO" | "DOCUMENT" }>;
const props = defineProps<{ block: ExternalBlock }>();
const emit = defineEmits<{ change: [block: BuilderBlock] }>();
const read = (event: Event) => (event.target as HTMLInputElement).value;
const text = (field: string) =>
  String((props.block.data as unknown as Record<string, unknown>)[field] ?? "");
function change(field: string, value: string | number) {
  emit("change", { ...props.block, data: { ...props.block.data, [field]: value } } as BuilderBlock);
}
function changeNumber(field: string, event: Event) {
  const value = read(event);
  change(field, value === "" ? NaN : Number(value));
}
</script>

<template>
  <div class="builder-fields">
    <template v-if="block.type !== 'MAP'">
      <label :for="`${block.id}-title`"
        >Título {{ block.type === "DOCUMENT" ? "(opcional)" : "" }}</label
      >
      <input
        :id="`${block.id}-title`"
        :value="text('title')"
        @input="change('title', read($event))"
      />
    </template>
    <template v-if="block.type === 'MAP'">
      <label :for="`${block.id}-title`">Título (opcional)</label>
      <input
        :id="`${block.id}-title`"
        :value="text('title')"
        @input="change('title', read($event))"
      />
      <label :for="`${block.id}-address`">Endereço</label>
      <input
        :id="`${block.id}-address`"
        :value="text('address')"
        @input="change('address', read($event))"
      />
      <label :for="`${block.id}-latitude`">Latitude (-90 a 90)</label>
      <input
        :id="`${block.id}-latitude`"
        type="number"
        step="any"
        min="-90"
        max="90"
        :value="block.data.latitude"
        @input="changeNumber('latitude', $event)"
      />
      <label :for="`${block.id}-longitude`">Longitude (-180 a 180)</label>
      <input
        :id="`${block.id}-longitude`"
        type="number"
        step="any"
        min="-180"
        max="180"
        :value="block.data.longitude"
        @input="changeNumber('longitude', $event)"
      />
      <label :for="`${block.id}-zoom`">Zoom (1 a 20)</label>
      <input
        :id="`${block.id}-zoom`"
        type="number"
        step="1"
        min="1"
        max="20"
        :value="block.data.zoom"
        @input="changeNumber('zoom', $event)"
      />
    </template>
    <template v-if="block.type === 'VIDEO'">
      <label :for="`${block.id}-url`">URL HTTPS do YouTube ou Vimeo</label>
      <input
        :id="`${block.id}-url`"
        type="url"
        :value="text('url')"
        @input="change('url', read($event))"
      />
      <label :for="`${block.id}-description`">Descrição (opcional)</label>
      <textarea
        :id="`${block.id}-description`"
        :value="text('description')"
        rows="2"
        @input="change('description', read($event))"
      />
    </template>
    <template v-if="block.type === 'DOCUMENT'">
      <label :for="`${block.id}-media`">PDF de demonstração</label>
      <select
        :id="`${block.id}-media`"
        :value="text('mediaId')"
        @change="change('mediaId', read($event))"
      >
        <option :value="pdfFixture.id">{{ pdfFixture.label }}</option>
      </select>
      <p class="builder-hint">Fixture local; não há seleção da Media Library real neste loop.</p>
      <label :for="`${block.id}-description`">Descrição (opcional)</label>
      <textarea
        :id="`${block.id}-description`"
        :value="text('description')"
        rows="2"
        @input="change('description', read($event))"
      />
      <label :for="`${block.id}-buttonLabel`">Rótulo do botão (opcional)</label>
      <input
        :id="`${block.id}-buttonLabel`"
        :value="text('buttonLabel')"
        @input="change('buttonLabel', read($event))"
      />
    </template>
  </div>
</template>
