import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/top-nav";
import { getCurrentUser, getUserColorBlindMode } from "@/lib/backend";

// Pixel-style heading font for titles and navigation tabs.
const headingFont = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-heading"
});

// Retro monospace-like body font used for the rest of the UI.
const bodyFont = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "Last Term Project",
  description: "Myspace-inspired social shell"
};

// Root layout only provides the shared shell so route changes can paint immediately.
export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();
  const colorBlindMode = currentUser ? getUserColorBlindMode(currentUser.id) : "default";

  return (
    <html lang="en" data-color-mode={colorBlindMode}>
      <body className={`${headingFont.variable} ${bodyFont.variable}`} data-color-mode={colorBlindMode}>
        {/* Ambient grid texture behind the full page. */}
        <div className="bg-grid" />
        <div className="site-frame">
          {/* Shared header + tab navigation shown on every route. */}
          <header className="site-header">
            <div className="logo-block">
              <p className="blink">ONLINE NOW</p>
              <h1>Yourspace</h1>
              <p className="tagline">customize your chaos.</p>
            </div>
            <TopNav />
          </header>
          {/* Route content rendered inside a shared page frame. */}
          <main className="site-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
