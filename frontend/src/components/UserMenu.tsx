"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, type Account } from "../lib/api";

function initials(a: Account) {
  const source = (a.full_name || a.username || "?").trim();
  const parts = source.split(/\s+/);
  return (
    parts.length > 1
      ? parts[0][0] + parts[parts.length - 1][0]
      : source.slice(0, 2)
  ).toUpperCase();
}

export default function UserMenu() {
  const [me, setMe] = useState<Account | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    api<Account>("/api/me")
      .then((a) => {
        if (!cancelled) setMe(a);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login"); // even if the call failed, leave the page
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEDDFF] text-sm font-semibold text-[#B19CD9]"
      >
        {me ? initials(me) : "·"}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
          {me && (
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium text-[#4F4F4F]">
                {me.full_name ?? me.username}
              </p>
              <p className="truncate text-xs text-gray-500">{me.email}</p>
            </div>
          )}
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm text-[#4F4F4F] hover:bg-[#EEDDFF]/60"
          >
            Profile
          </Link>
          <button
            onClick={signOut}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#4F4F4F] hover:bg-[#EEDDFF]/60"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
