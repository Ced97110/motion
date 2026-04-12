import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Motion — AI-Powered Basketball Coaching",
  description:
    "Animated play diagrams, interactive defense simulators, and AI game plan generation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
