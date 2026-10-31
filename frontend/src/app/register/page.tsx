"use client";
import Link from "next/link";
import { useState } from "react";
import { api, apiErrorMessage } from "../../lib/api";

const MIN_AGE = 16; // keep in step with MIN_AGE in schemas.py

function ageOf(iso: string) {
  const b = new Date(`${iso}T00:00:00`);
  const t = new Date();
  return (
    t.getFullYear() -
    b.getFullYear() -
    (t.getMonth() < b.getMonth() ||
    (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())
      ? 1
      : 0)
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#4F4F4F]";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = fullName.trim();
    if (!name) return setError("Please enter your name.");
    if (!/^[A-Za-z0-9_.]{3,30}$/.test(username)) {
      return setError(
        "Usernames are 3–30 characters: letters, numbers, dots and underscores.",
      );
    }
    if (!birthday) return setError("Please enter your birthday.");
    if (ageOf(birthday) < MIN_AGE)
      return setError(`You must be at least ${MIN_AGE} to use FemVita.`);
    if (password.length < 10)
      return setError("Your password needs at least 10 characters.");
    if (password !== confirm) return setError("The passwords don't match.");

    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          username,
          full_name: name,
          birthday,
        }),
      });
      window.location.assign("/dashboard"); // registering also signs you in
    } catch (err) {
      setError(
        apiErrorMessage(err, "Couldn't create your account. Please try again."),
      );
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F4FF] px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#B19CD9]">FemVita</h1>
        <p className="mt-1 text-sm text-gray-500">Create your account</p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            autoComplete="name"
            placeholder="Full name"
            maxLength={80}
            required
            className={inputClass}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <div>
            <input
              autoComplete="username"
              placeholder="Username"
              maxLength={30}
              required
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Shown on your community posts.
            </p>
          </div>
          <input
            type="email"
            autoComplete="email"
            placeholder="Email"
            required
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="block text-xs text-gray-500">
            Birthday
            <input
              type="date"
              required
              className={`${inputClass} mt-1`}
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </label>
          <div>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Password (10+ characters)"
              required
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              A few random words is easier to remember than symbols.
            </p>
          </div>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Repeat password"
            required
            className={inputClass}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[#B19CD9] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="text-[#B19CD9] underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
