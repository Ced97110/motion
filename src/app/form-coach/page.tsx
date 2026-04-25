// Copyright: Your Name. Apache 2.0
// /form-coach — record yourself, get back what to focus on. Phase 1 of the
// video-grounded coaching wedge.
//
// Server Component shell — auth + chrome only. The interactive flow lives
// in FormCoachClient (client component) where MediaPipe runs in-browser.

import type { Metadata } from "next";

import { FormCoachClient } from "./FormCoachClient";

export const metadata: Metadata = {
  title: "Form Coach — Motion",
  description:
    "Record yourself shooting. Motion tells you what to focus on, and why.",
};

export default function FormCoachPage() {
  return <FormCoachClient />;
}
