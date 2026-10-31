"use client";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";

const BARE = ["/", "/login", "/register"];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (BARE.includes(path)) return <>{children}</>;

  return (
    <>
      <body className="flex min-h-screen" suppressHydrationWarning>
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col bg-[#e8c1f7]">
          <Header />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </>
  );
}
