<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

type Institution = { id: string; name: string };
type Category = {
  id: string;
  institution_id: string | null;
  name: string;
  slug: string;
  description: string | null;
};
type Gallery = {
  id: string;
  institution_id: string | null;
  title: string;
  description: string | null;
};
type Image = {
  id: string;
  original_filename: string;
  alt_text: string | null;
  processing_status: string;
};
type Item = {
  id: string;
  media_id: string;
  alt_text: string;
  caption: string | null;
  position: number;
};
type Feed = { gallery_id: string; items: Item[] };
type DemoProfile = { id: string; label: string };

useHead({ title: "Categorias e galerias — Portal FUMEP" });
const apiBase = useRuntimeConfig().public.apiBase;
const email = ref("");
const password = ref("");
const csrf = ref("");
const role = ref("");
const busy = ref(false);
const message = ref("");
const demoProfiles = ref<DemoProfile[]>([]);
const institutions = ref<Institution[]>([]);
const categories = ref<Category[]>([]);
const galleries = ref<Gallery[]>([]);
const images = ref<Image[]>([]);
const imageQuery = ref("");
const categoryId = ref("");
const categoryInstitution = ref("");
const categoryName = ref("");
const categorySlug = ref("");
const categoryDescription = ref("");
const galleryId = ref("");
const galleryInstitution = ref("");
const newGalleryTitle = ref("");
const newGalleryDescription = ref("");
const galleryTitle = ref("");
const galleryDescription = ref("");
const items = ref<Item[]>([]);
const feed = ref<Feed | null>(null);
const mediaId = ref("");
const itemId = ref("");
const itemAlt = ref("");
const itemCaption = ref("");
const selectedGallery = computed(() => galleries.value.find((item) => item.id === galleryId.value));
const institutionName = (id: string | null) =>
  id === null
    ? "Global"
    : (institutions.value.find((item) => item.id === id)?.name ?? "Instituição");
const canManageCategory = (item: Category) =>
  role.value === "ADMIN" || item.institution_id !== null;

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
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

function explain(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  if (code.includes("403")) return "Acesso negado para este perfil ou instituição.";
  if (code.includes("409"))
    return "Conflito: registro em uso, slug repetido ou imagem indisponível.";
  if (code.includes("401")) return "Sessão expirada. Entre novamente.";
  return "Não foi possível concluir a operação. Confira os dados e tente novamente.";
}

async function loadCatalogs() {
  [institutions.value, categories.value, galleries.value] = await Promise.all([
    request<Institution[]>("/api/v1/admin/media/institutions"),
    request<Category[]>("/api/v1/admin/categories"),
    request<Gallery[]>("/api/v1/admin/galleries"),
  ]);
  if (role.value === "EDITOR") {
    categoryInstitution.value = institutions.value[0]?.id ?? "";
    galleryInstitution.value = institutions.value[0]?.id ?? "";
  }
  if (galleryId.value && !galleries.value.some((item) => item.id === galleryId.value)) {
    galleryId.value = "";
    items.value = [];
    feed.value = null;
  }
}

async function loadImages() {
  const params = new URLSearchParams({ type: "IMAGE", limit: "100", q: imageQuery.value.trim() });
  const result = await request<Image[]>(`/api/v1/admin/media?${params}`);
  images.value = result.filter((item) => item.processing_status === "READY");
}

async function resume() {
  try {
    const session = await request<{ csrf_token: string; role: string }>("/api/v1/auth/session");
    csrf.value = session.csrf_token;
    role.value = session.role;
  } catch {
    csrf.value = "";
    role.value = "";
    return;
  }
  try {
    await Promise.all([loadCatalogs(), loadImages()]);
  } catch (error) {
    message.value = `Sessão ativa, mas os dados não carregaram. ${explain(error)}`;
  }
}

async function reloadData() {
  await mutate(async () => {
    await Promise.all([loadCatalogs(), loadImages()]);
  }, "Dados editoriais atualizados.");
}

onMounted(async () => {
  try {
    demoProfiles.value = await request<DemoProfile[]>("/api/v1/auth/demo-profiles");
  } catch {
    // Password-free profiles are intentionally unavailable outside the local demo.
  }
  await resume();
});

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
    const session = await request<{ role: string }>("/api/v1/auth/session");
    role.value = session.role;
    categoryId.value = "";
    galleryId.value = "";
    items.value = [];
    feed.value = null;
    await Promise.all([loadCatalogs(), loadImages()]);
    message.value = `Sessão ativa: ${role.value}.`;
  } catch (error) {
    message.value = explain(error);
  } finally {
    password.value = "";
    busy.value = false;
  }
}

async function mutate(action: () => Promise<unknown>, success: string) {
  busy.value = true;
  message.value = "";
  try {
    await action();
    message.value = success;
  } catch (error) {
    message.value = explain(error);
  } finally {
    busy.value = false;
  }
}

function resetCategory() {
  categoryId.value = "";
  categoryName.value = "";
  categorySlug.value = "";
  categoryDescription.value = "";
}

function editCategory(item: Category) {
  categoryId.value = item.id;
  categoryInstitution.value = item.institution_id ?? "";
  categoryName.value = item.name;
  categorySlug.value = item.slug;
  categoryDescription.value = item.description ?? "";
}

async function saveCategory() {
  await mutate(async () => {
    const editing = Boolean(categoryId.value);
    await request<Category>(
      editing ? `/api/v1/admin/categories/${categoryId.value}` : "/api/v1/admin/categories",
      {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          ...(editing ? {} : { institution_id: categoryInstitution.value || null }),
          name: categoryName.value,
          slug: categorySlug.value,
          description: categoryDescription.value || null,
        }),
      },
    );
    resetCategory();
    await loadCatalogs();
  }, "Categoria salva no PostgreSQL.");
}

async function deleteCategory(item: Category) {
  if (!window.confirm(`Excluir a categoria ${item.name}?`)) return;
  await mutate(async () => {
    await request<void>(`/api/v1/admin/categories/${item.id}`, { method: "DELETE" });
    if (categoryId.value === item.id) resetCategory();
    await loadCatalogs();
  }, "Categoria excluída.");
}

function resetGallery() {
  newGalleryTitle.value = "";
  newGalleryDescription.value = "";
  galleryInstitution.value = role.value === "EDITOR" ? (institutions.value[0]?.id ?? "") : "";
}

async function saveGallery() {
  await mutate(async () => {
    await request<Gallery>("/api/v1/admin/galleries", {
      method: "POST",
      body: JSON.stringify({
        institution_id: galleryInstitution.value || null,
        title: newGalleryTitle.value,
        description: newGalleryDescription.value || null,
      }),
    });
    resetGallery();
    await loadCatalogs();
  }, "Galeria criada no PostgreSQL.");
}

async function chooseGallery(item: Gallery) {
  galleryId.value = item.id;
  galleryTitle.value = item.title;
  galleryDescription.value = item.description ?? "";
  itemId.value = "";
  try {
    await refreshGallery();
  } catch (error) {
    message.value = explain(error);
  }
}

async function refreshGallery() {
  if (!galleryId.value) return;
  items.value = await request<Item[]>(`/api/v1/admin/galleries/${galleryId.value}/items`);
  feed.value = await request<Feed>(`/api/v1/admin/galleries/${galleryId.value}/feed`);
}

async function updateGallery() {
  await mutate(async () => {
    await request<Gallery>(`/api/v1/admin/galleries/${galleryId.value}`, {
      method: "PUT",
      body: JSON.stringify({
        title: galleryTitle.value,
        description: galleryDescription.value || null,
      }),
    });
    await loadCatalogs();
    await refreshGallery();
  }, "Galeria atualizada.");
}

async function deleteGallery() {
  if (
    !selectedGallery.value ||
    !window.confirm(`Excluir a galeria ${selectedGallery.value.title} e seus itens?`)
  )
    return;
  await mutate(async () => {
    await request<void>(`/api/v1/admin/galleries/${galleryId.value}`, { method: "DELETE" });
    galleryId.value = "";
    items.value = [];
    feed.value = null;
    resetGallery();
    await loadCatalogs();
  }, "Galeria excluída.");
}

function editItem(item: Item) {
  itemId.value = item.id;
  mediaId.value = item.media_id;
  itemAlt.value = item.alt_text;
  itemCaption.value = item.caption ?? "";
}

function resetItem() {
  itemId.value = "";
  mediaId.value = "";
  itemAlt.value = "";
  itemCaption.value = "";
}

async function saveItem() {
  await mutate(async () => {
    const editing = Boolean(itemId.value);
    await request<Item>(
      editing
        ? `/api/v1/admin/galleries/${galleryId.value}/items/${itemId.value}`
        : `/api/v1/admin/galleries/${galleryId.value}/items`,
      {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          ...(editing ? {} : { media_id: mediaId.value }),
          alt_text: itemAlt.value,
          caption: itemCaption.value || null,
        }),
      },
    );
    resetItem();
    await refreshGallery();
  }, "Item salvo e projeção GALLERY_FEED atualizada.");
}

async function moveItem(index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.value.length) return;
  await mutate(async () => {
    const ids = items.value.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    await request<Item[]>(`/api/v1/admin/galleries/${galleryId.value}/order`, {
      method: "PUT",
      body: JSON.stringify({ item_ids: ids }),
    });
    await refreshGallery();
  }, "Ordem da galeria salva.");
}

async function deleteItem(item: Item) {
  if (!window.confirm("Remover esta imagem da galeria? O arquivo permanecerá na Biblioteca."))
    return;
  await mutate(async () => {
    await request<void>(`/api/v1/admin/galleries/${galleryId.value}/items/${item.id}`, {
      method: "DELETE",
    });
    if (itemId.value === item.id) resetItem();
    await refreshGallery();
  }, "Imagem removida da galeria.");
}
</script>

<template>
  <div class="builder-shell">
    <a class="skip-link" href="#editorial-main">Ir para o conteúdo</a>
    <header class="builder-header">
      <NuxtLink to="/">FUMEP</NuxtLink>
      <span>Categorias e galerias · migração</span>
      <NuxtLink to="/admin/media">Biblioteca de Mídia</NuxtLink>
      <NuxtLink to="/admin/noticias">Notícias</NuxtLink>
    </header>
    <main id="editorial-main" class="builder-layout">
      <section>
        <h1>Categorias editoriais e galerias</h1>
        <p class="builder-notice">
          Jornada local persistida no PostgreSQL dedicado. A prévia GALLERY_FEED é protegida e ainda
          não é publicação pública.
        </p>
        <p v-if="message" role="status">{{ message }}</p>
        <section
          v-if="demoProfiles.length"
          class="builder-card builder-fields"
          aria-labelledby="editorial-demo-title"
        >
          <h2 id="editorial-demo-title">Perfis de demonstração local</h2>
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
          <label for="editorial-email">E-mail</label>
          <input
            id="editorial-email"
            v-model="email"
            type="email"
            required
            autocomplete="username"
          />
          <label for="editorial-password">Senha</label>
          <input
            id="editorial-password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
          />
          <button type="submit" :disabled="busy">Entrar</button>
        </form>
        <template v-else>
          <button type="button" :disabled="busy" @click="reloadData">
            Recarregar dados editoriais
          </button>
          <section class="builder-card builder-fields" aria-labelledby="category-title">
            <h2 id="category-title">Categorias editoriais</h2>
            <form class="builder-fields" @submit.prevent="saveCategory">
              <h3>{{ categoryId ? "Editar categoria" : "Nova categoria" }}</h3>
              <label for="category-institution">Instituição</label>
              <select
                id="category-institution"
                v-model="categoryInstitution"
                :disabled="Boolean(categoryId)"
                :required="role === 'EDITOR'"
              >
                <option v-if="role === 'ADMIN'" value="">Global</option>
                <option v-for="item in institutions" :key="item.id" :value="item.id">
                  {{ item.name }}
                </option>
              </select>
              <label for="category-name">Nome da categoria</label>
              <input id="category-name" v-model="categoryName" required maxlength="120" />
              <label for="category-slug">Slug da categoria</label>
              <input
                id="category-slug"
                v-model="categorySlug"
                required
                maxlength="120"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
              />
              <label for="category-description">Descrição da categoria</label>
              <textarea id="category-description" v-model="categoryDescription" rows="2" />
              <button type="submit" :disabled="busy">
                {{ categoryId ? "Salvar alterações" : "Criar categoria" }}
              </button>
              <button v-if="categoryId" type="button" @click="resetCategory">
                Cancelar edição
              </button>
            </form>
            <h3>Categorias cadastradas</h3>
            <p v-if="!categories.length">Nenhuma categoria cadastrada.</p>
            <ul v-else>
              <li v-for="item in categories" :key="item.id">
                {{ item.name }} · {{ institutionName(item.institution_id) }} · {{ item.slug }}
                <button
                  v-if="canManageCategory(item)"
                  type="button"
                  :disabled="busy"
                  :aria-label="`Editar categoria ${item.name}`"
                  @click="editCategory(item)"
                >
                  Editar
                </button>
                <button
                  v-if="canManageCategory(item)"
                  type="button"
                  :disabled="busy"
                  :aria-label="`Excluir categoria ${item.name}`"
                  @click="deleteCategory(item)"
                >
                  Excluir
                </button>
              </li>
            </ul>
          </section>

          <section class="builder-card builder-fields" aria-labelledby="gallery-title">
            <h2 id="gallery-title">Galerias</h2>
            <form class="builder-fields" @submit.prevent="saveGallery">
              <h3>Nova galeria</h3>
              <label for="gallery-institution">Instituição da galeria</label>
              <select
                id="gallery-institution"
                v-model="galleryInstitution"
                :required="role === 'EDITOR'"
              >
                <option v-if="role === 'ADMIN'" value="">Global</option>
                <option v-for="item in institutions" :key="item.id" :value="item.id">
                  {{ item.name }}
                </option>
              </select>
              <label for="new-gallery-title">Título da galeria</label>
              <input id="new-gallery-title" v-model="newGalleryTitle" required maxlength="180" />
              <label for="new-gallery-description">Descrição da galeria</label>
              <textarea id="new-gallery-description" v-model="newGalleryDescription" rows="2" />
              <button type="submit" :disabled="busy">Criar galeria</button>
            </form>
            <h3>Galerias cadastradas</h3>
            <p v-if="!galleries.length">Nenhuma galeria cadastrada.</p>
            <ul v-else>
              <li v-for="item in galleries" :key="item.id">
                <button
                  type="button"
                  :disabled="busy"
                  :aria-label="`Abrir galeria ${item.title}`"
                  @click="chooseGallery(item)"
                >
                  {{ item.title }}
                </button>
                · {{ institutionName(item.institution_id) }}
              </li>
            </ul>
          </section>

          <section
            v-if="selectedGallery"
            class="builder-card builder-fields"
            aria-labelledby="selected-gallery-title"
          >
            <h2 id="selected-gallery-title">Gerenciar galeria: {{ selectedGallery.title }}</h2>
            <form class="builder-fields" @submit.prevent="updateGallery">
              <label for="edit-gallery-title">Título</label>
              <input id="edit-gallery-title" v-model="galleryTitle" required maxlength="180" />
              <label for="edit-gallery-description">Descrição</label>
              <textarea id="edit-gallery-description" v-model="galleryDescription" rows="2" />
              <button type="submit" :disabled="busy">Salvar galeria</button>
              <button type="button" :disabled="busy" @click="deleteGallery">Excluir galeria</button>
            </form>

            <h3>Imagens da Biblioteca</h3>
            <p>
              Apenas imagens READY e acessíveis ao perfil aparecem para seleção.
              <NuxtLink to="/admin/media">Enviar nova imagem</NuxtLink>.
            </p>
            <label for="image-query">Buscar imagem por nome</label>
            <input id="image-query" v-model="imageQuery" />
            <button type="button" :disabled="busy" @click="loadImages">Buscar imagens</button>
            <form class="builder-fields" @submit.prevent="saveItem">
              <h3>{{ itemId ? "Editar item" : "Adicionar item" }}</h3>
              <label for="gallery-image">Imagem</label>
              <select
                id="gallery-image"
                v-model="mediaId"
                :disabled="Boolean(itemId)"
                :required="!itemId"
              >
                <option value="" disabled>Escolha uma imagem READY</option>
                <option v-for="image in images" :key="image.id" :value="image.id">
                  {{ image.original_filename }}
                </option>
              </select>
              <label for="item-alt">Texto alternativo</label>
              <input id="item-alt" v-model="itemAlt" required />
              <label for="item-caption">Legenda</label>
              <input id="item-caption" v-model="itemCaption" />
              <button type="submit" :disabled="busy || (!itemId && !mediaId)">
                {{ itemId ? "Salvar item" : "Adicionar imagem" }}
              </button>
              <button v-if="itemId" type="button" @click="resetItem">Cancelar edição</button>
            </form>
            <h3>Ordem dos itens</h3>
            <p v-if="!items.length">Galeria ainda sem imagens.</p>
            <ol v-else>
              <li v-for="(item, index) in items" :key="item.id">
                {{ item.alt_text }} <span v-if="item.caption">· {{ item.caption }}</span>
                <button
                  type="button"
                  :disabled="busy || index === 0"
                  :aria-label="`Mover ${item.alt_text} para cima`"
                  @click="moveItem(index, -1)"
                >
                  Subir
                </button>
                <button
                  type="button"
                  :disabled="busy || index === items.length - 1"
                  :aria-label="`Mover ${item.alt_text} para baixo`"
                  @click="moveItem(index, 1)"
                >
                  Descer
                </button>
                <button
                  type="button"
                  :disabled="busy"
                  :aria-label="`Editar item ${item.alt_text}`"
                  @click="editItem(item)"
                >
                  Editar
                </button>
                <button
                  type="button"
                  :disabled="busy"
                  :aria-label="`Remover item ${item.alt_text}`"
                  @click="deleteItem(item)"
                >
                  Remover
                </button>
              </li>
            </ol>
            <h3>Prévia GALLERY_FEED</h3>
            <p>Prévia autenticada; não publicada no site.</p>
            <button type="button" :disabled="busy" @click="refreshGallery">Atualizar prévia</button>
            <p v-if="feed && !feed.items.length">A projeção está vazia.</p>
            <ol v-else-if="feed">
              <li v-for="item in feed.items" :key="item.id">
                <img
                  class="media-preview"
                  :src="`${apiBase}/api/v1/admin/media/${item.media_id}/content`"
                  :alt="item.alt_text"
                />
                <p>{{ item.caption || item.alt_text }}</p>
              </li>
            </ol>
          </section>
        </template>
      </section>
    </main>
  </div>
</template>
