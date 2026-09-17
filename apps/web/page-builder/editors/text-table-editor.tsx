import { TEXT_V1_LIMITS, type TextContentNodeV1 } from "@fumep/validation";
type TextTable = Extract<TextContentNodeV1, { type: "table" }>;
export function TextTableEditor({
  value,
  onChange,
  id,
}: {
  value: TextTable;
  onChange: (value: TextTable) => void;
  id: string;
}) {
  return (
    <div>
      <label htmlFor={`${id}-caption`}>Legenda da tabela</label>
      <input
        id={`${id}-caption`}
        maxLength={300}
        value={value.caption ?? ""}
        onChange={(event) => onChange({ ...value, caption: event.target.value })}
      />
      <div
        className="text-editor-table-scroll"
        role="region"
        aria-label="Tabela em edição"
        tabIndex={0}
      >
        <table>
          <caption>Tabela simples — edição de cabeçalhos e células</caption>
          <thead>
            <tr>
              {value.headers.map((header, column) => (
                <th scope="col" key={column}>
                  <label htmlFor={`${id}-header-${column}`}>Cabeçalho {column + 1}</label>
                  <input
                    id={`${id}-header-${column}`}
                    maxLength={200}
                    value={header}
                    aria-invalid={!header.trim()}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        headers: value.headers.map((item, position) =>
                          position === column ? event.target.value : item,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    disabled={value.headers.length <= 1}
                    onClick={() =>
                      onChange({
                        ...value,
                        headers: value.headers.filter((_, position) => position !== column),
                        rows: value.rows.map((row) =>
                          row.filter((_, position) => position !== column),
                        ),
                      })
                    }
                  >
                    Remover coluna {column + 1}
                  </button>
                </th>
              ))}
              <th scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {value.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, column) => (
                  <td key={column}>
                    <label htmlFor={`${id}-cell-${rowIndex}-${column}`}>
                      Linha {rowIndex + 1}, coluna {column + 1}
                    </label>
                    <input
                      id={`${id}-cell-${rowIndex}-${column}`}
                      maxLength={TEXT_V1_LIMITS.runCharacters}
                      value={cell}
                      onChange={(event) =>
                        onChange({
                          ...value,
                          rows: value.rows.map((item, position) =>
                            position === rowIndex
                              ? item.map((current, index) =>
                                  index === column ? event.target.value : current,
                                )
                              : item,
                          ),
                        })
                      }
                    />
                  </td>
                ))}
                <td>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...value,
                        rows: value.rows.filter((_, position) => position !== rowIndex),
                      })
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
      <div className="text-editor-actions">
        <button
          type="button"
          disabled={value.headers.length >= TEXT_V1_LIMITS.tableColumns}
          onClick={() =>
            onChange({
              ...value,
              headers: [...value.headers, `Coluna ${value.headers.length + 1}`],
              rows: value.rows.map((row) => [...row, ""]),
            })
          }
        >
          Adicionar coluna
        </button>
        <button
          type="button"
          disabled={value.rows.length >= TEXT_V1_LIMITS.tableRows}
          onClick={() => onChange({ ...value, rows: [...value.rows, value.headers.map(() => "")] })}
        >
          Adicionar linha
        </button>
      </div>
    </div>
  );
}
