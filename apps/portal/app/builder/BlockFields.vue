<script setup lang="ts">
import { computed } from "vue";
import type { BuilderBlock } from "./contracts";
import { mediaFixture } from "./contracts";
import AdvancedFields from "./AdvancedFields.vue";
import StructuredFields from "./StructuredFields.vue";

const props = defineProps<{ block: BuilderBlock }>();
const emit = defineEmits<{ change: [block: BuilderBlock] }>();
const data = computed(() => props.block.data as unknown as Record<string, string | boolean>);
const text = (field: string) => String(data.value[field] ?? "");
const read = (event: Event) => (event.target as HTMLInputElement).value;
const checked = (event: Event) => (event.target as HTMLInputElement).checked;

function change(field: string, value: string | boolean) {
  emit("change", { ...props.block, data: { ...props.block.data, [field]: value } } as BuilderBlock);
}
function changeCommon(field: string, value: string | boolean | undefined) {
  emit("change", { ...props.block, [field]: value } as BuilderBlock);
}
</script>

<template>
  <div class="builder-fields">
    <label :for="`${block.id}-anchor`">Âncora</label>
    <input
      :id="`${block.id}-anchor`"
      :value="block.anchor ?? ''"
      placeholder="secao-exemplo"
      @input="changeCommon('anchor', read($event) || undefined)"
    />
    <label :for="`${block.id}-background`">Fundo</label>
    <select
      :id="`${block.id}-background`"
      :value="block.background"
      @change="changeCommon('background', read($event))"
    >
      <option value="NONE">Padrão</option>
      <option value="SURFACE">Destaque suave</option>
    </select>
    <label :for="`${block.id}-visible`" class="builder-check"
      ><input
        :id="`${block.id}-visible`"
        type="checkbox"
        :checked="block.isVisible"
        @change="changeCommon('isVisible', checked($event))"
      />
      Exibir no preview</label
    >

    <template v-if="block.type !== 'IMAGE' && block.type !== 'TABS' && block.type !== 'TABLE'">
      <label :for="`${block.id}-title`">Título</label>
      <input
        :id="`${block.id}-title`"
        :value="text('title')"
        @input="change('title', read($event))"
      />
    </template>

    <template v-if="block.type === 'TEXT'">
      <label :for="`${block.id}-body`">Texto simples (sem HTML)</label>
      <textarea
        :id="`${block.id}-body`"
        :value="text('body')"
        rows="5"
        @input="change('body', read($event))"
      />
    </template>

    <template v-if="block.type === 'HERO' || block.type === 'IMAGE'">
      <label :for="`${block.id}-media`">Mídia de demonstração</label>
      <select
        :id="`${block.id}-media`"
        :value="text('imageId')"
        @change="change('imageId', read($event))"
      >
        <option v-for="media in mediaFixture" :key="media.id" :value="media.id">
          {{ media.label }}
        </option>
      </select>
      <label :for="`${block.id}-decorative`" class="builder-check"
        ><input
          :id="`${block.id}-decorative`"
          type="checkbox"
          :checked="Boolean(data.decorative)"
          @change="change('decorative', checked($event))"
        />
        Imagem decorativa</label
      >
      <label :for="`${block.id}-alt`"
        >Texto alternativo
        {{ data.decorative ? "(vazio para decorativa)" : "(obrigatório)" }}</label
      >
      <input
        :id="`${block.id}-alt`"
        :value="text(block.type === 'HERO' ? 'imageAlt' : 'alt')"
        :disabled="Boolean(data.decorative)"
        @input="change(block.type === 'HERO' ? 'imageAlt' : 'alt', read($event))"
      />
    </template>

    <template v-if="block.type === 'HERO'">
      <label :for="`${block.id}-description`">Descrição</label>
      <textarea
        :id="`${block.id}-description`"
        :value="text('description')"
        rows="3"
        @input="change('description', read($event))"
      />
      <label :for="`${block.id}-buttonLabel`">Texto do botão</label>
      <input
        :id="`${block.id}-buttonLabel`"
        :value="text('buttonLabel')"
        @input="change('buttonLabel', read($event))"
      />
      <label :for="`${block.id}-buttonUrl`">Caminho interno do botão</label>
      <input
        :id="`${block.id}-buttonUrl`"
        :value="text('buttonUrl')"
        placeholder="/etmsl"
        @input="change('buttonUrl', read($event))"
      />
    </template>

    <template v-if="block.type === 'IMAGE'">
      <label :for="`${block.id}-caption`">Legenda</label>
      <input
        :id="`${block.id}-caption`"
        :value="text('caption')"
        @input="change('caption', read($event))"
      />
      <label :for="`${block.id}-link`">Caminho interno da imagem</label>
      <input
        :id="`${block.id}-link`"
        :value="text('link')"
        placeholder="/etmsl"
        @input="change('link', read($event))"
      />
    </template>
    <AdvancedFields
      v-if="
        block.type === 'IMAGE_TEXT' ||
        block.type === 'CARDS' ||
        block.type === 'QUICK_LINKS' ||
        block.type === 'CTA'
      "
      :block="block"
      @change="emit('change', $event)"
    />
    <StructuredFields
      v-if="block.type === 'FAQ' || block.type === 'TABS' || block.type === 'TABLE'"
      :block="block"
      @change="emit('change', $event)"
    />
  </div>
</template>
