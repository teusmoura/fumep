"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  CTA_V1_LIMITS,
  ctaBlockDataSchemaV1,
  textLinkUrlSchemaV1,
  type CtaBlockDataV1,
} from "@fumep/validation";

export interface CtaBlockEditorProps {
  initialValue: unknown;
  onApply: (value: CtaBlockDataV1) => void | Promise<void>;
  disabled?: boolean;
  ariaLabel?: string;
}

export function CtaBlockEditor({
  initialValue,
  onApply,
  disabled = false,
  ariaLabel,
}: CtaBlockEditorProps) {
  const id = useId();
  const status = useRef<HTMLParagraphElement>(null);
  const applying = useRef(false);
  const [draft, setDraft] = useState(() => {
    const parsed = ctaBlockDataSchemaV1.safeParse(initialValue);
    return parsed.success ? parsed.data : undefined;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!draft)
    return (
      <p role="alert">O conteúdo inicial CTA v1 é inválido. Seus dados não foram substituídos.</p>
    );
  const valid = ctaBlockDataSchemaV1.safeParse(draft).success;
  const notify = (value: string) => {
    setMessage(value);
    queueMicrotask(() => status.current?.focus());
  };
  const edit = (patch: Partial<CtaBlockDataV1>) => {
    if (disabled || applying.current) return;
    setDraft({ ...draft, ...patch });
    setMessage("");
  };
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || applying.current) return;
    const parsed = ctaBlockDataSchemaV1.safeParse(draft);
    if (!parsed.success) {
      notify("Corrija título, rótulo e URL segura antes de aplicar.");
      return;
    }
    applying.current = true;
    setBusy(true);
    try {
      await onApply(structuredClone(parsed.data));
      setDraft(parsed.data);
      notify("CTA aplicado ao bloco em edição. Isso não publica nem salva a página no servidor.");
    } catch {
      notify("Não foi possível aplicar CTA. Suas alterações continuam no editor.");
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="cta-block-editor" aria-label={ariaLabel ?? "Editor CTA v1"} onSubmit={apply}>
      <fieldset disabled={disabled || busy}>
        <legend>CTA — chamada para ação</legend>
        <label htmlFor={`${id}-title`}>Título obrigatório</label>
        <input
          id={`${id}-title`}
          value={draft.title}
          maxLength={CTA_V1_LIMITS.titleCharacters}
          aria-invalid={!draft.title.trim()}
          onChange={(event) => edit({ title: event.target.value })}
        />
        <label htmlFor={`${id}-text`}>Texto opcional</label>
        <textarea
          id={`${id}-text`}
          value={draft.text ?? ""}
          maxLength={CTA_V1_LIMITS.textCharacters}
          onChange={(event) => edit({ text: event.target.value || undefined })}
        />
        <label htmlFor={`${id}-label`}>Texto do botão obrigatório</label>
        <input
          id={`${id}-label`}
          value={draft.buttonLabel}
          maxLength={CTA_V1_LIMITS.buttonLabelCharacters}
          aria-invalid={!draft.buttonLabel.trim()}
          onChange={(event) => edit({ buttonLabel: event.target.value })}
        />
        <label htmlFor={`${id}-url`}>URL do botão</label>
        <input
          id={`${id}-url`}
          value={draft.buttonUrl}
          maxLength={2048}
          aria-invalid={!textLinkUrlSchemaV1.safeParse(draft.buttonUrl).success}
          aria-describedby={`${id}-url-help`}
          onChange={(event) => edit({ buttonUrl: event.target.value })}
        />
        <p id={`${id}-url-help`}>
          Use HTTP(S), caminho do portal ou anchor, sem scripts ou credenciais.
        </p>
        {!valid && <p role="alert">Informe título, texto do botão e URL segura.</p>}
        <button type="submit">{busy ? "Aplicando CTA…" : "Aplicar CTA ao bloco"}</button>
      </fieldset>
      <p role="status" ref={status} tabIndex={-1}>
        {message}
      </p>
    </form>
  );
}
