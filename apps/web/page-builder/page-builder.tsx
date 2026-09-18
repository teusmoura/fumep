"use client";
import { useEffect, useRef, useState } from "react";
import type { BlockContext } from "@fumep/validation";
import { frontendBlockRegistry } from "./block-registry";
import { availableLibraryImages } from "./available-library-images";
import {
  newBuilderBlock,
  parseBuilderBlocks,
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
      <ol className="page-builder-blocks">
        {blocks.map((block, index) => (
          <li key={block.id}>
            <h3>
              Bloco {index + 1} — {block.type}
            </h3>
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
