"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  SPACER_SIZE_VALUES,
  spacerBlockDataSchemaV1,
  type SpacerBlockDataV1,
} from "@fumep/validation";

const sizeLabels: Record<SpacerBlockDataV1["size"], string> = {
  SMALL: "Pequeno",
  MEDIUM: "Médio",
  LARGE: "Grande",
};

export interface SpacerBlockEditorProps {
  initialValue: unknown;
  onApply: (value: SpacerBlockDataV1) => void | Promise<void>;
  disabled?: boolean;
  ariaLabel?: string;
}

export function SpacerBlockEditor({
  initialValue,
  onApply,
  disabled = false,
  ariaLabel,
}: SpacerBlockEditorProps) {
  const id = useId();
  const status = useRef<HTMLParagraphElement>(null);
  const applying = useRef(false);
  const [draft, setDraft] = useState(() => {
    const parsed = spacerBlockDataSchemaV1.safeParse(initialValue);
    return parsed.success ? parsed.data : undefined;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!draft)
    return (
      <p role="alert">
        O conteúdo inicial SPACER v1 é inválido. Seus dados não foram substituídos.
      </p>
    );
  const notify = (value: string) => {
    setMessage(value);
    queueMicrotask(() => status.current?.focus());
  };
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || applying.current) return;
    const parsed = spacerBlockDataSchemaV1.safeParse(draft);
    if (!parsed.success) {
      notify("Escolha um tamanho válido antes de aplicar.");
      return;
    }
    applying.current = true;
    setBusy(true);
    try {
      await onApply(structuredClone(parsed.data));
      setDraft(parsed.data);
      notify(
        "SPACER aplicado ao bloco em edição. Isso não publica nem salva a página no servidor.",
      );
    } catch {
      notify("Não foi possível aplicar SPACER. Sua escolha continua no editor.");
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="spacer-block-editor"
      aria-label={ariaLabel ?? "Editor SPACER v1"}
      onSubmit={apply}
    >
      <fieldset disabled={disabled || busy}>
        <legend>SPACER — espaçamento</legend>
        <label htmlFor={`${id}-size`}>Tamanho do espaço</label>
        <select
          id={`${id}-size`}
          value={draft.size}
          onChange={(event) => {
            if (disabled || applying.current) return;
            const size = event.target.value;
            if (!SPACER_SIZE_VALUES.includes(size as SpacerBlockDataV1["size"])) return;
            setDraft({ size: size as SpacerBlockDataV1["size"] });
            setMessage("");
          }}
        >
          {SPACER_SIZE_VALUES.map((size) => (
            <option key={size} value={size}>
              {sizeLabels[size]}
            </option>
          ))}
        </select>
        <p>A altura é definida pelo Design System para cada tamanho.</p>
        <button type="submit">{busy ? "Aplicando SPACER…" : "Aplicar SPACER ao bloco"}</button>
      </fieldset>
      <p role="status" ref={status} tabIndex={-1}>
        {message}
      </p>
    </form>
  );
}
