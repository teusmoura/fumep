"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { BlockContext } from "@fumep/validation";
import { frontendBlockRegistry } from "./block-registry";
import { availableLibraryImages } from "./available-library-images";
import {
  newBuilderBlock,
  parseBuilderBlocks,
  reorderBuilderBlocks,
  type BuilderBlock,
  type BuilderType,
} from "./builder-state";
export interface PageBuilderProps {
  context: BlockContext;
  initialBlocks: unknown;
  images?: readonly unknown[];
  onApply: (blocks: BuilderBlock[]) => void | Promise<void>;
  disabled?: boolean;
}
// Remount by owner/version/context. Caller authorizes and persists; this is draft UI only.
export function PageBuilder({
  context,
  initialBlocks,
  images = [],
  onApply,
  disabled = false,
}: PageBuilderProps) {
  const [blocks, setBlocks] = useState(() => parseBuilderBlocks(initialBlocks, context));
  const [candidate, setCandidate] = useState<BuilderBlock>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const applying = useRef(false);
  const dragged = useRef<string | undefined>(undefined);
  const instructionsId = useId();
  const status = useRef<HTMLParagraphElement>(null);
  const available = availableLibraryImages(images);
  useEffect(() => {
    if (message) status.current?.focus();
  }, [message, blocks, candidate]);
  const notify = (text: string) => {
    setMessage(text);
  };
  if (!blocks)
    return (
      <p role="alert">
        Os blocos iniciais ou o contexto são inválidos. Seus dados não foram substituídos.
      </p>
    );
  function add(type: BuilderType) {
    if (disabled || applying.current || candidate || !blocks) return;
    const next = newBuilderBlock(type, context, blocks, crypto.randomUUID(), available[0]?.id);
    if (!next) {
      notify("Não foi possível iniciar o bloco. Verifique contexto e imagens disponíveis.");
      return;
    }
    setCandidate(next);
    setMessage("Configure o novo bloco e aplique seu conteúdo para adicioná-lo ao draft.");
  }
  async function apply(block: BuilderBlock, data: unknown, adding: boolean) {
    if (disabled || applying.current || !blocks) return;
    const next = parseBuilderBlocks(
      adding
        ? [...blocks, { ...block, data }]
        : blocks.map((item) => (item.id === block.id ? { ...item, data } : item)),
      context,
    );
    if (!next) {
      notify("Conteúdo inválido. Suas alterações foram mantidas.");
      throw new Error("Invalid block draft");
    }
    applying.current = true;
    setBusy(true);
    try {
      await onApply(structuredClone(next));
      setBlocks(next);
      if (adding) setCandidate(undefined);
      notify("Draft atualizado. Isso não publica a página nem concede autorização.");
    } catch (error) {
      notify("Não foi possível aplicar o draft. Suas alterações continuam no editor.");
      throw error;
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  function editor(block: BuilderBlock, adding: boolean) {
    const definition = frontendBlockRegistry.get(block.type, block.schemaVersion, context);
    if (!definition) return <p role="alert">Definição indisponível.</p>;
    const Editor = definition.editor;
    return (
      <Editor
        initialValue={block.data}
        images={available}
        onApply={(data: unknown) => apply(block, data, adding)}
        disabled={disabled || busy}
      />
    );
  }
  async function reorder(sourceId: string, targetIndex: number) {
    dragged.current = undefined;
    if (disabled || applying.current || candidate || !blocks) return;
    const next = reorderBuilderBlocks(blocks, context, sourceId, targetIndex);
    if (!next) return;
    applying.current = true;
    setBusy(true);
    try {
      await onApply(structuredClone(next));
      setBlocks(next);
      notify(
        `Bloco movido para a posição ${targetIndex + 1} de ${next.length}. Draft não publicado.`,
      );
    } catch {
      notify("Não foi possível reordenar. Ordem e alterações dos editores foram mantidas.");
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="page-builder" aria-label="Page Builder básico" aria-busy={busy}>
      <h2>Blocos de conteúdo</h2>
      <p>
        Edição de draft. Autorização, salvamento e publicação dependem do backend do proprietário.
      </p>
      <div className="page-builder-actions" aria-label="Adicionar bloco">
        {frontendBlockRegistry.list(context).map((definition) => (
          <button
            key={definition.type}
            type="button"
            disabled={
              disabled ||
              busy ||
              Boolean(candidate) ||
              (definition.type === "IMAGE" && !available.length)
            }
            onClick={() => add(definition.type as BuilderType)}
          >
            Adicionar {definition.type}
          </button>
        ))}
      </div>
      {!available.length && (
        <p>Para adicionar IMAGE, selecione uma imagem disponível da Biblioteca de Mídia.</p>
      )}
      {!blocks.length && <p>Nenhum bloco adicionado ao draft.</p>}
      <p id={instructionsId}>
        Arraste o handle até outro bloco ou use Subir/Descer. A ordem só muda após aplicação
        bem-sucedida do draft. Edições ainda não aplicadas permanecem nos respectivos editores.
      </p>
      <ol className="page-builder-blocks">
        {blocks.map((block, index) => (
          <li
            key={block.id}
            onDragOver={(event) => {
              if (dragged.current && !disabled && !applying.current && !candidate)
                event.preventDefault();
            }}
            onDrop={(event) => {
              if (!dragged.current) return;
              event.preventDefault();
              void reorder(dragged.current, index);
            }}
          >
            <h3>
              Bloco {index + 1} — {block.type}
            </h3>
            <div className="page-builder-actions" aria-label={`Reordenar bloco ${index + 1}`}>
              <button
                type="button"
                aria-label={`Arrastar bloco ${index + 1} — ${block.type}`}
                aria-describedby={instructionsId}
                disabled={disabled || busy || Boolean(candidate) || blocks.length < 2}
                draggable={!disabled && !busy && !candidate && blocks.length > 1}
                onDragStart={(event) => {
                  if (disabled || applying.current || candidate) {
                    event.preventDefault();
                    return;
                  }
                  dragged.current = block.id;
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", block.id);
                }}
                onDragEnd={() => {
                  dragged.current = undefined;
                }}
              >
                Arrastar
              </button>
              <button
                type="button"
                aria-label={`Subir bloco ${index + 1} — ${block.type}`}
                aria-describedby={instructionsId}
                disabled={disabled || busy || Boolean(candidate) || index === 0}
                onClick={() => void reorder(block.id, index - 1)}
              >
                Subir
              </button>
              <button
                type="button"
                aria-label={`Descer bloco ${index + 1} — ${block.type}`}
                aria-describedby={instructionsId}
                disabled={disabled || busy || Boolean(candidate) || index === blocks.length - 1}
                onClick={() => void reorder(block.id, index + 1)}
              >
                Descer
              </button>
            </div>
            {editor(block, false)}
          </li>
        ))}
      </ol>
      {candidate && (
        <section aria-label="Novo bloco">
          <h3>Novo bloco — {candidate.type}</h3>
          {editor(candidate, true)}
        </section>
      )}
      <p ref={status} role="status" tabIndex={-1}>
        {message}
      </p>
    </section>
  );
}
