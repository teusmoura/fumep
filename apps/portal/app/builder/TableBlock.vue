<script setup lang="ts">
import type { BuilderBlock } from "./contracts";
defineProps<{ block: Extract<BuilderBlock, { type: "TABLE" }> }>();
</script>

<template>
  <section
    class="builder-block"
    :id="block.anchor"
    :class="{ 'builder-surface': block.background === 'SURFACE' }"
  >
    <div class="builder-table-scroll">
      <table :aria-label="block.data.caption ? undefined : 'Tabela de dados'">
        <caption v-if="block.data.caption">
          {{
            block.data.caption
          }}
        </caption>
        <thead>
          <tr>
            <th v-for="(header, index) in block.data.headers" :key="index" scope="col">
              {{ header }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in block.data.rows" :key="rowIndex">
            <td v-for="(cell, columnIndex) in row" :key="columnIndex">{{ cell }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
