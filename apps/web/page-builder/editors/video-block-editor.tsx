"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { VIDEO_V1_LIMITS, videoBlockDataSchemaV1, type VideoBlockDataV1 } from "@fumep/validation";

export interface VideoBlockEditorProps {
  initialValue: unknown;
  onApply: (value: VideoBlockDataV1) => void | Promise<void>;
  disabled?: boolean;
  ariaLabel?: string;
}

export function VideoBlockEditor({
  initialValue,
  onApply,
  disabled = false,
  ariaLabel,
}: VideoBlockEditorProps) {
  const id = useId();
  const status = useRef<HTMLParagraphElement>(null);
  const applying = useRef(false);
  const [draft, setDraft] = useState(() => {
    const parsed = videoBlockDataSchemaV1.safeParse(initialValue);
    return parsed.success ? parsed.data : undefined;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!draft)
    return (
      <p role="alert">O conteúdo inicial VIDEO v1 é inválido. Seus dados não foram substituídos.</p>
    );
  const valid = videoBlockDataSchemaV1.safeParse(draft).success;
  const notify = (value: string) => {
    setMessage(value);
    queueMicrotask(() => status.current?.focus());
  };
  const update = (patch: Partial<VideoBlockDataV1>) => {
    if (disabled || applying.current) return;
    setDraft({ ...draft, ...patch });
    setMessage("");
  };
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || applying.current) return;
    const parsed = videoBlockDataSchemaV1.safeParse(draft);
    if (!parsed.success) {
      notify("Informe título e URL HTTPS de vídeo YouTube ou Vimeo válidos.");
      return;
    }
    applying.current = true;
    setBusy(true);
    try {
      await onApply(structuredClone(parsed.data));
      setDraft(parsed.data);
      notify("Vídeo aplicado ao bloco em edição. Isso não publica nem salva a página no servidor.");
    } catch {
      notify("Não foi possível aplicar o vídeo. Suas alterações continuam no editor.");
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="video-block-editor"
      aria-label={ariaLabel ?? "Editor VIDEO v1"}
      onSubmit={apply}
    >
      <fieldset disabled={disabled || busy}>
        <legend>Vídeo externo</legend>
        <label htmlFor={`${id}-title`}>Título</label>
        <input
          id={`${id}-title`}
          value={draft.title}
          maxLength={VIDEO_V1_LIMITS.titleCharacters}
          required
          aria-invalid={!draft.title.trim()}
          onChange={(event) => update({ title: event.target.value })}
        />
        <label htmlFor={`${id}-url`}>URL do YouTube ou Vimeo</label>
        <input
          id={`${id}-url`}
          type="url"
          value={draft.url}
          maxLength={2048}
          required
          aria-invalid={!videoBlockDataSchemaV1.shape.url.safeParse(draft.url).success}
          onChange={(event) => update({ url: event.target.value })}
        />
        <label htmlFor={`${id}-description`}>Descrição (opcional)</label>
        <textarea
          id={`${id}-description`}
          value={draft.description ?? ""}
          maxLength={VIDEO_V1_LIMITS.descriptionCharacters}
          onChange={(event) => update({ description: event.target.value || undefined })}
        />
        <p>Somente URL HTTPS de um vídeo do YouTube ou Vimeo. Não cole código de incorporação.</p>
        {!valid && <p role="alert">Corrija o título, a URL ou a descrição antes de aplicar.</p>}
        <button type="submit">{busy ? "Aplicando vídeo…" : "Aplicar vídeo ao bloco"}</button>
      </fieldset>
      <p role="status" ref={status} tabIndex={-1}>
        {message}
      </p>
    </form>
  );
}
