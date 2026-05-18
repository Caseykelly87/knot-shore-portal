import Link from "next/link";

export default function StoreNotFound() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16 text-center space-y-4">
      <h1 className="font-display text-4xl tracking-tight text-brand-deep-navy">
        Store not found
      </h1>
      <p className="text-muted-foreground">
        That store id doesn&apos;t match any store in the chain. Valid ids are 1 through 8.
      </p>
      <Link href="/" className="inline-block text-sm underline text-muted-foreground hover:text-foreground">
        Back to dashboard
      </Link>
    </div>
  );
}
