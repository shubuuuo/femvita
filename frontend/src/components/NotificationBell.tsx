"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, type AppNotification, type NotificationList } from "../lib/api";
import { DATA_CHANGED } from "../lib/events";

export default function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Load on mount, after any save elsewhere in the app, and when you return to the tab
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api<NotificationList>("/api/notifications")
        .then((d) => {
          if (!cancelled) setItems(d.items);
        })
        .catch(() => {}); // no bell data is not worth an error banner
    };
    load();
    window.addEventListener(DATA_CHANGED, load);
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      window.removeEventListener(DATA_CHANGED, load);
      window.removeEventListener("focus", load);
    };
  }, []);

  // Close on outside click or Escape
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

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={
          items.length ? `Notifications, ${items.length}` : "Notifications"
        }
        aria-expanded={open}
        className="relative rounded-full p-2 text-[#4F4F4F] hover:bg-[#EEDDFF]"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {items.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
          {items.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500">
              You're all caught up.
            </p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.kind}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-2 text-sm text-[#4F4F4F] hover:bg-[#EEDDFF]/60"
                  >
                    {n.text}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
