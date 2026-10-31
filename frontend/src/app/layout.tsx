import "./globals.css";
import Shell from "@/components/Shell";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen" suppressHydrationWarning>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
