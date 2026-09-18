"use client";
import { useId, useRef, useState } from "react";
import type { ContentBlockBackground } from "@fumep/validation";
import { availableLibraryImages } from "./available-library-images";
export function BackgroundEditor({
  initialBackground,
  initialImageId,
  images,
  position,
  disabled,
  onApply,
}: {
  initialBackground: ContentBlockBackground;
  initialImageId?: string | null;
  images: readonly unknown[];
  position: number;
  disabled: boolean;
  onApply: (background: ContentBlockBackground, imageId?: string) => Promise<void>;
}) {
  const [background, setBackground] = useState(initialBackground);
  const [imageId, setImageId] = useState(initialImageId ?? "");
  const [error, setError] = useState(false);
  const applying = useRef(false),
    feedback = useRef<HTMLParagraphElement>(null);
  const id = useId();
  const available = availableLibraryImages(images);
  return (
    <form
      className="block-background-editor"
      aria-label={`Fundo do bloco ${position}`}
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (disabled || applying.current) return;
        applying.current = true;
        setError(false);
        try {
          await onApply(background, imageId || undefined);
        } catch {
          setError(true);
          requestAnimationFrame(() => feedback.current?.focus());
        } finally {
          applying.current = false;
        }
      }}
    >
      <fieldset disabled={disabled}>
        <legend>Fundo do bloco {position}</legend>
        <label htmlFor={id}>Modo de fundo do bloco {position}</label>
        <select
          id={id}
          value={background}
          aria-describedby={`${id}-help`}
          onChange={(event) => {
            setBackground(event.target.value as ContentBlockBackground);
            setError(false);
          }}
        >
          <option value="DEFAULT">Padrão</option>
          <option value="LIGHT">Claro</option>
          <option value="INSTITUTION">Institucional</option>
          <option value="IMAGE">Imagem</option>
        </select>
        {background === "IMAGE" && (
          <>
            <label htmlFor={`${id}-image`}>Imagem de fundo do bloco {position}</label>
            <select
              id={`${id}-image`}
              value={imageId}
              aria-invalid={error}
              onChange={(event) => {
                setImageId(event.target.value);
                setError(false);
              }}
            >
              <option value="">Selecione uma imagem pronta</option>
              {imageId && !available.some((image) => image.id === imageId) && (
                <option value={imageId} disabled>
                  Referência indisponível
                </option>
              )}
              {available.map((image) => (
                <option key={image.id} value={image.id}>
                  {image.originalFilename}
                </option>
              ))}
            </select>
          </>
        )}
        <p id={`${id}-help`}>
          Sem cores ou CSS livres. Imagem exige seleção pronta da Biblioteca e usa painel de
          conteúdo para legibilidade. A validação definitiva pertence ao backend.
        </p>
        <div className="page-builder-actions">
          <button type="submit">Aplicar fundo do bloco {position}</button>
        </div>
      </fieldset>
      {error && (
        <p role="status" tabIndex={-1} ref={feedback}>
          Não foi possível aplicar o fundo. Verifique modo e imagem disponível ou tente novamente;
          suas escolhas foram mantidas.
        </p>
      )}
    </form>
  );
}
