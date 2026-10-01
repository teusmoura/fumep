<script setup lang="ts">
import type { BuilderBlock } from "./contracts";

type StructuredBlock = Extract<BuilderBlock, { type: "FAQ" | "TABS" | "TABLE" }>;
const props = defineProps<{ block: StructuredBlock }>();
const emit = defineEmits<{ change: [block: BuilderBlock] }>();
const read = (event: Event) => (event.target as HTMLInputElement).value;
function updateData(data: StructuredBlock["data"]) {
  emit("change", { ...props.block, data } as BuilderBlock);
}
function entries(): Record<string, string>[] {
  if (props.block.type === "FAQ") return props.block.data.items;
  if (props.block.type === "TABS") return props.block.data.tabs;
  return [];
}
function changeEntry(index: number, field: string, value: string) {
  const next = entries().map((item, position) =>
    position === index ? { ...item, [field]: value } : item,
  );
  if (props.block.type === "FAQ")
    updateData({ ...props.block.data, items: next as { question: string; answer: string }[] });
  if (props.block.type === "TABS")
    updateData({ ...props.block.data, tabs: next as { label: string; content: string }[] });
}
function addEntry() {
  const next = entries();
  if (props.block.type === "FAQ" && next.length < 30)
    updateData({
      ...props.block.data,
      items: [...props.block.data.items, { question: "Nova pergunta", answer: "Resposta" }],
    });
  if (props.block.type === "TABS" && next.length < 8)
    updateData({
      ...props.block.data,
      tabs: [...props.block.data.tabs, { label: "Nova aba", content: "Conteúdo" }],
    });
}
function removeEntry(index: number) {
  if (entries().length <= 1) return;
  if (props.block.type === "FAQ")
    updateData({
      ...props.block.data,
      items: props.block.data.items.filter((_, position) => position !== index),
    });
  if (props.block.type === "TABS")
    updateData({
      ...props.block.data,
      tabs: props.block.data.tabs.filter((_, position) => position !== index),
    });
}
function tableData() {
  return props.block.type === "TABLE" ? props.block.data : null;
}
function changeCaption(value: string) {
  const data = tableData();
  if (data) updateData({ ...data, caption: value });
}
function changeHeader(index: number, value: string) {
  const data = tableData();
  if (data)
    updateData({
      ...data,
      headers: data.headers.map((header, position) => (position === index ? value : header)),
    });
}
function addColumn() {
  const data = tableData();
  if (data && data.headers.length < 12)
    updateData({
      ...data,
      headers: [...data.headers, `Coluna ${data.headers.length + 1}`],
      rows: data.rows.map((row) => [...row, ""]),
    });
}
function removeColumn(index: number) {
  const data = tableData();
  if (data && data.headers.length > 1)
    updateData({
      ...data,
      headers: data.headers.filter((_, position) => position !== index),
      rows: data.rows.map((row) => row.filter((_, position) => position !== index)),
    });
}
function changeCell(rowIndex: number, columnIndex: number, value: string) {
  const data = tableData();
  if (data)
    updateData({
      ...data,
      rows: data.rows.map((row, position) =>
        position === rowIndex
          ? row.map((cell, column) => (column === columnIndex ? value : cell))
          : row,
      ),
    });
}
function addRow() {
  const data = tableData();
  if (data && data.rows.length < 50)
    updateData({ ...data, rows: [...data.rows, data.headers.map(() => "")] });
}
function removeRow(index: number) {
  const data = tableData();
  if (data && data.rows.length > 1)
    updateData({ ...data, rows: data.rows.filter((_, position) => position !== index) });
}
</script>

<template>
  <div class="builder-fields">
    <template v-if="block.type === 'FAQ' || block.type === 'TABS'">
      <fieldset v-for="(item, index) in entries()" :key="index" class="builder-item-fieldset">
        <legend>{{ block.type === "FAQ" ? "Pergunta" : "Aba" }} {{ index + 1 }}</legend>
        <label :for="`${block.id}-entry-${index}-label`">{{
          block.type === "FAQ" ? "Pergunta" : "Rótulo da aba"
        }}</label>
        <input
          :id="`${block.id}-entry-${index}-label`"
          :value="block.type === 'FAQ' ? item.question : item.label"
          @input="changeEntry(index, block.type === 'FAQ' ? 'question' : 'label', read($event))"
        />
        <label :for="`${block.id}-entry-${index}-body`">{{
          block.type === "FAQ" ? "Resposta" : "Conteúdo textual"
        }}</label>
        <textarea
          :id="`${block.id}-entry-${index}-body`"
          :value="block.type === 'FAQ' ? item.answer : item.content"
          rows="3"
          @input="changeEntry(index, block.type === 'FAQ' ? 'answer' : 'content', read($event))"
        />
        <button type="button" :disabled="entries().length <= 1" @click="removeEntry(index)">
          Remover {{ block.type === "FAQ" ? "pergunta" : "aba" }} {{ index + 1 }}
        </button>
      </fieldset>
      <button
        type="button"
        :disabled="entries().length >= (block.type === 'FAQ' ? 30 : 8)"
        @click="addEntry"
      >
        Adicionar {{ block.type === "FAQ" ? "pergunta" : "aba" }}
      </button>
      <p class="builder-hint">Limite: {{ block.type === "FAQ" ? 30 : 8 }} itens.</p>
    </template>

    <template v-if="block.type === 'TABLE'">
      <label :for="`${block.id}-caption`">Legenda da tabela</label>
      <input
        :id="`${block.id}-caption`"
        :value="tableData()?.caption"
        @input="changeCaption(read($event))"
      />
      <fieldset class="builder-item-fieldset">
        <legend>Cabeçalhos</legend>
        <div v-for="(header, index) in tableData()?.headers" :key="index">
          <label :for="`${block.id}-header-${index}`">Coluna {{ index + 1 }}</label>
          <input
            :id="`${block.id}-header-${index}`"
            :value="header"
            @input="changeHeader(index, read($event))"
          />
          <button
            type="button"
            :disabled="tableData()!.headers.length <= 1"
            @click="removeColumn(index)"
          >
            Remover coluna {{ index + 1 }}
          </button>
        </div>
        <button type="button" :disabled="tableData()!.headers.length >= 12" @click="addColumn">
          Adicionar coluna
        </button>
      </fieldset>
      <fieldset
        v-for="(row, rowIndex) in tableData()?.rows"
        :key="rowIndex"
        class="builder-item-fieldset"
      >
        <legend>Linha {{ rowIndex + 1 }}</legend>
        <div v-for="(cell, columnIndex) in row" :key="columnIndex">
          <label :for="`${block.id}-cell-${rowIndex}-${columnIndex}`">{{
            tableData()?.headers[columnIndex]
          }}</label>
          <input
            :id="`${block.id}-cell-${rowIndex}-${columnIndex}`"
            :value="cell"
            @input="changeCell(rowIndex, columnIndex, read($event))"
          />
        </div>
        <button
          type="button"
          :disabled="tableData()!.rows.length <= 1"
          @click="removeRow(rowIndex)"
        >
          Remover linha {{ rowIndex + 1 }}
        </button>
      </fieldset>
      <button type="button" :disabled="tableData()!.rows.length >= 50" @click="addRow">
        Adicionar linha
      </button>
    </template>
  </div>
</template>
