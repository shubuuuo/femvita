"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "My Dashboard" },
  { href: "cycle-tracker", label: "Cycle Tracker" },
  { href: "/wellness-hub", label: "Wellness Hub" },
  { href: "/community", label: "Community" },
  { href: "/telehealth", label: "Telehealth" },
  { href: "/profile", label: "Profile" },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`sticky top-0 h-screen shrink-0 overflow-hidden border-r border-gray-200 bg-white
                  transition-[width,min-width] duration-300 ease-in-out
                  ${isOpen ? "w-1/5 min-w-56" : "w-20 min-w-20"}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#B19CD9] text-2xl">
          🌸
        </span>
        <span
          className={`whitespace-nowrap text-xl font-semibold text-[#B19CD9] transition-opacity duration-200
                      ${isOpen ? "opacity-100 delay-150" : "opacity-0"}`}
        >
          Fem<span className="text-[#77f1dd]">Vita</span>
        </span>
      </button>

      <nav
        inert={!isOpen}
        className={`mt-4 flex flex-col gap-1 px-3 transition-opacity duration-200
                    ${isOpen ? "opacity-100 delay-150" : "opacity-0"}`}
      >
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-xl px-4 py-3 transition-colors
                        ${
                          pathname === href
                            ? "bg-[#EEDDFF] font-medium text-[#4F4F4F]"
                            : "text-[#4F4F4F] hover:bg-[#EEDDFF]/60"
                        }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
