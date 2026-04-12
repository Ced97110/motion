"use client";

import dynamic from "next/dynamic";
import type { Play } from "@/lib/types";

const PlayViewer = dynamic(() => import("@/components/viewer/PlayViewer"), {
  ssr: false,
});

export interface PlayViewerEmbedProps {
  play: Play;
}

/**
 * Thin client-side wrapper — lives in its own file so the Server Component
 * play detail page can import a plain component without needing to opt into
 * client rendering itself.
 */
export function PlayViewerEmbed({ play }: PlayViewerEmbedProps) {
  return <PlayViewer play={play} />;
}
