import type { Metadata } from "next";
import { DM_Sans, Libre_Baskerville, Playfair_Display } from "next/font/google";
import { ModeIndicator } from "@/components/ModeIndicator";
import { TopNav } from "@/components/TopNav";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-libre-baskerville",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Knot Shore Portal",
  description: "Stakeholder portal for the Knot Shore Grocery analytics platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${libreBaskerville.variable} ${playfairDisplay.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased">
        <TopNav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border bg-card">
          <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-base text-brand-deep-navy">
                Knot Shore Grocery
              </span>
              <span>· 8 stores</span>
            </div>
            <ModeIndicator />
          </div>
        </footer>
      </body>
    </html>
  );
}
