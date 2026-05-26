import Link from "next/link";

export default function DepartmentNotFound() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16 text-center space-y-4">
      <h1 className="font-display text-4xl tracking-tight text-brand-deep-navy">
        Department not found
      </h1>
      <p className="text-muted-foreground">
        That department id doesn&apos;t match any department in the taxonomy.
        Valid ids are 1 through 10.
      </p>
      <Link
        href="/departments"
        className="inline-block text-sm underline text-muted-foreground hover:text-foreground"
      >
        Back to departments
      </Link>
    </div>
  );
}
