"use client";
import { useRef, useState, type FormEvent } from "react";
import {
  institutionLogoConfigurationSchema,
  type InstitutionLogoSelection,
  type MediaLibraryResponse,
} from "@fumep/validation";

export function InstitutionLogoEditor({
  institutions,
  items,
  csrfToken,
}: {
  institutions: InstitutionLogoSelection[];
  items: MediaLibraryResponse["items"];
  csrfToken: string;
}) {
  const [owners, setOwners] = useState(institutions);
  const [ownerId, setOwnerId] = useState(institutions[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const status = useRef<HTMLParagraphElement>(null);
  const owner = owners.find((row) => row.id === ownerId);
  const images = items.filter(
    (row) =>
      row.type === "IMAGE" &&
      row.processingStatus === "READY" &&
      ["image/png", "image/jpeg", "image/webp", "image/avif"].includes(row.mimeType),
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!owner || busy) return;
    const data = new FormData(event.currentTarget);
    const input = institutionLogoConfigurationSchema.safeParse({
      logoLightId: data.get("logoLightId") || null,
      logoDarkId: data.get("logoDarkId") || null,
    });
    if (!input.success) {
      setMessage("Seleção de logo inválida.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/admin/institutions/${owner.id}/logos`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(input.data),
      });
      if (!response.ok) {
        setMessage(
          response.status === 400
            ? "Escolha uma imagem pronta e disponível na biblioteca."
            : response.status === 403
              ? "Sua sessão não permite configurar logos."
              : "Não foi possível salvar os logos. Atualize a biblioteca antes de tentar novamente.",
        );
        return;
      }
      const result = await response.json();
      if (
        result.id !== owner.id ||
        !institutionLogoConfigurationSchema.safeParse({
          logoLightId: result.logoLightId,
          logoDarkId: result.logoDarkId,
        }).success
      )
        throw new Error("Invalid configuration response");
      setOwners((previous) =>
        previous.map((row) =>
          row.id === owner.id
            ? { ...row, logoLightId: result.logoLightId, logoDarkId: result.logoDarkId }
            : row,
        ),
      );
      setMessage(
        "Logos salvos sem duplicar arquivos. O logo claro é usado quando não há logo escuro.",
      );
    } catch {
      setMessage(
        "Não foi possível confirmar o salvamento. Atualize a biblioteca antes de tentar novamente.",
      );
    } finally {
      setBusy(false);
      queueMicrotask(() => status.current?.focus());
    }
  }
  if (!owner) return null;
  return (
    <section aria-labelledby="institution-logos-title" className="media-category-manager">
      <h2 id="institution-logos-title">Logos institucionais</h2>
      <p>
        Selecione imagens prontas dos resultados desta página da biblioteca. Use os filtros para
        encontrar outros arquivos; nenhum arquivo será copiado.
      </p>
      <label htmlFor="logo-institution">Instituição</label>
      <select
        id="logo-institution"
        value={ownerId}
        disabled={busy}
        onChange={(event) => {
          setOwnerId(event.target.value);
          setMessage("");
        }}
      >
        {owners.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
          </option>
        ))}
      </select>
      <form
        key={`${owner.id}/${owner.logoLightId}/${owner.logoDarkId}`}
        onSubmit={submit}
        className="media-upload-form"
      >
        <fieldset disabled={busy}>
          <legend>Imagens de {owner.name}</legend>
          {(["logoLightId", "logoDarkId"] as const).map((field) => (
            <div key={field}>
              <label htmlFor={field}>
                {field === "logoLightId" ? "Logo claro" : "Logo escuro"}
              </label>
              <select id={field} name={field} defaultValue={owner[field] ?? ""}>
                <option value="">
                  {field === "logoLightId" ? "Sem logo claro" : "Usar logo claro (fallback)"}
                </option>
                {owner[field] && !images.some((row) => row.id === owner[field]) && (
                  <option value={owner[field] ?? ""}>Manter logo atual — {owner[field]}</option>
                )}
                {images.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.originalFilename} — {row.categoryName ?? "Sem categoria"} — {row.id}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button type="submit">{busy ? "Salvando logos…" : "Salvar logos"}</button>
        </fieldset>
      </form>
      <p role="status" tabIndex={-1} ref={status}>
        {message}
      </p>
    </section>
  );
}
