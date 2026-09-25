"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  DOCUMENT_V1_LIMITS,
  documentBlockDataSchemaV1,
  type DocumentBlockDataV1,
} from "@fumep/validation";
import { availableLibraryDocuments } from "../available-library-documents";

export interface DocumentBlockEditorProps {
  initialValue: unknown;
  documents?: readonly unknown[];
  onApply: (value: DocumentBlockDataV1) => void | Promise<void>;
  disabled?: boolean;
  ariaLabel?: string;
}

export function DocumentBlockEditor({
  initialValue,
  documents = [],
  onApply,
  disabled = false,
  ariaLabel,
}: DocumentBlockEditorProps) {
  const id = useId();
  const status = useRef<HTMLParagraphElement>(null);
  const applying = useRef(false);
  const [draft, setDraft] = useState(() => {
    const parsed = documentBlockDataSchemaV1.safeParse(initialValue);
    return parsed.success ? parsed.data : undefined;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const available = availableLibraryDocuments(documents);
  if (!draft)
    return (
      <p role="alert">
        O conteúdo inicial DOCUMENT v1 é inválido. Seus dados não foram substituídos.
      </p>
    );
  const selected = available.find((item) => item.id === draft.mediaId);
  const valid = Boolean(selected) && documentBlockDataSchemaV1.safeParse(draft).success;
  const notify = (value: string) => {
    setMessage(value);
    queueMicrotask(() => status.current?.focus());
  };
  const update = (patch: Partial<DocumentBlockDataV1>) => {
    if (disabled || applying.current) return;
    setDraft({ ...draft, ...patch });
    setMessage("");
  };
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || applying.current) return;
    const parsed = documentBlockDataSchemaV1.safeParse(draft);
    if (!valid || !parsed.success) {
      notify("Selecione um PDF pronto e corrija os campos do documento.");
      return;
    }
    applying.current = true;
    setBusy(true);
    try {
      await onApply(structuredClone(parsed.data));
      setDraft(parsed.data);
      notify(
        "Documento aplicado ao bloco em edição. Isso não publica nem salva a página no servidor.",
      );
    } catch {
      notify("Não foi possível aplicar o documento. Suas alterações continuam no editor.");
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="document-block-editor"
      aria-label={ariaLabel ?? "Editor DOCUMENT v1"}
      onSubmit={apply}
    >
      <fieldset disabled={disabled || busy}>
        <legend>Documento PDF</legend>
        <label htmlFor={`${id}-media`}>PDF da Biblioteca de Mídia</label>
        <select
          id={`${id}-media`}
          value={draft.mediaId}
          aria-invalid={!selected}
          onChange={(event) => {
            if (available.some((item) => item.id === event.target.value))
              update({ mediaId: event.target.value });
          }}
        >
          {!selected && (
            <option value={draft.mediaId} disabled>
              PDF atual indisponível nesta seleção
            </option>
          )}
          {available.map((item) => (
            <option key={item.id} value={item.id}>
              {item.originalFilename}
            </option>
          ))}
        </select>
        <label htmlFor={`${id}-title`}>Título (opcional)</label>
        <input
          id={`${id}-title`}
          value={draft.title ?? ""}
          maxLength={DOCUMENT_V1_LIMITS.titleCharacters}
          onChange={(event) => update({ title: event.target.value || undefined })}
        />
        <label htmlFor={`${id}-description`}>Descrição (opcional)</label>
        <textarea
          id={`${id}-description`}
          value={draft.description ?? ""}
          maxLength={DOCUMENT_V1_LIMITS.descriptionCharacters}
          onChange={(event) => update({ description: event.target.value || undefined })}
        />
        <label htmlFor={`${id}-button`}>Texto do botão (opcional)</label>
        <input
          id={`${id}-button`}
          value={draft.buttonLabel ?? ""}
          maxLength={DOCUMENT_V1_LIMITS.buttonLabelCharacters}
          onChange={(event) => update({ buttonLabel: event.target.value || undefined })}
        />
        <p>A seleção não autoriza acesso; o backend deve revalidar o PDF e seus usos.</p>
        {!valid && (
          <p role="alert">Selecione um PDF pronto e corrija os campos antes de aplicar.</p>
        )}
        <button type="submit">
          {busy ? "Aplicando documento…" : "Aplicar documento ao bloco"}
        </button>
      </fieldset>
      <p role="status" ref={status} tabIndex={-1}>
        {message}
      </p>
    </form>
  );
}
