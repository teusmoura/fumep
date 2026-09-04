import type { ReactNode } from "react";

export type MessageProps = Readonly<{
  children: ReactNode;
}>;

export function Message({ children }: MessageProps) {
  return <p>{children}</p>;
}
