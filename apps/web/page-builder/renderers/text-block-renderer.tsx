import { Fragment, type ReactNode } from "react";
import {
  textBlockSchemaV1,
  type TextContentNodeV1,
  type TextInlineNodeV1,
} from "@fumep/validation";

export interface TextBlockRendererProps {
  block: unknown;
}
function textRun(node: Extract<TextInlineNodeV1, { type: "text" }>): ReactNode {
  let content: ReactNode = node.text;
  if (node.marks?.includes("italic")) content = <em>{content}</em>;
  if (node.marks?.includes("bold")) content = <strong>{content}</strong>;
  return content;
}
function inlines(nodes: TextInlineNodeV1[]): ReactNode {
  return nodes.map((node, index) => (
    <Fragment key={index}>
      {node.type === "text" ? (
        textRun(node)
      ) : // Empty labels are valid incomplete drafts, but must not create unnamed
      // public links. Publication completeness remains a backend responsibility.
      node.children.some((child) => child.text.trim()) ? (
        <a href={node.url}>
          {node.children.map((child, position) => (
            <Fragment key={position}>{textRun(child)}</Fragment>
          ))}
        </a>
      ) : null}
    </Fragment>
  ));
}
function contentNode(node: TextContentNodeV1): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p>{inlines(node.children)}</p>;
    case "highlight":
      return <p className="text-block-highlight">{inlines(node.children)}</p>;
    case "heading": {
      const Heading = `h${node.level}` as "h2" | "h3" | "h4";
      return <Heading>{inlines(node.children)}</Heading>;
    }
    case "orderedList":
    case "bulletList": {
      const List = node.type === "orderedList" ? "ol" : "ul";
      return (
        <List>
          {node.items.map((item, index) => (
            <li key={index}>{inlines(item.children)}</li>
          ))}
        </List>
      );
    }
    case "table":
      return (
        <div
          className="text-block-table-scroll"
          role="region"
          aria-label={node.caption?.trim() || "Tabela de conteúdo"}
          tabIndex={0}
        >
          <table>
            {node.caption?.trim() && <caption>{node.caption}</caption>}
            <thead>
              <tr>
                {node.headers.map((header, index) => (
                  <th key={index} scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {node.rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, column) => (
                    <td key={column}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}
// No hooks, fetching or HTML interpretation: one implementation for public SSR
// and a future authorized Preview. This component does not authorize publication.
export function TextBlockRenderer({ block }: TextBlockRendererProps) {
  const parsed = textBlockSchemaV1.safeParse(block);
  if (!parsed.success || !parsed.data.isVisible) return null;
  const { data } = parsed.data;
  return (
    <div className="text-block" id={parsed.data.anchor ?? undefined}>
      {data.title?.trim() && <h2>{data.title}</h2>}
      {data.content.nodes.map((node, index) => (
        <Fragment key={index}>{contentNode(node)}</Fragment>
      ))}
    </div>
  );
}
