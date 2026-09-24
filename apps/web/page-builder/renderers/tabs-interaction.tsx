"use client";

import { Fragment, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { TabItemV1, TextInlineNodeV1 } from "@fumep/validation";

function renderRun(run: Extract<TextInlineNodeV1, { type: "text" }>): ReactNode {
  let content: ReactNode = run.text;
  if (run.marks?.includes("italic")) content = <em>{content}</em>;
  if (run.marks?.includes("bold")) content = <strong>{content}</strong>;
  return content;
}
function renderInlines(nodes: TextInlineNodeV1[]) {
  return nodes.map((node, index) => (
    <Fragment key={index}>
      {node.type === "text" ? (
        renderRun(node)
      ) : (
        <a href={node.url}>
          {node.children.map((child, childIndex) => (
            <Fragment key={childIndex}>{renderRun(child)}</Fragment>
          ))}
        </a>
      )}
    </Fragment>
  ));
}

export function TabsInteraction({ id, tabs }: { id: string; tabs: TabItemV1[] }) {
  const [selected, setSelected] = useState(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const activate = (index: number) => {
    setSelected(index);
    buttons.current[index]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let target: number | undefined;
    if (event.key === "ArrowRight") target = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") target = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") target = 0;
    if (event.key === "End") target = tabs.length - 1;
    if (target === undefined) return;
    event.preventDefault();
    activate(target);
  };
  return (
    <>
      <div className="tabs-block-list" role="tablist" aria-label="Abas de conteúdo">
        {tabs.map((tab, index) => (
          <button
            key={index}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={selected === index}
            tabIndex={selected === index ? 0 : -1}
            onClick={() => activate(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={index}
          id={`${id}-panel-${index}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${index}`}
          tabIndex={0}
          hidden={selected !== index}
        >
          {tab.content.nodes.map((node, paragraphIndex) => (
            <p key={paragraphIndex}>{renderInlines(node.children)}</p>
          ))}
        </div>
      ))}
    </>
  );
}
