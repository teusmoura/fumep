"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { mediaCategoryResponseSchema, type MediaCategoryContext } from "@fumep/validation";
type Category = MediaCategoryContext["categories"][number];
export function MediaCategoryManager({
  categories: initial,
  institutions,
  isAdmin,
  csrfToken,
}: MediaCategoryContext & { isAdmin: boolean; csrfToken: string }) {
  const [categories, setCategories] = useState(initial);
  const [editing, setEditing] = useState<Category>();
  const [deleting, setDeleting] = useState<Category>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const deleteTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (deleting && !busy) confirmRef.current?.focus();
  }, [deleting, busy]);
  const institutionName = (id: string | null) =>
    institutions.find((item) => item.id === id)?.name ?? "Global";
  async function mutate(method: "POST" | "PATCH" | "DELETE", id?: string, body?: unknown) {
    setBusy(true);
    setMessage("Salvando categoria...");
    try {
      const response = await fetch(`/admin/media/categories${id ? `/${id}` : ""}`, {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        setMessage(
          response.status === 409
            ? "Conflito: slug já usado ou categoria referenciada por mídia. Nada foi alterado."
            : "Não foi possível salvar. Verifique os campos e seu acesso; tente novamente.",
        );
        return;
      }
      if (method === "DELETE") setCategories((rows) => rows.filter((row) => row.id !== id));
      else {
        const row = mediaCategoryResponseSchema.parse(await response.json());
        setCategories((rows) => [...rows.filter((item) => item.id !== row.id), row]);
      }
      setEditing(undefined);
      setDeleting(undefined);
      setMessage(method === "DELETE" ? "Categoria excluída." : "Categoria salva.");
      // Remounting the keyed form clears stale fields; restore focus after commit.
      requestAnimationFrame(() => nameRef.current?.focus());
    } catch {
      setMessage("Não foi possível salvar a categoria. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const body = {
      name: values.get("name"),
      slug: values.get("slug"),
      ...(!editing ? { institutionId: values.get("institutionId") || null } : {}),
    };
    await mutate(editing ? "PATCH" : "POST", editing?.id, body);
  }
  return (
    <section className="media-category-manager" aria-label="Gestão de categorias" aria-busy={busy}>
      <h2>{editing ? "Editar categoria" : "Criar categoria"}</h2>
      <form
        key={editing?.id ?? `new-${categories.length}`}
        className="media-upload-form"
        onSubmit={submit}
      >
        <label htmlFor="category-name">Nome</label>
        <input
          ref={nameRef}
          id="category-name"
          name="name"
          maxLength={120}
          required
          defaultValue={editing?.name ?? ""}
          disabled={busy}
        />
        <label htmlFor="category-slug">Slug</label>
        <input
          id="category-slug"
          name="slug"
          maxLength={120}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
          defaultValue={editing?.slug ?? ""}
          disabled={busy}
          aria-describedby="category-help"
        />
        <p id="category-help">
          Use letras minúsculas, números e hífens. A instituição não pode ser alterada.
        </p>
        {editing ? (
          <p>Instituição: {institutionName(editing.institutionId)}</p>
        ) : (
          <>
            <label htmlFor="category-institution">Instituição</label>
            <select
              id="category-institution"
              name="institutionId"
              required={!isAdmin}
              defaultValue=""
              disabled={busy}
            >
              <option value="">{isAdmin ? "Global" : "Selecione uma instituição"}</option>
              {institutions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </>
        )}
        <button type="submit" disabled={busy || (!editing && !isAdmin && !institutions.length)}>
          Salvar categoria
        </button>
        {editing && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setEditing(undefined);
              nameRef.current?.focus();
            }}
          >
            Cancelar edição
          </button>
        )}
      </form>
      <h2>Categorias disponíveis</h2>
      {!categories.length && <p>Nenhuma categoria disponível.</p>}
      <ul>
        {categories.map((row) => (
          <li key={row.id}>
            {row.name} — {row.slug} — {institutionName(row.institutionId)}
            <button
              type="button"
              disabled={busy}
              aria-label={`Editar ${row.name}`}
              onClick={() => {
                setEditing(row);
                setDeleting(undefined);
                requestAnimationFrame(() => nameRef.current?.focus());
              }}
            >
              Editar
            </button>
            <button
              type="button"
              disabled={busy}
              aria-label={`Excluir ${row.name}`}
              onClick={(event) => {
                deleteTrigger.current = event.currentTarget;
                setDeleting(row);
              }}
            >
              Excluir
            </button>
          </li>
        ))}
      </ul>
      {deleting && (
        <section aria-label="Confirmar exclusão">
          <p>
            Excluir {deleting.name}? Categorias referenciadas por mídia não podem ser excluídas.
          </p>
          <button
            ref={confirmRef}
            type="button"
            disabled={busy}
            onClick={() => mutate("DELETE", deleting.id)}
          >
            Confirmar exclusão
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setDeleting(undefined);
              deleteTrigger.current?.focus();
            }}
          >
            Cancelar exclusão
          </button>
        </section>
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
