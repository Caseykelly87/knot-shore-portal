"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DepartmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[departments/[id] error] server component render failed", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      name: error.name,
    });
  }, [error]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 text-center space-y-4">
      <h1 className="font-display text-4xl tracking-tight text-brand-deep-navy">
        Department didn&apos;t load
      </h1>
      <p className="text-muted-foreground">
        The department drilldown hit an error while fetching metrics. Try
        again, or return to the department index.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          Digest: {error.digest}
        </p>
      ) : null}
      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          onClick={() => reset()}
          className="rounded-md bg-brand-deep-navy px-4 py-2 text-sm font-medium text-brand-salt-white hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/departments"
          className="text-sm underline text-muted-foreground hover:text-foreground"
        >
          Back to departments
        </Link>
      </div>
    </div>
  );
}
