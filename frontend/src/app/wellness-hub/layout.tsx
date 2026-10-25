import type { Metadata } from "next";

export const metadata: Metadata = { title: "FemVita | Wellness Hub" };

export default function WellnessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
