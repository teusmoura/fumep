<script setup lang="ts">
import { onMounted, ref } from "vue";
import RealTextBlocks from "~/components/RealTextBlocks.vue";
import type { PageDraft } from "~/lib/migration-pages";

useHead({ title: "Prévia de página — Portal FUMEP" });
const route = useRoute();
const apiBase = useRuntimeConfig().public.apiBase;
const draft = ref<PageDraft | null>(null);
const error = ref("");
onMounted(async () => {
  try {
    const response = await fetch(`${apiBase}/api/v1/admin/pages/${route.params.id}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Unavailable");
    const saved = (await response.json()) as PageDraft;
    if (saved.blocks.some((block) => block.type !== "TEXT")) throw new Error("Unsupported block");
    draft.value = saved;
  } catch {
    error.value = "Prévia indisponível. Entre no painel e salve um rascunho autorizado.";
  }
});
</script>

<template>
  <div class="builder-shell">
    <a class="skip-link" href="#main-content">Ir para o conteúdo</a>
    <header class="builder-header">
      <NuxtLink to="/admin/pages">Voltar ao editor</NuxtLink
      ><span>Prévia protegida · sem cache</span>
    </header>
    <main id="main-content" class="builder-public">
      <p v-if="error" role="alert">{{ error }}</p>
      <template v-else-if="draft"
        ><h1>{{ draft.title }}</h1>
        <RealTextBlocks :blocks="draft.blocks"
      /></template>
      <p v-else role="status">Carregando prévia...</p>
    </main>
  </div>
</template>
