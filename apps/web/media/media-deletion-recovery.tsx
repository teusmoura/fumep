"use client";
import { useState, type FormEvent } from "react";
import { mediaSelectionRequestSchema } from "@fumep/validation";
import { MediaDeleteControl } from "./media-delete-control";
export function MediaDeletionRecovery({ csrfToken }: { csrfToken: string }) {
  const [id, setId] = useState("");
  const [message, setMessage] = useState("");
  function select(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = mediaSelectionRequestSchema.safeParse({
      id: new FormData(event.currentTarget).get("id"),
    });
    if (!parsed.success) {
      setMessage("Informe uma referência UUID válida.");
      setId("");
      return;
    }
    setMessage("");
    setId(parsed.data.id.toLowerCase());
  }
  return (
    <section aria-label="Recuperação de exclusão">
      <h2>Recuperar exclusão falha — ADMIN</h2>
      <p>
        Informe a referência de um arquivo cuja exclusão falhou. Apenas o estado FAILED permite novo
        ciclo; esta operação não restaura arquivos.
      </p>
      <form className="media-upload-form" onSubmit={select}>
        <label htmlFor="media-recovery-id">Referência do arquivo (UUID)</label>
        <input id="media-recovery-id" name="id" required maxLength={36} />
        <button type="submit">Preparar novo ciclo</button>
      </form>
      <p role="status">{message}</p>
      {id && <MediaDeleteControl key={id} id={id} name={id} csrfToken={csrfToken} retry />}
    </section>
  );
}
