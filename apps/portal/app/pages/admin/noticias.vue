<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { newTextBlock, type TextBlock } from "~/lib/migration-pages";

type Institution = { id: string; name: string; slug: string };
type Category = { id: string; name: string; institution_id: string | null };
type Image = { id: string; original_filename: string; processing_status: string };
type Article = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  institution_ids: string[];
  category_id: string;
  cover_image_id: string | null;
  cover_image_alt: string | null;
  blocks: TextBlock[];
  status: string;
  version_number: number;
};
type DemoProfile = { id: string; label: string };

useHead({ title: "Notícias — Portal FUMEP" });
const apiBase = useRuntimeConfig().public.apiBase;
const route = useRoute();
const router = useRouter();
const email = ref("");
const password = ref("");
const csrf = ref("");
const role = ref("");
const busy = ref(false);
const message = ref("");
const demoProfiles = ref<DemoProfile[]>([]);
const institutions = ref<Institution[]>([]);
const categories = ref<Category[]>([]);
const images = ref<Image[]>([]);
const articles = ref<Article[]>([]);
const article = ref<Article | null>(null);
const title = ref("");
const slug = ref("");
const summary = ref("");
const institutionIds = ref<string[]>([]);
const categoryId = ref("");
const coverImageId = ref("");
const coverImageAlt = ref("");
const blocks = ref<TextBlock[]>([newTextBlock(0, "Conteúdo", "Escreva aqui a notícia.")]);
const availableCategories = computed(() =>
  categories.value.filter(
    (item) =>
      item.institution_id === null ||
      (institutionIds.value.length === 1 && item.institution_id === institutionIds.value[0]),
  ),
);
const publicPaths = computed(
  () =>
    article.value?.institution_ids
      .map((id) => {
        const institution = institutions.value.find((item) => item.id === id);
        return institution
          ? {
              label: institution.name,
              path: `/noticias/${institution.slug}/${article.value!.slug}`,
            }
          : null;
      })
      .filter((item) => item !== null) ?? [],
);

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (csrf.value && init.method && init.method !== "GET") headers.set("X-CSRF-Token", csrf.value);
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    let detail = `API ${response.status}`;
    try {
      detail = (await response.json()).detail || detail;
    } catch {
      /* unavailable response */
    }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

function fill(item: Article) {
  article.value = item;
  title.value = item.title;
  slug.value = item.slug;
  summary.value = item.summary ?? "";
  institutionIds.value = [...item.institution_ids];
  categoryId.value = item.category_id;
  coverImageId.value = item.cover_image_id ?? "";
  coverImageAlt.value = item.cover_image_alt ?? "";
  blocks.value = item.blocks.length ? structuredClone(item.blocks) : [newTextBlock(0)];
}

async function loadData() {
  [institutions.value, categories.value, images.value, articles.value] = await Promise.all([
    request<Institution[]>("/api/v1/admin/media/institutions"),
    request<Category[]>("/api/v1/admin/categories"),
    request<Image[]>("/api/v1/admin/media?type=IMAGE&limit=100"),
    request<Article[]>("/api/v1/admin/articles"),
  ]);
  images.value = images.value.filter((item) => item.processing_status === "READY");
  if (typeof route.query.id === "string") {
    fill(await request<Article>(`/api/v1/admin/articles/${route.query.id}`));
  }
}

onMounted(async () => {
  try {
    demoProfiles.value = await request<DemoProfile[]>("/api/v1/auth/demo-profiles");
  } catch {
    /* disabled */
  }
  try {
    const session = await request<{ csrf_token: string; role: string }>(
      "/api/v1/admin/session",
    ).catch(() => request<{ csrf_token: string; role: string }>("/api/v1/admin/session"));
    csrf.value = session.csrf_token;
    role.value = session.role;
  } catch {
    csrf.value = "";
    return;
  }
  try {
    await loadData();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "Não foi possível carregar os dados.";
  }
});

async function reloadData() {
  busy.value = true;
  message.value = "";
  try {
    await loadData();
  } catch (error) {
    message.value = error instanceof Error ? error.message : "Não foi possível carregar os dados.";
  } finally {
    busy.value = false;
  }
}

async function enter(profile?: string) {
  busy.value = true;
  message.value = "";
  try {
    const result = await request<{ csrf_token: string }>(
      profile ? "/api/v1/auth/demo-login" : "/api/v1/auth/login",
      {
        method: "POST",
        body: JSON.stringify(
          profile ? { profile } : { email: email.value, password: password.value },
        ),
      },
    );
    csrf.value = result.csrf_token;
    role.value = (await request<{ role: string }>("/api/v1/auth/session")).role;
    await loadData();
    message.value = `Sessão ativa: ${role.value}.`;
  } catch (error) {
    message.value = error instanceof Error ? error.message : "Não foi possível entrar.";
  } finally {
    password.value = "";
    busy.value = false;
  }
}

function newArticle() {
  article.value = null;
  title.value = "";
  slug.value = "";
  summary.value = "";
  institutionIds.value = [];
  categoryId.value = "";
  coverImageId.value = "";
  coverImageAlt.value = "";
  blocks.value = [newTextBlock(0)];
  void router.replace({ query: {} });
}

async function edit(id: string) {
  busy.value = true;
  try {
    fill(await request<Article>(`/api/v1/admin/articles/${id}`));
    await router.replace({ query: { id } });
  } catch (error) {
    message.value = error instanceof Error ? error.message : "Erro ao carregar notícia.";
  } finally {
    busy.value = false;
  }
}

function payload() {
  return {
    title: title.value,
    slug: slug.value,
    summary: summary.value || null,
    institution_ids: institutionIds.value,
    category_id: categoryId.value,
    cover_image_id: coverImageId.value || null,
    cover_image_alt: coverImageAlt.value || null,
    blocks: blocks.value.map((block, position) => ({ ...block, position })),
  };
}

async function save(): Promise<boolean> {
  busy.value = true;
  message.value = "";
  try {
    const saved = await request<Article>(
      article.value ? `/api/v1/admin/articles/${article.value.id}` : "/api/v1/admin/articles",
      { method: article.value ? "PUT" : "POST", body: JSON.stringify(payload()) },
    );
    fill(saved);
    articles.value = await request<Article[]>("/api/v1/admin/articles");
    await router.replace({ query: { id: saved.id } });
    message.value = "Rascunho salvo no PostgreSQL.";
    return true;
  } catch (error) {
    message.value = error instanceof Error ? error.message : "Não foi possível salvar.";
    return false;
  } finally {
    busy.value = false;
  }
}

async function publish() {
  if (!article.value || article.value.status !== "DRAFT") return;
  busy.value = true;
  message.value = "";
  try {
    fill(
      await request<Article>(`/api/v1/admin/articles/${article.value.id}/publish`, {
        method: "POST",
      }),
    );
    articles.value = await request<Article[]>("/api/v1/admin/articles");
    message.value = "Notícia publicada. Abra o link público abaixo.";
  } catch (error) {
    message.value = error instanceof Error ? error.message : "Publicação recusada.";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="builder-shell">
    <a class="skip-link" href="#news-main">Ir para o conteúdo</a>
    <header class="builder-header">
      <NuxtLink to="/">FUMEP</NuxtLink><span>Notícias · banco de migração</span>
      <NuxtLink to="/admin/media">Biblioteca de Mídia</NuxtLink>
      <NuxtLink to="/admin/editorial">Categorias</NuxtLink>
    </header>
    <main id="news-main" class="builder-layout">
      <section>
        <h1>Notícias</h1>
        <p class="builder-notice">
          Jornada local: rascunho, capa READY e publicação em página pública.
        </p>
        <p v-if="message" role="status">{{ message }}</p>
        <section
          v-if="demoProfiles.length"
          class="builder-card builder-fields"
          aria-label="Perfis de demonstração local"
        >
          <h2>Entrar com perfil de demonstração</h2>
          <button
            v-for="profile in demoProfiles"
            :key="profile.id"
            type="button"
            :disabled="busy"
            @click="enter(profile.id)"
          >
            Entrar como {{ profile.label }}
          </button>
          <p v-if="csrf">Perfil ativo: {{ role }}</p>
        </section>
        <form v-if="!csrf" class="builder-card builder-fields" @submit.prevent="enter()">
          <h2>Entrar</h2>
          <label for="news-email">E-mail</label
          ><input id="news-email" v-model="email" type="email" required autocomplete="username" />
          <label for="news-password">Senha</label
          ><input
            id="news-password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
          />
          <button type="submit" :disabled="busy">Entrar</button>
        </form>
        <template v-else>
          <button type="button" :disabled="busy" @click="reloadData">Recarregar notícias</button>
          <section class="builder-card builder-fields" aria-label="Notícias cadastradas">
            <h2>Notícias cadastradas</h2>
            <button type="button" :disabled="busy" @click="newArticle">Nova notícia</button>
            <p v-if="!articles.length">Nenhuma notícia cadastrada.</p>
            <ul v-else>
              <li v-for="item in articles" :key="item.id">
                <button type="button" :disabled="busy" @click="edit(item.id)">
                  {{ item.title }}
                </button>
                · {{ item.status }}
              </li>
            </ul>
          </section>
          <form class="builder-card builder-fields" @submit.prevent="save">
            <h2>{{ article ? "Editar notícia" : "Nova notícia" }}</h2>
            <label for="news-title">Título</label
            ><input
              id="news-title"
              v-model="title"
              required
              maxlength="255"
              :disabled="article?.status === 'PUBLISHED'"
            />
            <label for="news-slug">Endereço (slug)</label
            ><input
              id="news-slug"
              v-model="slug"
              required
              maxlength="220"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              :disabled="article?.status === 'PUBLISHED'"
            />
            <label for="news-summary">Resumo</label
            ><textarea
              id="news-summary"
              v-model="summary"
              maxlength="2000"
              rows="3"
              :disabled="article?.status === 'PUBLISHED'"
            />
            <fieldset>
              <legend>Instituições</legend>
              <label v-for="item in institutions" :key="item.id">
                <input
                  v-model="institutionIds"
                  type="checkbox"
                  :value="item.id"
                  :disabled="article?.status === 'PUBLISHED'"
                />
                {{ item.name }}
              </label>
            </fieldset>
            <label for="news-category">Categoria editorial</label>
            <select
              id="news-category"
              v-model="categoryId"
              required
              :disabled="article?.status === 'PUBLISHED'"
            >
              <option value="" disabled>Escolha uma categoria</option>
              <option v-for="item in availableCategories" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select>
            <p>
              Se faltar uma categoria,
              <NuxtLink to="/admin/editorial">crie no catálogo editorial</NuxtLink>.
            </p>
            <label for="news-cover">Imagem de capa READY</label>
            <select
              id="news-cover"
              v-model="coverImageId"
              :disabled="article?.status === 'PUBLISHED'"
            >
              <option value="">Sem capa no rascunho</option>
              <option v-for="item in images" :key="item.id" :value="item.id">
                {{ item.original_filename }}
              </option>
            </select>
            <p>Se faltar uma imagem, <NuxtLink to="/admin/media">envie na Biblioteca</NuxtLink>.</p>
            <label for="news-cover-alt">Texto alternativo da capa</label
            ><input
              id="news-cover-alt"
              v-model="coverImageAlt"
              maxlength="500"
              :disabled="article?.status === 'PUBLISHED'"
            />
            <fieldset>
              <legend>Corpo da notícia</legend>
              <div v-for="(block, index) in blocks" :key="block.id" class="builder-fields">
                <label :for="`news-block-title-${index}`">Título do bloco {{ index + 1 }}</label>
                <input
                  :id="`news-block-title-${index}`"
                  v-model="block.data.title"
                  required
                  :disabled="article?.status === 'PUBLISHED'"
                />
                <label :for="`news-block-body-${index}`">Texto do bloco {{ index + 1 }}</label>
                <textarea
                  :id="`news-block-body-${index}`"
                  v-model="block.data.body"
                  rows="6"
                  required
                  :disabled="article?.status === 'PUBLISHED'"
                />
              </div>
            </fieldset>
            <button
              v-if="article?.status !== 'PUBLISHED'"
              type="button"
              :disabled="busy"
              @click="blocks.push(newTextBlock(blocks.length))"
            >
              Adicionar bloco de texto
            </button>
            <button
              v-if="article?.status !== 'PUBLISHED'"
              type="submit"
              :disabled="busy || !institutionIds.length || !categoryId"
            >
              Salvar rascunho
            </button>
          </form>
          <section v-if="article" class="builder-card builder-fields" aria-label="Publicação">
            <h2>Publicação</h2>
            <p>Estado: {{ article.status }} · versão {{ article.version_number }}</p>
            <button
              v-if="article.status === 'DRAFT'"
              type="button"
              :disabled="busy || !article.cover_image_id || !article.cover_image_alt"
              @click="publish"
            >
              Publicar notícia salva
            </button>
            <p v-if="article.status === 'DRAFT'">
              Salve as alterações antes de publicar. A publicação exige capa, texto alternativo e
              conteúdo.
            </p>
            <ul v-if="article.status === 'PUBLISHED'">
              <li v-for="path in publicPaths" :key="path.path">
                <NuxtLink :to="path.path">Abrir notícia em {{ path.label }}</NuxtLink>
              </li>
            </ul>
          </section>
        </template>
      </section>
    </main>
  </div>
</template>
