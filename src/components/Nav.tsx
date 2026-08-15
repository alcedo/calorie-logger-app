"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/history", label: "History" },
  { href: "/foods", label: "Foods & Goals" },
] as const;

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-6 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-zinc-950">
            M
          </span>
          <span className="text-lg tracking-tight">Macro</span>
        </Link>
        <nav className="flex gap-1 text-sm">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                pathname === href
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
