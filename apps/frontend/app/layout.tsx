import type { Metadata } from "next";
import type { ReactNode } from "react";

import "../src/index.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: "recodee.com",
  description: "Live account switchboard",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/app.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/app.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
