"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/stores", label: "Stores" },
  { href: "/departments", label: "Departments" },
  { href: "/exceptions", label: "Exceptions" },
  { href: "/about", label: "About" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="bg-brand-deep-navy text-brand-salt-white">
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-8 text-sm">
        <Link href="/" className="flex items-baseline gap-2 group">
          <span className="font-display text-xl tracking-tight text-brand-salt-white">
            Knot Shore Grocery
          </span>
          <span className="text-xs uppercase tracking-widest text-brand-sea-glass">
            Portal
          </span>
        </Link>
        <nav className="flex items-center gap-5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "py-1 border-b-2 transition-colors",
                  isActive
                    ? "font-medium text-brand-salt-white border-brand-sea-glass"
                    : "text-brand-salt-white/70 border-transparent hover:text-brand-salt-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
