"use client";

import { useEffect, useRef } from "react";

interface MermaidDiagramProps {
  source: string;
  id: string;
}

declare global {
  interface Window {
    mermaid?: {
      initialize: (config: { startOnLoad: boolean; theme: string; securityLevel: string }) => void;
      render: (id: string, source: string) => Promise<{ svg: string }>;
    };
  }
}

const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";

export function MermaidDiagram({ source, id }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      if (typeof window === "undefined") return;

      if (!window.mermaid) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector(`script[src="${MERMAID_CDN}"]`);
          if (existing) {
            existing.addEventListener("load", () => resolve());
            existing.addEventListener("error", () => reject(new Error("mermaid load failed")));
            return;
          }
          const script = document.createElement("script");
          script.src = MERMAID_CDN;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("mermaid load failed"));
          document.head.appendChild(script);
        });
      }

      if (cancelled || !window.mermaid || !containerRef.current) return;

      window.mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        securityLevel: "loose",
      });

      try {
        const { svg } = await window.mermaid.render(id, source);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = `<pre class="text-xs text-red-600">Failed to render diagram: ${String(err)}</pre>`;
        }
      }
    };

    renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [source, id]);

  return (
    <div className="rounded-lg border border-border bg-card p-6 overflow-x-auto">
      <div ref={containerRef} className="text-sm" />
    </div>
  );
}
