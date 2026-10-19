<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import RealTextBlocks from "~/components/RealTextBlocks.vue";
import {
  newGalleryBlock,
  newTextBlock,
  normalizeTextBlocks,
  type InstitutionChoice,
  type PageDraft,
  type PageTemplateChoice,
} from "~/lib/migration-pages";

useHead({ title: "Páginas — Portal FUMEP" });
const apiBase = useRuntimeConfig().public.apiBase;
const route = useRoute();
const router = useRouter();
const email = ref("");
const password = ref("");
const csrf = ref("");
const busy = ref(false);
const message = ref("");
const institutions = ref<InstitutionChoice[]>([]);
const templates = ref<PageTemplateChoice[]>([]);
const galleries = ref<Array<{ id: string; title: string; institution_id: string | null }>>([]);
const galleryId = ref("");
const institutionId = ref("");
const templateId = ref("");
const title = ref("Nova página");
const slug = ref("nova-pagina");
const templateName = ref("Modelo de texto");
const templateTitle = ref("Título inicial");
const templateBody = ref("Escreva aqui o conteúdo.");
const draft = ref<PageDraft | null>(null);
const published = ref(false);

const choices = computed(() =>
  templates.value.filter(
    (item) =>
      item.is_active &&
      (item.institution_id === null || item.institution_id === institutionId.value) &&
      item.blocks_snapshot.length > 0 &&
      item.blocks_snapshot.every((block) => block.type === "TEXT"),
  ),
);
watch(institutionId, () => {
  templateId.value = choices.value[0]?.id ?? "";
});
const institution = computed(() =>
  institutions.value.find(
    (item) => item.id === (draft.value?.institution_id ?? institutionId.value),
  ),
);
const publicPath = computed(() =>
  draft.value && institution.value ? `/paginas/${institution.value.slug}/${draft.value.slug}` : "",
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
  if (!response.ok)
    throw new Error(
      `API ${response.status}: ${response.status === 401 ? "sessão necessária" : "verifique os dados e tente novamente"}`,
    );
  return response.json() as Promise<T>;
}

async function loadChoices() {
  [institutions.value, templates.value, galleries.value] = await Promise.all([
    request<InstitutionChoice[]>("/api/v1/admin/page-institutions"),
    request<PageTemplateChoice[]>("/api/v1/admin/page-templates"),
    request<Array<{ id: string; title: string; institution_id: string | null }>>(
      "/api/v1/admin/galleries",
    ),
  ]);
  institutionId.value ||= institutions.value[0]?.id ?? "";
  templateId.value = choices.value[0]?.id ?? "";
}

async function resume() {
  try {
    const session = await request<{ csrf_token: string; role: string }>("/api/v1/admin/session");
    csrf.value = session.csrf_token;
  } catch {
    csrf.value = "";
    return;
  }
  try {
    await loadChoices();
    if (typeof route.query.id === "string") {
      const saved = await request<PageDraft>(`/api/v1/admin/pages/${route.query.id}`);
      if (saved.blocks.some((block) => !["TEXT", "GALLERY_FEED"].includes(block.type)))
        throw new Error("Unsupported block");
      draft.value = saved;
    }
  } catch {
    message.value = "Não foi possível carregar os dados de página desta sessão.";
  }
}
onMounted(resume);

async function login() {
  busy.value = true;
  message.value = "";
  try {
    const result = await request<{ csrf_token: string }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.value, password: password.value }),
    });
    csrf.value = result.csrf_token;
    await loadChoices();
    message.value = "Sessão iniciada.";
  } catch {
    message.value = "Não foi possível entrar. Confira credenciais e configuração da API.";
  } finally {
    password.value = "";
    busy.value = false;
  }
}

async function createTemplate() {
  busy.value = true;
  message.value = "";
  try {
    const template = await request<PageTemplateChoice>("/api/v1/admin/page-templates", {
      method: "POST",
      body: JSON.stringify({
        institution_id: institutionId.value,
        name: templateName.value,
        blocks_snapshot: [newTextBlock(0, templateTitle.value, templateBody.value)],
      }),
    });
    await loadChoices();
    templateId.value = template.id;
    message.value = "Modelo salvo no banco de migração.";
  } catch {
    message.value = "Não foi possível criar o modelo.";
  } finally {
    busy.value = false;
  }
}

async function applyTemplate() {
  busy.value = true;
  message.value = "";
  try {
    draft.value = await request<PageDraft>(
      `/api/v1/admin/page-templates/${templateId.value}/apply`,
      {
        method: "POST",
        body: JSON.stringify({
          institution_id: institutionId.value,
          title: title.value,
          slug: slug.value,
        }),
      },
    );
    await router.replace({ query: { id: draft.value.id } });
    message.value = "Rascunho criado no PostgreSQL.";
  } catch {
    message.value = "Não foi possível aplicar o modelo. Verifique o título e o slug.";
  } finally {
    busy.value = false;
  }
}

function addBlock() {
  if (draft.value) draft.value.blocks.push(newTextBlock(draft.value.blocks.length));
}
function addGalleryBlock() {
  if (draft.value && galleryId.value)
    draft.value.blocks.push(newGalleryBlock(draft.value.blocks.length, galleryId.value));
}
function removeBlock(index: number) {
  if (draft.value)
    draft.value.blocks = normalizeTextBlocks(draft.value.blocks.filter((_, i) => i !== index));
}

async function save() {
  if (!draft.value) return;
  busy.value = true;
  message.value = "";
  try {
    draft.value = await request<PageDraft>(`/api/v1/admin/pages/${draft.value.id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: draft.value.title,
        slug: draft.value.slug,
        blocks: draft.value.blocks,
      }),
    });
    message.value = "Rascunho salvo no PostgreSQL.";
  } catch {
    message.value = "Não foi possível salvar. Cada bloco precisa de título e texto.";
  } finally {
    busy.value = false;
  }
}

async function publish() {
  if (!draft.value) return;
  busy.value = true;
  message.value = "";
  try {
    await save();
    if (message.value !== "Rascunho salvo no PostgreSQL.") return;
    await request(`/api/v1/admin/pages/${draft.value.id}/publish`, { method: "POST" });
    published.value = true;
    message.value = "Publicação experimental concluída. A página pública não usa cache nem busca.";
  } catch {
    message.value = "Publicação recusada; revise o rascunho.";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="builder-shell">
    <a class="skip-link" href="#main-content">Ir para o conteúdo</a>
    <header class="builder-header">
      <NuxtLink to="/">FUMEP</NuxtLink><span>Primeira jornada de página · banco de migração</span>
    </header>
    <main id="main-content" class="builder-layout">
      <section>
        <h1>Páginas</h1>
        <p class="builder-notice">
          Experimento local: publica blocos de texto e galerias no banco dedicado de migração.
        </p>
        <p v-if="message" role="status">{{ message }}</p>
        <form v-if="!csrf" class="builder-card builder-fields" @submit.prevent="login">
          <h2>Entrar como administrador</h2>
          <label for="login-email">E-mail</label
          ><input id="login-email" v-model="email" type="email" required autocomplete="username" />
          <label for="login-password">Senha</label
          ><input
            id="login-password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
          />
          <button type="submit" :disabled="busy">Entrar</button>
        </form>
        <template v-else-if="!draft">
          <section class="builder-card builder-fields" aria-labelledby="start-heading">
            <h2 id="start-heading">Criar uma página</h2>
            <label for="page-institution">Instituição</label>
            <select id="page-institution" v-model="institutionId">
              <option v-for="item in institutions" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select>
            <label for="page-template">Modelo de texto</label>
            <select id="page-template" v-model="templateId">
              <option v-for="item in choices" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select>
            <label for="page-title">Título da página</label
            ><input id="page-title" v-model="title" required />
            <label for="page-slug">Endereço (slug)</label
            ><input id="page-slug" v-model="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
            <button
              type="button"
              :disabled="busy || !templateId || !institutionId"
              @click="applyTemplate"
            >
              Aplicar modelo e criar rascunho
            </button>
          </section>
          <section class="builder-card builder-fields" aria-labelledby="new-template-heading">
            <h2 id="new-template-heading">Criar modelo de texto</h2>
            <label for="template-name">Nome do modelo</label
            ><input id="template-name" v-model="templateName" />
            <label for="template-title">Título inicial do bloco</label
            ><input id="template-title" v-model="templateTitle" />
            <label for="template-body">Texto inicial</label
            ><textarea id="template-body" v-model="templateBody" rows="4" />
            <button type="button" :disabled="busy || !institutionId" @click="createTemplate">
              Salvar modelo
            </button>
          </section>
        </template>
        <section v-else class="builder-card builder-fields" aria-labelledby="edit-heading">
          <h2 id="edit-heading">Editar rascunho</h2>
          <label for="draft-title">Título da página</label
          ><input id="draft-title" v-model="draft.title" />
          <label for="draft-slug">Endereço (slug)</label
          ><input id="draft-slug" v-model="draft.slug" />
          <div
            v-for="(block, index) in draft.blocks"
            :key="block.id"
            class="builder-card builder-fields"
          >
            <h3>Bloco {{ index + 1 }} · {{ block.type }}</h3>
            <label :for="`block-title-${index}`">Título do bloco</label
            ><input :id="`block-title-${index}`" v-model="block.data.title" />
            <template v-if="block.type === 'TEXT'">
              <label :for="`block-body-${index}`">Texto do bloco</label
              ><textarea :id="`block-body-${index}`" v-model="block.data.body" rows="5" />
            </template>
            <template v-else-if="block.type === 'GALLERY_FEED'">
              <label :for="`block-gallery-${index}`">Galeria do bloco</label>
              <select :id="`block-gallery-${index}`" v-model="block.data.galleryId">
                <option
                  v-for="item in galleries.filter(
                    (gallery) =>
                      gallery.institution_id === null ||
                      gallery.institution_id === draft?.institution_id,
                  )"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.title }}
                </option>
              </select>
              <label :for="`block-limit-${index}`">Limite de imagens</label>
              <input
                :id="`block-limit-${index}`"
                v-model.number="block.data.limit"
                type="number"
                min="1"
                max="20"
              />
            </template>
            <button type="button" @click="removeBlock(index)">Remover bloco {{ index + 1 }}</button>
          </div>
          <button type="button" @click="addBlock">Adicionar bloco de texto</button>
          <label for="new-gallery-block">Galeria para o novo bloco</label>
          <select id="new-gallery-block" v-model="galleryId">
            <option value="">Selecione uma galeria</option>
            <option
              v-for="item in galleries.filter(
                (gallery) =>
                  gallery.institution_id === null ||
                  gallery.institution_id === draft?.institution_id,
              )"
              :key="item.id"
              :value="item.id"
            >
              {{ item.title }}
            </option>
          </select>
          <button type="button" :disabled="!galleryId" @click="addGalleryBlock">
            Adicionar bloco de galeria
          </button>
          <button type="button" :disabled="busy || published" @click="save">Salvar rascunho</button>
          <NuxtLink :to="`/admin/pages/${draft.id}/preview`">Abrir prévia salva</NuxtLink>
          <button
            type="button"
            :disabled="busy || published || !draft.blocks.length"
            @click="publish"
          >
            Salvar e publicar
          </button>
          <NuxtLink v-if="published && publicPath" :to="publicPath">Abrir página pública</NuxtLink>
        </section>
      </section>
      <section v-if="draft" class="builder-preview" aria-labelledby="live-preview-heading">
        <h2 id="live-preview-heading">Prévia local antes de salvar</h2>
        <RealTextBlocks :blocks="draft.blocks" />
      </section>
    </main>
  </div>
</template>
