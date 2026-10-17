<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

type Institution = { id: string; name: string };
type Category = { id: string; institution_id: string | null; name: string; slug: string };
type Media = {
  id: string;
  type: "IMAGE" | "DOCUMENT";
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  alt_text: string | null;
  is_decorative: boolean;
  category_id: string | null;
  processing_status: string;
  created_at: string;
};
type Variant = { format: "WEBP" | "AVIF"; width: number; height: number; size_bytes: number };
type DemoProfile = { id: string; label: string };

useHead({ title: "Biblioteca de Mídia — Portal FUMEP" });
const apiBase = useRuntimeConfig().public.apiBase;
const email = ref("");
const password = ref("");
const csrf = ref("");
const role = ref("");
const demoProfiles = ref<DemoProfile[]>([]);
const busy = ref(false);
const message = ref("");
const institutions = ref<Institution[]>([]);
const categories = ref<Category[]>([]);
const media = ref<Media[]>([]);
const institutionId = ref("");
const categoryName = ref("");
const categorySlug = ref("");
const categoryId = ref("");
const file = ref<File | null>(null);
const altText = ref("");
const query = ref("");
const typeFilter = ref("");
const offset = ref(0);
const selected = ref<Media | null>(null);
const retryId = ref("");
const variants = ref<Variant[]>([]);
const pageSize = 24;
const hasNext = computed(() => media.value.length === pageSize);
const previewUrl = computed(() => {
  if (!selected.value || selected.value.processing_status !== "READY") return "";
  const item = selected.value;
  const variant =
    item.type === "IMAGE" ? variants.value.find((row) => row.format === "WEBP") : null;
  const path = `/api/v1/admin/media/${item.id}/content`;
  return `${apiBase}${path}${variant ? `?format=${variant.format}&width=${variant.width}` : ""}`;
});

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (csrf.value && init.method && init.method !== "GET") headers.set("X-CSRF-Token", csrf.value);
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json() as Promise<T>;
}

async function load() {
  const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset.value) });
  if (query.value.trim()) params.set("q", query.value.trim());
  if (typeFilter.value) params.set("type", typeFilter.value);
  [institutions.value, categories.value, media.value] = await Promise.all([
    request<Institution[]>("/api/v1/admin/media/institutions"),
    request<Category[]>("/api/v1/admin/media/categories"),
    request<Media[]>(`/api/v1/admin/media?${params}`),
  ]);
  institutionId.value ||= institutions.value[0]?.id ?? "";
}

async function chooseMedia(item: Media) {
  selected.value = item;
  variants.value = [];
  if (item.type === "IMAGE" && item.processing_status === "READY") {
    try {
      variants.value = await request<Variant[]>(`/api/v1/admin/media/${item.id}/variants`);
    } catch {
      message.value = "Não foi possível carregar as variantes da imagem.";
    }
  }
}

onMounted(async () => {
  try {
    demoProfiles.value = await request<DemoProfile[]>("/api/v1/auth/demo-profiles");
  } catch {
    // Production and ordinary development do not expose password-free demo login.
  }
  try {
    const session = await request<{ csrf_token: string; role: string }>("/api/v1/auth/session");
    csrf.value = session.csrf_token;
    role.value = session.role;
    await load();
  } catch {
    csrf.value = "";
    role.value = "";
  }
});

async function demoLogin(profile: string) {
  busy.value = true;
  message.value = "";
  try {
    const result = await request<{ csrf_token: string }>("/api/v1/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    });
    csrf.value = result.csrf_token;
    role.value = profile === "admin" ? "ADMIN" : "EDITOR";
    institutionId.value = "";
    categoryId.value = "";
    selected.value = null;
    variants.value = [];
    offset.value = 0;
    await load();
    message.value = `Perfil de demonstração ativo: ${demoProfiles.value.find((item) => item.id === profile)?.label ?? profile}.`;
  } catch {
    message.value = "Não foi possível ativar o perfil de demonstração local.";
  } finally {
    busy.value = false;
  }
}

async function login() {
  busy.value = true;
  message.value = "";
  try {
    const result = await request<{ csrf_token: string }>("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value, password: password.value }),
    });
    csrf.value = result.csrf_token;
    const session = await request<{ role: string }>("/api/v1/auth/session");
    role.value = session.role;
    await load();
  } catch {
    message.value = "Não foi possível entrar. Confira credenciais e disponibilidade da API.";
  } finally {
    password.value = "";
    busy.value = false;
  }
}

async function createCategory() {
  busy.value = true;
  message.value = "";
  try {
    const created = await request<Category>("/api/v1/admin/media/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institution_id: institutionId.value || null,
        name: categoryName.value,
        slug: categorySlug.value,
      }),
    });
    categoryId.value = created.id;
    categoryName.value = "";
    categorySlug.value = "";
    await load();
    message.value = "Categoria salva.";
  } catch {
    message.value = "Não foi possível criar a categoria. Confira o nome e o slug.";
  } finally {
    busy.value = false;
  }
}

function chooseFile(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null;
}

async function upload() {
  if (!file.value) return;
  busy.value = true;
  message.value = "";
  try {
    const body = new FormData();
    body.append("file", file.value);
    if (categoryId.value) body.append("category_id", categoryId.value);
    if (altText.value.trim()) body.append("alt_text", altText.value.trim());
    const created = await request<Media>("/api/v1/admin/media", { method: "POST", body });
    offset.value = 0;
    await load();
    await chooseMedia(created);
    message.value =
      created.type === "IMAGE"
        ? "Imagem recebida; processamento pendente. Atualize a listagem para acompanhar."
        : "PDF salvo na biblioteca.";
    file.value = null;
    altText.value = "";
  } catch {
    message.value = "Upload recusado. Verifique o arquivo, o tipo e a categoria.";
  } finally {
    busy.value = false;
  }
}

async function search(nextOffset = 0) {
  offset.value = nextOffset;
  try {
    await load();
    const fresh = media.value.find((item) => item.id === selected.value?.id);
    if (fresh) await chooseMedia(fresh);
  } catch {
    message.value = "Não foi possível carregar a biblioteca.";
  }
}

async function deleteSelected() {
  const item = selected.value;
  if (!item || !window.confirm(`Excluir ${item.original_filename} da biblioteca?`)) return;
  busy.value = true;
  message.value = "";
  try {
    await request<{ media_id: string; status: "REQUESTED" }>(`/api/v1/admin/media/${item.id}`, {
      method: "DELETE",
    });
    selected.value = null;
    variants.value = [];
    await load();
    message.value = "Exclusão solicitada. O arquivo foi ocultado e será removido pelo Worker.";
  } catch {
    message.value = "Não foi possível excluir. O arquivo pode estar em uso ou em processamento.";
  } finally {
    busy.value = false;
  }
}

async function retryDeletion() {
  busy.value = true;
  message.value = "";
  try {
    await request<{ media_id: string; status: "REQUESTED" }>(
      `/api/v1/admin/media/${retryId.value}/deletion/retry`,
      { method: "POST" },
    );
    retryId.value = "";
    message.value = "Nova tentativa de exclusão solicitada ao Worker.";
  } catch {
    message.value =
      "Não foi possível tentar novamente. Confirme o ID, o estado FAILED e o acesso ADMIN.";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="builder-shell">
    <a class="skip-link" href="#media-main">Ir para o conteúdo</a>
    <header class="builder-header">
      <NuxtLink to="/">FUMEP</NuxtLink><span>Biblioteca de Mídia · migração</span>
    </header>
    <main id="media-main" class="builder-layout">
      <section>
        <h1>Biblioteca de Mídia</h1>
        <p class="builder-notice">
          Arquivos enviados ao armazenamento privado e registrados no PostgreSQL.
        </p>
        <p v-if="message" role="status">{{ message }}</p>
        <section
          v-if="demoProfiles.length"
          class="builder-card builder-fields"
          aria-labelledby="demo-login-title"
        >
          <h2 id="demo-login-title">Acesso de demonstração local</h2>
          <p>
            Escolha um perfil para testar as permissões reais. Disponível somente no banco local de
            demonstração.
          </p>
          <button
            v-for="profile in demoProfiles"
            :key="profile.id"
            type="button"
            :disabled="busy"
            @click="demoLogin(profile.id)"
          >
            Entrar como {{ profile.label }}
          </button>
          <p v-if="csrf">Perfil ativo: {{ role }}</p>
        </section>
        <form v-if="!csrf" class="builder-card builder-fields" @submit.prevent="login">
          <h2>Entrar</h2>
          <label for="media-email">E-mail</label
          ><input id="media-email" v-model="email" type="email" autocomplete="username" required />
          <label for="media-password">Senha</label
          ><input
            id="media-password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
          />
          <button type="submit" :disabled="busy">Entrar</button>
        </form>
        <template v-else>
          <form class="builder-card builder-fields" @submit.prevent="createCategory">
            <h2>Nova categoria</h2>
            <label for="media-institution">Instituição</label>
            <select id="media-institution" v-model="institutionId" required>
              <option
                v-for="institution in institutions"
                :key="institution.id"
                :value="institution.id"
              >
                {{ institution.name }}
              </option>
            </select>
            <label for="media-category-name">Nome</label
            ><input id="media-category-name" v-model="categoryName" required />
            <label for="media-category-slug">Slug</label
            ><input
              id="media-category-slug"
              v-model="categorySlug"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              required
            />
            <button type="submit" :disabled="busy || !institutionId">Criar categoria</button>
          </form>
          <form class="builder-card builder-fields" @submit.prevent="upload">
            <h2>Enviar arquivo</h2>
            <label for="media-file">Imagem JPEG, PNG, WebP, AVIF ou PDF</label>
            <input
              id="media-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
              required
              @change="chooseFile"
            />
            <label for="media-category">Categoria</label>
            <select id="media-category" v-model="categoryId" required>
              <option value="" disabled>Escolha uma categoria</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
            <label for="media-alt">Texto alternativo padrão para imagens</label
            ><input id="media-alt" v-model="altText" maxlength="1000" />
            <button type="submit" :disabled="busy || !file || !categoryId">Enviar</button>
          </form>
          <section class="builder-card builder-fields" aria-labelledby="library-title">
            <h2 id="library-title">Arquivos</h2>
            <label for="media-search">Buscar por nome ou descrição</label
            ><input id="media-search" v-model="query" />
            <label for="media-type">Tipo</label>
            <select id="media-type" v-model="typeFilter">
              <option value="">Todos</option>
              <option value="IMAGE">Imagens</option>
              <option value="DOCUMENT">PDFs</option>
            </select>
            <button type="button" @click="search()">Buscar</button>
            <p v-if="!media.length">Nenhum arquivo nesta página.</p>
            <ul v-else>
              <li v-for="item in media" :key="item.id">
                <button type="button" @click="chooseMedia(item)">
                  {{ item.original_filename }}
                </button>
                — {{ item.type === "IMAGE" ? "Imagem" : "PDF" }} · {{ item.processing_status }}
              </li>
            </ul>
            <div>
              <button
                type="button"
                :disabled="offset === 0"
                @click="search(Math.max(0, offset - pageSize))"
              >
                Anterior
              </button>
              <button type="button" :disabled="!hasNext" @click="search(offset + pageSize)">
                Próxima
              </button>
            </div>
          </section>
          <section v-if="selected" class="builder-card" aria-labelledby="selected-title">
            <h2 id="selected-title">Arquivo selecionado</h2>
            <p>{{ selected.original_filename }} · {{ selected.processing_status }}</p>
            <p v-if="selected.processing_status !== 'READY'">
              A prévia ficará disponível após o processamento. Use Buscar para atualizar o estado.
            </p>
            <template v-else>
              <img
                v-if="selected.type === 'IMAGE'"
                class="media-preview"
                :src="previewUrl"
                :alt="selected.is_decorative ? '' : selected.alt_text || selected.original_filename"
              />
              <iframe
                v-else
                class="media-document-preview"
                :src="previewUrl"
                :title="`Prévia do PDF ${selected.original_filename}`"
              />
              <p v-if="variants.length">Variantes disponíveis:</p>
              <ul v-if="variants.length">
                <li v-for="variant in variants" :key="`${variant.format}-${variant.width}`">
                  {{ variant.format }} · {{ variant.width }} × {{ variant.height }}
                </li>
              </ul>
            </template>
            <p>
              Identificador para reutilização: <code>{{ selected.id }}</code>
            </p>
            <button
              type="button"
              :disabled="busy || selected.processing_status === 'PROCESSING'"
              @click="deleteSelected"
            >
              Excluir arquivo
            </button>
          </section>
          <form
            v-if="role === 'ADMIN'"
            class="builder-card builder-fields"
            @submit.prevent="retryDeletion"
          >
            <h2>Recuperar exclusão falha — ADMIN</h2>
            <p>
              Se uma exclusão falhar, um administrador pode iniciar outro ciclo pelo identificador
              do arquivo.
            </p>
            <label for="media-retry-id">Identificador do arquivo (UUID)</label>
            <input
              id="media-retry-id"
              v-model="retryId"
              required
              maxlength="36"
              pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
            />
            <button type="submit" :disabled="busy">Tentar exclusão novamente</button>
          </form>
        </template>
      </section>
    </main>
  </div>
</template>

<style scoped>
.media-preview {
  display: block;
  max-width: 100%;
  max-height: 28rem;
  object-fit: contain;
}

.media-document-preview {
  display: block;
  width: 100%;
  min-height: 28rem;
  border: 0;
}
</style>
