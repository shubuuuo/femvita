import "./globals.css";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen" suppressHydrationWarning>
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col bg-[#e8c1f7]">
          <Header />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
