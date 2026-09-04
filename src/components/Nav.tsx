"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/history", label: "History" },
  { href: "/foods", label: "Foods" },
  { href: "/ai", label: "AI" },
] as const;

export function Nav() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    if (pathname === "/login") return;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: { name: string; email: string } } | null) => {
        setUser(data?.user ?? null);
      })
      .catch(() => undefined);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-20 -mx-4 mb-6 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <Link href={pathname === "/login" ? "/login" : "/"} className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-zinc-950">
            M
          </span>
          <span className="text-lg tracking-tight">Macro</span>
        </Link>
        {pathname !== "/login" && (
          <div className="flex items-center gap-3">
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
            {user && (
              <div className="flex items-center gap-2 border-l border-zinc-800 pl-3">
                <span className="max-w-32 truncate text-xs text-zinc-300">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    window.location.assign("/api/auth/logout");
                  }}
                  className="rounded-full px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
