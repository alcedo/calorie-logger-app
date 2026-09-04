"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  useEffect(() => {
    fetch("/api/me")
      .then((res) => {
        if (res.ok) window.location.replace("/");
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-16">
      <h1 className="text-2xl font-semibold">Sign in to Macro</h1>
      <p className="max-w-sm text-center text-sm text-zinc-400">
        Use your Google account. We store your email and name only. Each person
        keeps their own food log and Claude login.
      </p>
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
      >
        Continue with Google
      </button>
    </div>
  );
}
