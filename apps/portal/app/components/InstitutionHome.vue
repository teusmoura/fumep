<script setup lang="ts">
import type { Institution } from "~/lib/institutions";
import { institutions } from "~/lib/institutions";

const props = defineProps<{ institution: Institution }>();
type Appearance = "SYSTEM" | "LIGHT" | "DARK";
const appearance = useCookie<Appearance>("fumep_appearance", {
  default: () => "SYSTEM",
  path: "/",
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 365,
});

useHead(() => ({
  title: `Portal ${props.institution.name} — FUMEP`,
  meta: [
    {
      name: "description",
      content: `Portal institucional ${props.institution.name}. Versão de demonstração da migração Nuxt.`,
    },
  ],
}));
</script>

<template>
  <div
    class="institution-shell"
    :data-institution="institution.slug"
    :data-appearance="appearance"
    :style="{ '--brand': institution.brand }"
  >
    <a class="skip-link" href="#main-content">Ir para o conteúdo</a>
    <header class="site-header">
      <div class="header-inner">
        <NuxtLink class="brand" to="/" aria-label="FUMEP — página inicial">FUMEP</NuxtLink>
        <nav aria-label="Instituições">
          <ul class="institution-nav">
            <li v-for="item in institutions" :key="item.slug">
              <NuxtLink
                :to="item.homePath"
                :aria-current="item.slug === institution.slug ? 'page' : undefined"
              >
                {{ item.name }}
              </NuxtLink>
            </li>
          </ul>
        </nav>
        <div class="appearance-control">
          <label for="appearance">Aparência</label>
          <select id="appearance" v-model="appearance">
            <option value="SYSTEM">Sistema</option>
            <option value="LIGHT">Claro</option>
            <option value="DARK">Escuro</option>
          </select>
        </div>
      </div>
    </header>

    <main id="main-content" class="home-main">
      <div class="eyebrow">Portal institucional</div>
      <h1>{{ institution.name }}</h1>
      <p class="full-name">Ambiente digital da instituição</p>
      <p class="intro">Consulte as notícias publicadas e as páginas institucionais disponíveis.</p>
      <p>
        <NuxtLink :to="`/noticias/${institution.slug}`"
          >Ver notícias de {{ institution.name }}</NuxtLink
        >
      </p>
      <p class="demo-notice" role="status">
        Ambiente de migração local; as notícias são persistidas no banco dedicado.
      </p>
    </main>

    <footer class="site-footer">Portal FUMEP · Migração funcional em andamento</footer>
  </div>
</template>
