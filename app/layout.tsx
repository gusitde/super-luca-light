import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Super Luca Light",
  description: "Baseline administrative and chat tooling"
};

const navItems = [
  { href: "/admin", label: "Admin" },
  { href: "/persona", label: "Persona" },
  { href: "/chat", label: "Chat" }
];

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
            <span className="text-lg font-semibold text-slate-900">Super Luca Light</span>
            <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-slate-900">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
