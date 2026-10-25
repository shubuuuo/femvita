"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import NotificationBell from "./NotificationBell";

type Menu = "notifications" | "profile" | null;

const notifications = [
  "Period predicted in 1 day",
  "Ovulation window opens in 3 days",
  "Log review available",
];

export default function Header() {
  const [openMenu, setOpenMenu] = useState<Menu>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpenMenu(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const toggle = (menu: Exclude<Menu, null>) =>
    setOpenMenu(openMenu === menu ? null : menu);

  const iconButton =
    "relative flex h-11 w-11 items-center justify-center rounded-full text-[#4F4F4F] transition-colors hover:bg-[#EEDDFF]/60";

  return (
    <header className="sticky top-0 z-20 flex h-15 items-center justify-end border-b border-gray-200 bg-white px-6">
      <div ref={containerRef} className="flex items-center gap-2">
        {/* <div className="relative">
          <button
            onClick={() => toggle("notifications")}
            aria-label="Notifications"
            aria-expanded={openMenu === "notifications"}
            className={iconButton}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
            {notifications.length > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF9AA2] px-1 text-[10px] font-semibold text-white">
                {notifications.length}
              </span>
            )}
          </button>

          {openMenu === "notifications" && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
              <p className="px-3 py-2 text-sm font-semibold text-[#4F4F4F]">
                Notifications
              </p>
              {notifications.map((text) => (
                <div
                  key={text}
                  className="rounded-xl px-3 py-2 text-sm text-[#4F4F4F] hover:bg-[#EEDDFF]/60"
                >
                  {text}
                </div>
              ))}
            </div>
          )}
        </div>
         */}
        <NotificationBell />

        <Link href="/help" aria-label="Help and support" className={iconButton}>
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
            />
          </svg>
        </Link>

        <div className="relative">
          <button
            onClick={() => toggle("profile")}
            aria-label="Account menu"
            aria-expanded={openMenu === "profile"}
            className="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-[#EEDDFF]/60"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEDDFF] text-sm font-semibold text-[#B19CD9]">
              SJ
            </span>
            <span className="hidden text-sm font-medium text-[#4F4F4F] sm:block">
              Sarah Johnson
            </span>
          </button>

          {openMenu === "profile" && (
            <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
              <Link
                href="/profile"
                onClick={() => setOpenMenu(null)}
                className="block rounded-xl px-3 py-2 text-sm text-[#4F4F4F] hover:bg-[#EEDDFF]/60"
              >
                My Profile
              </Link>
              <button
                onClick={() => setOpenMenu(null)}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#4F4F4F] hover:bg-[#EEDDFF]/60"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
