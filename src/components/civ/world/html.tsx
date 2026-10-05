"use client";

import type { ComponentProps } from "react";
import { useThree } from "@react-three/fiber";
import { Html as DreiHtml } from "@react-three/drei";

// drei's <Html> rebuilds its React root when the canvas events connect, which
// happens just after the first render; a label mounted before that is torn
// down mid-render. Waiting for the connection keeps every label mounted once.
export function Html(props: ComponentProps<typeof DreiHtml>) {
  const connected = useThree((s) => !!s.events.connected);
  return connected ? <DreiHtml {...props} /> : null;
}
