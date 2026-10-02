<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
import { feedCategoryFixture, feedInstitutionFixture, galleryFixture } from "./contracts";
type FeedBlock = Extract<
  BuilderBlock,
  {
    type:
      | "NEWS_FEED"
      | "EVENT_FEED"
      | "COURSE_FEED"
      | "CONTEST_FEED"
      | "SELECTION_PROCESS_FEED"
      | "GALLERY_FEED"
      | "SPACER";
  }
>;
const props = defineProps<{ block: FeedBlock }>();
const emit = defineEmits<{ change: [block: BuilderBlock] }>();
const read = (event: Event) => (event.target as HTMLInputElement).value;
const data = () => props.block.data as unknown as Record<string, unknown>;
function change(field: string, value: unknown) {
  emit("change", { ...props.block, data: { ...props.block.data, [field]: value } } as BuilderBlock);
}
function toggle(field: "institutionIds" | "categoryIds", id: string, checked: boolean) {
  const current = (data()[field] as string[]) ?? [];
  change(field, checked ? [...current, id] : current.filter((item) => item !== id));
}
function checked(event: Event) {
  return (event.target as HTMLInputElement).checked;
}
</script>

<template>
  <div class="builder-fields">
    <template v-if="block.type === 'SPACER'">
      <label :for="`${block.id}-size`">Tamanho predefinido</label>
      <select
        :id="`${block.id}-size`"
        :value="block.data.size"
        @change="change('size', read($event))"
      >
        <option value="SMALL">Pequeno</option>
        <option value="MEDIUM">Médio</option>
        <option value="LARGE">Grande</option>
      </select>
    </template>
    <template v-else>
      <p class="builder-hint">
        Este feed usa apenas conteúdo de demonstração; a configuração não consulta dados reais.
      </p>
      <label :for="`${block.id}-title`">Título (opcional)</label>
      <input
        :id="`${block.id}-title`"
        :value="data().title"
        @input="change('title', read($event))"
      />
      <label :for="`${block.id}-limit`">Limite (1 a 12)</label>
      <input
        :id="`${block.id}-limit`"
        type="number"
        min="1"
        max="12"
        step="1"
        :value="data().limit"
        @input="change('limit', read($event) === '' ? NaN : Number(read($event)))"
      />
      <template v-if="block.type === 'GALLERY_FEED'">
        <label :for="`${block.id}-gallery`">Galeria de demonstração</label>
        <select
          :id="`${block.id}-gallery`"
          :value="block.data.galleryId"
          @change="change('galleryId', read($event))"
        >
          <option :value="galleryFixture.id">{{ galleryFixture.label }}</option>
        </select>
      </template>
      <template v-else>
        <fieldset class="builder-item-fieldset">
          <legend>Instituições (nenhuma = todas)</legend>
          <label
            v-for="institution in feedInstitutionFixture"
            :key="institution.id"
            class="builder-check"
          >
            <input
              type="checkbox"
              :checked="(data().institutionIds as string[]).includes(institution.id)"
              @change="toggle('institutionIds', institution.id, checked($event))"
            />{{ institution.label }}
          </label>
        </fieldset>
        <fieldset
          v-if="block.type === 'NEWS_FEED' || block.type === 'EVENT_FEED'"
          class="builder-item-fieldset"
        >
          <legend>Categorias (nenhuma = todas)</legend>
          <label v-for="category in feedCategoryFixture" :key="category.id" class="builder-check">
            <input
              type="checkbox"
              :checked="(data().categoryIds as string[]).includes(category.id)"
              @change="toggle('categoryIds', category.id, checked($event))"
            />{{ category.label }}
          </label>
        </fieldset>
        <template v-if="block.type === 'CONTEST_FEED' || block.type === 'SELECTION_PROCESS_FEED'">
          <label :for="`${block.id}-status`">Estado</label>
          <select
            :id="`${block.id}-status`"
            :value="data().status"
            @change="change('status', read($event))"
          >
            <option value="ALL">Todos</option>
            <option value="OPEN">Abertos</option>
            <option value="CLOSED">Encerrados</option>
          </select>
        </template>
      </template>
    </template>
  </div>
</template>
