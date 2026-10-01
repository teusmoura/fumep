<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
import { mediaFixture } from "./contracts";

type AdvancedBlock = Extract<
  BuilderBlock,
  { type: "IMAGE_TEXT" | "CARDS" | "QUICK_LINKS" | "CTA" }
>;
const props = defineProps<{ block: AdvancedBlock }>();
const emit = defineEmits<{ change: [block: BuilderBlock] }>();
const read = (event: Event) => (event.target as HTMLInputElement).value;
function dataField(field: string): string {
  return String((props.block.data as unknown as Record<string, unknown>)[field] ?? "");
}
function change(field: string, value: string) {
  emit("change", { ...props.block, data: { ...props.block.data, [field]: value } } as BuilderBlock);
}
function items(): Record<string, string>[] {
  if (props.block.type !== "CARDS" && props.block.type !== "QUICK_LINKS") return [];
  return props.block.data.items as unknown as Record<string, string>[];
}
function changeItem(index: number, field: string, value: string) {
  const next = items().map((item, position) =>
    position === index ? { ...item, [field]: value } : item,
  );
  emit("change", { ...props.block, data: { ...props.block.data, items: next } } as BuilderBlock);
}
function addItem() {
  const next = items();
  if (next.length >= 12) return;
  const item =
    props.block.type === "CARDS"
      ? {
          imageId: mediaFixture[0].id,
          alt: "Fachada da ETMSL",
          title: "Novo card",
          description: "",
          url: "",
        }
      : { label: "Novo link", url: "/etmsl", icon: "NONE" };
  emit("change", {
    ...props.block,
    data: { ...props.block.data, items: [...next, item] },
  } as BuilderBlock);
}
function removeItem(index: number) {
  if (items().length <= 1) return;
  emit("change", {
    ...props.block,
    data: { ...props.block.data, items: items().filter((_, position) => position !== index) },
  } as BuilderBlock);
}
</script>

<template>
  <div class="builder-fields">
    <template v-if="block.type === 'IMAGE_TEXT'">
      <label :for="`${block.id}-text`">Texto</label>
      <textarea
        :id="`${block.id}-text`"
        :value="dataField('text')"
        rows="4"
        @input="change('text', read($event))"
      />
      <label :for="`${block.id}-media`">Mídia de demonstração</label>
      <select
        :id="`${block.id}-media`"
        :value="dataField('imageId')"
        @change="change('imageId', read($event))"
      >
        <option v-for="media in mediaFixture" :key="media.id" :value="media.id">
          {{ media.label }}
        </option>
      </select>
      <label :for="`${block.id}-alt`">Texto alternativo (obrigatório)</label>
      <input
        :id="`${block.id}-alt`"
        :value="dataField('imageAlt')"
        @input="change('imageAlt', read($event))"
      />
      <label :for="`${block.id}-position`">Posição da imagem</label>
      <select
        :id="`${block.id}-position`"
        :value="dataField('imagePosition')"
        @change="change('imagePosition', read($event))"
      >
        <option value="IMAGE_LEFT">Esquerda</option>
        <option value="IMAGE_RIGHT">Direita</option>
      </select>
      <label :for="`${block.id}-buttonLabel`">Texto do botão (opcional)</label>
      <input
        :id="`${block.id}-buttonLabel`"
        :value="dataField('buttonLabel')"
        @input="change('buttonLabel', read($event))"
      />
      <label :for="`${block.id}-buttonUrl`">Caminho interno do botão</label>
      <input
        :id="`${block.id}-buttonUrl`"
        :value="dataField('buttonUrl')"
        placeholder="/etmsl"
        @input="change('buttonUrl', read($event))"
      />
    </template>

    <template v-if="block.type === 'CTA'">
      <label :for="`${block.id}-text`">Texto</label>
      <textarea
        :id="`${block.id}-text`"
        :value="dataField('text')"
        rows="3"
        @input="change('text', read($event))"
      />
      <label :for="`${block.id}-buttonLabel`">Texto do botão</label>
      <input
        :id="`${block.id}-buttonLabel`"
        :value="dataField('buttonLabel')"
        @input="change('buttonLabel', read($event))"
      />
      <label :for="`${block.id}-buttonUrl`">Caminho interno do botão</label>
      <input
        :id="`${block.id}-buttonUrl`"
        :value="dataField('buttonUrl')"
        placeholder="/etmsl"
        @input="change('buttonUrl', read($event))"
      />
    </template>

    <template v-if="block.type === 'CARDS' || block.type === 'QUICK_LINKS'">
      <fieldset v-for="(item, index) in items()" :key="index" class="builder-item-fieldset">
        <legend>{{ block.type === "CARDS" ? "Card" : "Link" }} {{ index + 1 }}</legend>
        <template v-if="block.type === 'CARDS'">
          <label :for="`${block.id}-item-${index}-media`">Mídia de demonstração</label>
          <select
            :id="`${block.id}-item-${index}-media`"
            :value="item.imageId"
            @change="changeItem(index, 'imageId', read($event))"
          >
            <option v-for="media in mediaFixture" :key="media.id" :value="media.id">
              {{ media.label }}
            </option>
          </select>
          <label :for="`${block.id}-item-${index}-alt`">Texto alternativo</label>
          <input
            :id="`${block.id}-item-${index}-alt`"
            :value="item.alt"
            @input="changeItem(index, 'alt', read($event))"
          />
          <label :for="`${block.id}-item-${index}-title`">Título do card</label>
          <input
            :id="`${block.id}-item-${index}-title`"
            :value="item.title"
            @input="changeItem(index, 'title', read($event))"
          />
          <label :for="`${block.id}-item-${index}-description`">Descrição</label>
          <textarea
            :id="`${block.id}-item-${index}-description`"
            :value="item.description"
            rows="2"
            @input="changeItem(index, 'description', read($event))"
          />
        </template>
        <template v-else>
          <label :for="`${block.id}-item-${index}-label`">Rótulo do link</label>
          <input
            :id="`${block.id}-item-${index}-label`"
            :value="item.label"
            @input="changeItem(index, 'label', read($event))"
          />
          <label :for="`${block.id}-item-${index}-icon`">Ícone do sistema</label>
          <select
            :id="`${block.id}-item-${index}-icon`"
            :value="item.icon"
            @change="changeItem(index, 'icon', read($event))"
          >
            <option value="NONE">Sem ícone</option>
            <option value="BOOK">Livro</option>
            <option value="CALENDAR">Calendário</option>
            <option value="ARROW">Seta</option>
          </select>
        </template>
        <label :for="`${block.id}-item-${index}-url`"
          >Caminho interno {{ block.type === "CARDS" ? "(opcional)" : "(obrigatório)" }}</label
        >
        <input
          :id="`${block.id}-item-${index}-url`"
          :value="item.url"
          placeholder="/etmsl"
          @input="changeItem(index, 'url', read($event))"
        />
        <button type="button" :disabled="items().length <= 1" @click="removeItem(index)">
          Remover {{ block.type === "CARDS" ? "card" : "link" }} {{ index + 1 }}
        </button>
      </fieldset>
      <button type="button" :disabled="items().length >= 12" @click="addItem">
        Adicionar {{ block.type === "CARDS" ? "card" : "link" }}
      </button>
      <p class="builder-hint">Até 12 itens nesta demonstração.</p>
    </template>
  </div>
</template>
