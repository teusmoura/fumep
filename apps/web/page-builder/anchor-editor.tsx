"use client";
import { useId, useRef, useState } from "react";
export function AnchorEditor({
  initialAnchor,
  position,
  disabled,
  onApply,
}: {
  initialAnchor?: string | null;
  position: number;
  disabled: boolean;
  onApply: (anchor: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialAnchor ?? "");
  const [error, setError] = useState(false);
  const inputId = useId();
  const feedback = useRef<HTMLParagraphElement>(null);
  const applying = useRef(false);
  return (
    <form
      className="block-anchor-editor"
      aria-label={`Anchor do bloco ${position}`}
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (disabled || applying.current) return;
        applying.current = true;
        setError(false);
        try {
          await onApply(value);
        } catch {
          setError(true);
          requestAnimationFrame(() => feedback.current?.focus());
        } finally {
          applying.current = false;
        }
      }}
    >
      <label htmlFor={inputId}>Anchor do bloco {position} (opcional)</label>
      <input
        id={inputId}
        value={value}
        maxLength={100}
        disabled={disabled}
        aria-describedby={`${inputId}-help`}
        aria-invalid={error}
        onChange={(event) => {
          setValue(event.target.value);
          setError(false);
        }}
      />
      <p id={`${inputId}-help`}>
        Use letras minúsculas sem acentos, números e hífens entre palavras, até 100 caracteres. Deve
        ser único nesta página, inclusive entre blocos ocultos. Deixe vazio para remover.
      </p>
      <div className="page-builder-actions">
        <button type="submit" disabled={disabled}>
          Aplicar anchor do bloco {position}
        </button>
      </div>
      {error && (
        <p role="status" tabIndex={-1} ref={feedback}>
          Não foi possível aplicar o anchor. Verifique o formato e a unicidade; se a operação
          falhou, tente novamente. Seu valor foi mantido.
        </p>
      )}
    </form>
  );
}
