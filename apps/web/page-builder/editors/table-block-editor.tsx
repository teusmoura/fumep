"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { TABLE_V1_LIMITS, tableBlockDataSchemaV1, type TableBlockDataV1 } from "@fumep/validation";

export interface TableBlockEditorProps {
  initialValue: unknown;
  onApply: (value: TableBlockDataV1) => void | Promise<void>;
  disabled?: boolean;
  ariaLabel?: string;
}

export function TableBlockEditor({
  initialValue,
  onApply,
  disabled = false,
  ariaLabel,
}: TableBlockEditorProps) {
  const id = useId();
  const status = useRef<HTMLParagraphElement>(null);
  const applying = useRef(false);
  const [draft, setDraft] = useState(() => {
    const parsed = tableBlockDataSchemaV1.safeParse(initialValue);
    return parsed.success ? parsed.data : undefined;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!draft)
    return (
      <p role="alert">O conteúdo inicial TABLE v1 é inválido. Seus dados não foram substituídos.</p>
    );
  const valid = tableBlockDataSchemaV1.safeParse(draft).success;
  const notify = (value: string) => {
    setMessage(value);
    queueMicrotask(() => status.current?.focus());
  };
  const update = (value: TableBlockDataV1, announcement = "") => {
    if (disabled || applying.current) return;
    setDraft(value);
    setMessage("");
    if (announcement) notify(announcement);
  };
  const editHeader = (column: number, value: string) =>
    update({
      ...draft,
      headers: draft.headers.map((header, index) => (index === column ? value : header)),
    });
  const editCell = (row: number, column: number, value: string) =>
    update({
      ...draft,
      rows: draft.rows.map((cells, index) =>
        index === row ? cells.map((cell, position) => (position === column ? value : cell)) : cells,
      ),
    });
  const addColumn = () =>
    update(
      {
        ...draft,
        headers: [...draft.headers, `Coluna ${draft.headers.length + 1}`],
        rows: draft.rows.map((row) => [...row, ""]),
      },
      `Coluna ${draft.headers.length + 1} adicionada.`,
    );
  const removeColumn = (column: number) =>
    update(
      {
        ...draft,
        headers: draft.headers.filter((_, index) => index !== column),
        rows: draft.rows.map((row) => row.filter((_, index) => index !== column)),
      },
      `Coluna ${column + 1} removida.`,
    );
  const moveRow = (row: number, target: number) => {
    if (target < 0 || target >= draft.rows.length) return;
    const rows = [...draft.rows];
    const [item] = rows.splice(row, 1);
    rows.splice(target, 0, item!);
    update({ ...draft, rows }, `Linha movida para a posição ${target + 1}.`);
  };
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || applying.current) return;
    const parsed = tableBlockDataSchemaV1.safeParse(draft);
    if (!parsed.success) {
      notify("Corrija os cabeçalhos e mantenha todas as linhas com a mesma quantidade de células.");
      return;
    }
    applying.current = true;
    setBusy(true);
    try {
      await onApply(structuredClone(parsed.data));
      setDraft(parsed.data);
      notify(
        "Tabela aplicada ao bloco em edição. Isso não publica nem salva a página no servidor.",
      );
    } catch {
      notify("Não foi possível aplicar a tabela. Suas alterações continuam no editor.");
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="table-block-editor"
      aria-label={ariaLabel ?? "Editor TABLE v1"}
      onSubmit={apply}
    >
      <fieldset disabled={disabled || busy}>
        <legend>Tabela estruturada</legend>
        <label htmlFor={`${id}-caption`}>Legenda (opcional)</label>
        <input
          id={`${id}-caption`}
          value={draft.caption ?? ""}
          maxLength={TABLE_V1_LIMITS.captionCharacters}
          onChange={(event) => update({ ...draft, caption: event.target.value || undefined })}
        />
        <div
          className="table-editor-scroll"
          role="region"
          aria-label="Editar células da tabela"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                {draft.headers.map((header, column) => (
                  <th scope="col" key={column}>
                    <label htmlFor={`${id}-header-${column}`}>Cabeçalho {column + 1}</label>
                    <input
                      id={`${id}-header-${column}`}
                      value={header}
                      maxLength={TABLE_V1_LIMITS.headerCharacters}
                      aria-invalid={!header.trim()}
                      onChange={(event) => editHeader(column, event.target.value)}
                    />
                    <button
                      type="button"
                      disabled={draft.headers.length === 1}
                      onClick={() => removeColumn(column)}
                    >
                      Remover coluna {column + 1}
                    </button>
                  </th>
                ))}
                <th scope="col">Ações da linha</th>
              </tr>
            </thead>
            <tbody>
              {draft.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, column) => (
                    <td key={column}>
                      <label htmlFor={`${id}-cell-${rowIndex}-${column}`}>
                        Linha {rowIndex + 1}, {draft.headers[column] || `coluna ${column + 1}`}
                      </label>
                      <input
                        id={`${id}-cell-${rowIndex}-${column}`}
                        value={cell}
                        maxLength={TABLE_V1_LIMITS.cellCharacters}
                        onChange={(event) => editCell(rowIndex, column, event.target.value)}
                      />
                    </td>
                  ))}
                  <td className="table-editor-actions">
                    <button
                      type="button"
                      disabled={rowIndex === 0}
                      onClick={() => moveRow(rowIndex, rowIndex - 1)}
                    >
                      Subir linha {rowIndex + 1}
                    </button>
                    <button
                      type="button"
                      disabled={rowIndex === draft.rows.length - 1}
                      onClick={() => moveRow(rowIndex, rowIndex + 1)}
                    >
                      Descer linha {rowIndex + 1}
                    </button>
                    <button
                      type="button"
                      disabled={draft.rows.length === 1}
                      onClick={() =>
                        update(
                          { ...draft, rows: draft.rows.filter((_, index) => index !== rowIndex) },
                          `Linha ${rowIndex + 1} removida.`,
                        )
                      }
                    >
                      Remover linha {rowIndex + 1}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-editor-actions">
          <button
            type="button"
            disabled={draft.headers.length >= TABLE_V1_LIMITS.columns}
            onClick={addColumn}
          >
            Adicionar coluna
          </button>
          <button
            type="button"
            disabled={draft.rows.length >= TABLE_V1_LIMITS.rows}
            onClick={() =>
              update(
                { ...draft, rows: [...draft.rows, draft.headers.map(() => "")] },
                `Linha ${draft.rows.length + 1} adicionada.`,
              )
            }
          >
            Adicionar linha
          </button>
        </div>
        <p>
          Máximo de {TABLE_V1_LIMITS.columns} colunas e {TABLE_V1_LIMITS.rows} linhas.
        </p>
        {!valid && (
          <p role="alert">
            Informe cabeçalhos válidos e mantenha ao menos uma linha com todas as colunas.
          </p>
        )}
        <button type="submit">{busy ? "Aplicando tabela…" : "Aplicar tabela ao bloco"}</button>
      </fieldset>
      <p role="status" ref={status} tabIndex={-1}>
        {message}
      </p>
    </form>
  );
}
