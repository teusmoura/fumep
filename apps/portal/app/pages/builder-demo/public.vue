<script setup lang="ts">
import { demoBlocks } from "~/builder/demo";
import BuilderBlocks from "~/builder/BuilderBlocks.vue";
useHead({ title: "Página de exemplo — Portal FUMEP" });
</script>

<template>
  <div class="builder-shell">
    <a class="skip-link" href="#main-content">Ir para o conteúdo</a>
    <header class="builder-header">
      <NuxtLink to="/">FUMEP</NuxtLink
      ><NuxtLink to="/builder-demo">Abrir editor demonstrativo</NuxtLink>
    </header>
    <main id="main-content" class="builder-public">
      <p class="builder-notice">
        Página pública de demonstração com fixtures. Não é conteúdo publicado.
      </p>
      <h1>Página de exemplo</h1>
      <BuilderBlocks :blocks="demoBlocks" />
    </main>
  </div>
</template>
