import type { Metadata } from "next";

export const metadata: Metadata = { title: "FemVita | Moderation" };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
