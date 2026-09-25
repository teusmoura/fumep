"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { MAP_V1_LIMITS, mapBlockDataSchemaV1, type MapBlockDataV1 } from "@fumep/validation";

export interface MapBlockEditorProps {
  initialValue: unknown;
  onApply: (value: MapBlockDataV1) => void | Promise<void>;
  disabled?: boolean;
  ariaLabel?: string;
}

export function MapBlockEditor({
  initialValue,
  onApply,
  disabled = false,
  ariaLabel,
}: MapBlockEditorProps) {
  const id = useId();
  const status = useRef<HTMLParagraphElement>(null);
  const applying = useRef(false);
  const [draft, setDraft] = useState(() => {
    const parsed = mapBlockDataSchemaV1.safeParse(initialValue);
    return parsed.success ? parsed.data : undefined;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!draft)
    return (
      <p role="alert">O conteúdo inicial MAP v1 é inválido. Seus dados não foram substituídos.</p>
    );
  const valid = mapBlockDataSchemaV1.safeParse(draft).success;
  const notify = (value: string) => {
    setMessage(value);
    queueMicrotask(() => status.current?.focus());
  };
  const update = (patch: Partial<MapBlockDataV1>) => {
    if (disabled || applying.current) return;
    setDraft({ ...draft, ...patch });
    setMessage("");
  };
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || applying.current) return;
    const parsed = mapBlockDataSchemaV1.safeParse(draft);
    if (!parsed.success) {
      notify("Corrija endereço, latitude, longitude e zoom antes de aplicar.");
      return;
    }
    applying.current = true;
    setBusy(true);
    try {
      await onApply(structuredClone(parsed.data));
      setDraft(parsed.data);
      notify("Mapa aplicado ao bloco em edição. Isso não publica nem salva a página no servidor.");
    } catch {
      notify("Não foi possível aplicar o mapa. Suas alterações continuam no editor.");
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="map-block-editor" aria-label={ariaLabel ?? "Editor MAP v1"} onSubmit={apply}>
      <fieldset disabled={disabled || busy}>
        <legend>Localização</legend>
        <label htmlFor={`${id}-title`}>Título (opcional)</label>
        <input
          id={`${id}-title`}
          value={draft.title ?? ""}
          maxLength={MAP_V1_LIMITS.titleCharacters}
          onChange={(event) => update({ title: event.target.value || undefined })}
        />
        <label htmlFor={`${id}-address`}>Endereço</label>
        <textarea
          id={`${id}-address`}
          value={draft.address}
          maxLength={MAP_V1_LIMITS.addressCharacters}
          required
          aria-invalid={!draft.address.trim()}
          onChange={(event) => update({ address: event.target.value })}
        />
        <label htmlFor={`${id}-latitude`}>Latitude (−90 a 90)</label>
        <input
          id={`${id}-latitude`}
          type="number"
          step="any"
          min={-90}
          max={90}
          required
          value={draft.latitude}
          aria-invalid={!Number.isFinite(draft.latitude) || Math.abs(draft.latitude) > 90}
          onChange={(event) =>
            update({
              latitude: event.target.value === "" ? Number.NaN : Number(event.target.value),
            })
          }
        />
        <label htmlFor={`${id}-longitude`}>Longitude (−180 a 180)</label>
        <input
          id={`${id}-longitude`}
          type="number"
          step="any"
          min={-180}
          max={180}
          required
          value={draft.longitude}
          aria-invalid={!Number.isFinite(draft.longitude) || Math.abs(draft.longitude) > 180}
          onChange={(event) =>
            update({
              longitude: event.target.value === "" ? Number.NaN : Number(event.target.value),
            })
          }
        />
        <label htmlFor={`${id}-zoom`}>Zoom (opcional, 1 a 19)</label>
        <input
          id={`${id}-zoom`}
          type="number"
          step={1}
          min={1}
          max={19}
          value={draft.zoom ?? ""}
          onChange={(event) =>
            update({ zoom: event.target.value === "" ? undefined : Number(event.target.value) })
          }
        />
        {!valid && (
          <p role="alert">
            Informe endereço e coordenadas válidas. Zoom deve ser inteiro entre 1 e 19.
          </p>
        )}
        <button type="submit">{busy ? "Aplicando mapa…" : "Aplicar mapa ao bloco"}</button>
      </fieldset>
      <p role="status" ref={status} tabIndex={-1}>
        {message}
      </p>
    </form>
  );
}
