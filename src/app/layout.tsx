import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mirai School of Technology — Portal",
  description: "Assignment & test tracker for Mirai School of Technology",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
