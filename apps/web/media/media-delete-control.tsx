"use client";
import { useEffect, useRef, useState } from "react";
import { mediaDeletionResponseSchema } from "@fumep/validation";
export function MediaDeleteControl({
  id,
  name,
  csrfToken,
  retry = false,
}: {
  id: string;
  name: string;
  csrfToken: string;
  retry?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);
  const [message, setMessage] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (confirming && !busy) confirm.current?.focus();
  }, [confirming, busy]);
  useEffect(() => {
    if (requested) status.current?.focus();
  }, [requested]);
  async function submit() {
    setBusy(true);
    try {
      const response = await fetch(`/admin/media/delete/${id}${retry ? "/retry" : ""}`, {
        method: retry ? "POST" : "DELETE",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": csrfToken },
      });
      if (response.status !== 202) {
        setMessage(
          response.status === 409
            ? "Exclusão bloqueada: arquivo em uso, processando ou estado indisponível. Consulte o administrador."
            : "Não foi possível solicitar. Verifique seu acesso e tente novamente.",
        );
        return;
      }
      const result = mediaDeletionResponseSchema.parse(await response.json());
      if (result.mediaId !== id.toLowerCase()) throw new Error("Unexpected media reference");
      setRequested(true);
      setConfirming(false);
      setMessage(
        "Exclusão solicitada. A remoção ocorre em segundo plano; atualize a biblioteca para consultar os arquivos disponíveis.",
      );
    } catch {
      setMessage(
        "Não foi possível confirmar a solicitação. Atualize a biblioteca antes de tentar novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        ref={trigger}
        type="button"
        disabled={busy || requested}
        aria-label={`${retry ? "Recuperar exclusão de" : "Excluir"} ${name}`}
        onClick={() => setConfirming(true)}
      >
        {retry ? "Iniciar novo ciclo" : "Excluir arquivo"}
      </button>
      {confirming && (
        <fieldset disabled={busy}>
          <legend>
            Confirmar {retry ? "novo ciclo de exclusão" : "exclusão"} de {name}?
          </legend>
          <p>Esta operação não possui restauração. Arquivos em uso não serão excluídos.</p>
          <button ref={confirm} type="button" onClick={() => void submit()}>
            Confirmar exclusão
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              trigger.current?.focus();
            }}
          >
            Cancelar
          </button>
        </fieldset>
      )}
      <p ref={status} tabIndex={-1} role="status" aria-live="polite">
        {busy ? "Solicitando exclusão..." : message}
      </p>
    </div>
  );
}
