import { tableBlockSchemaV1 } from "@fumep/validation";
import { BlockBackground } from "./block-background";

export interface TableBlockRendererProps {
  block: unknown;
  backgroundImage?: unknown;
  theme?: unknown;
}

// Server-rendered content; the local scroll region is the only interaction.
export function TableBlockRenderer({ block, backgroundImage, theme }: TableBlockRendererProps) {
  const parsed = tableBlockSchemaV1.safeParse(block);
  if (!parsed.success || !parsed.data.isVisible) return null;
  const { caption, headers, rows } = parsed.data.data;
  return (
    <BlockBackground block={parsed.data} backgroundImage={backgroundImage} theme={theme}>
      <div
        className="table-block-scroll"
        id={parsed.data.anchor ?? undefined}
        role="region"
        aria-label={caption?.trim() || "Tabela de conteúdo"}
        tabIndex={0}
      >
        <table className="table-block">
          {caption?.trim() && <caption>{caption}</caption>}
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, column) => (
                  <td key={column}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BlockBackground>
  );
}
