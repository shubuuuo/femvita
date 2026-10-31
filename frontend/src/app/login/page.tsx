"use client";
import Link from "next/link";
import { useState } from "react";
import { api, apiErrorMessage } from "../../lib/api";

// Only follow ?next= when it's a path on this site (blocks links like /login?next=//evil.com)
function nextPath() {
  const n = new URLSearchParams(window.location.search).get("next");
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#4F4F4F]";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      window.location.assign(nextPath()); // full page load, so everything starts fresh as you
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't sign in. Please try again."));
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F4FF] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#B19CD9]">FemVita</h1>
        <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            type="email"
            autoComplete="email"
            placeholder="Email"
            required
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            required
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={busy || !email || !password}
            className="w-full rounded-full bg-[#B19CD9] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-500">
          New here?{" "}
          <Link href="/register" className="text-[#B19CD9] underline">
            Create an account
          </Link>
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Password reset isnt available yet.
        </p>
      </div>
    </main>
  );
}
