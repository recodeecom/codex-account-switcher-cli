import type { Metadata } from "next";
import type { ReactNode } from "react";

import "../src/index.css";
import { AppProviders } from "./providers";

const LIGHT_BOOTSTRAP_BACKGROUND = "#f8f9fb";
const DARK_BOOTSTRAP_BACKGROUND = "#020308";
const DARK_BOOTSTRAP_BACKGROUND_IMAGE = "none";

const THEME_BOOTSTRAP_STYLES = `
  html {
    background-color: ${DARK_BOOTSTRAP_BACKGROUND};
    background-image: ${DARK_BOOTSTRAP_BACKGROUND_IMAGE};
    background-position: center top;
    background-repeat: no-repeat;
    background-size: cover;
    color-scheme: dark;
  }
  html.light {
    background-color: ${LIGHT_BOOTSTRAP_BACKGROUND};
    background-image: none;
    color-scheme: light;
  }
  html.dark {
    background-color: ${DARK_BOOTSTRAP_BACKGROUND};
    background-image: ${DARK_BOOTSTRAP_BACKGROUND_IMAGE};
    background-position: center top;
    background-repeat: no-repeat;
    background-size: cover;
    color-scheme: dark;
  }
  @media (prefers-color-scheme: dark) {
    html:not(.light) {
      background-color: ${DARK_BOOTSTRAP_BACKGROUND};
      background-image: ${DARK_BOOTSTRAP_BACKGROUND_IMAGE};
      background-position: center top;
      background-repeat: no-repeat;
      background-size: cover;
      color-scheme: dark;
    }
  }
  body {
    background-color: transparent;
  }
`;

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <style
          id="theme-bootstrap-styles"
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_STYLES }}
        />
      </head>
      <body suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
