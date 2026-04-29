import type { Metadata } from "next";
import { ModeIndicator } from "@/components/ModeIndicator";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between text-sm text-slate-600">
            <span>Knot Shore Portal</span>
            <ModeIndicator />
          </div>
        </footer>
      </body>
    </html>
  );
}
