"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Homepage", isActive: pathname === "/" },
    { href: "/stocks", label: "Dashboard", isActive: pathname === "/stocks" },
    { href: "/market", label: "Anlaysis", isActive: pathname === "/market" },
  ];

  return (
    <div className="min-h-screen text-[15px]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-stone-200/90 bg-[#f3efe7]/95 px-4 py-6 backdrop-blur-sm transition-all duration-200 lg:flex lg:flex-col ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-stone-700 to-stone-900 shadow-md ring-1 ring-stone-500/30">
                <span className="text-lg font-black leading-none text-stone-100">A</span>
              </div>
              <div>
                <p className="text-[1.02rem] font-semibold tracking-tight text-stone-800">Agorax</p>
              </div>
            </a>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="rounded-2xl px-4 py-3 text-sm font-medium text-stone-600 transition hover:bg-[#ece6db] hover:text-stone-800"
              aria-label="Collapse sidebar"
            >
              {"←"}
            </button>
          </div>
        ) : (
          <div className="flex">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="w-full rounded-2xl px-4 py-3 text-sm font-medium text-stone-600 transition hover:bg-[#ece6db] hover:text-stone-800"
              aria-label="Expand sidebar"
            >
              {"→"}
            </button>
          </div>
        )}

        <nav className={`${collapsed ? "mt-4" : "mt-8"} space-y-2 text-sm`}>
          {navItems.map((item) => (
            <a
              key={item.href}
              className={`block rounded-2xl px-4 py-3 transition ${
                item.isActive
                  ? "border border-stone-300 bg-[#fbf9f5] font-medium text-stone-800"
                  : "text-stone-600 hover:bg-[#ece6db] hover:text-stone-800"
              }`}
              href={item.href}
              title={collapsed ? item.label : undefined}
            >
              {collapsed ? item.label.slice(0, 1) : item.label}
            </a>
          ))}
        </nav>

        {!collapsed ? (
          <div className="mt-10 rounded-3xl border border-stone-200 bg-[#fbf9f5]/95 p-4 shadow-sm">
            <p className="text-sm font-medium text-stone-800">Focus for today</p>
            <p className="mt-2 text-xs leading-5 text-stone-600">
              Review your summary, revisit your thesis, and update conviction with fresh price action.
            </p>
          </div>
        ) : null}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-stone-200 bg-[#f3efe7] p-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <a href="/" className="font-semibold tracking-tight text-stone-800">
                Agorax
              </a>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-stone-300 bg-[#fbf9f5] px-2 py-1 text-xs font-medium text-stone-700"
              >
                Close
              </button>
            </div>
            <nav className="space-y-2 text-sm">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  className={`block rounded-2xl px-4 py-3 transition ${
                    item.isActive
                      ? "border border-stone-300 bg-[#fbf9f5] font-medium text-stone-800"
                      : "text-stone-600 hover:bg-[#ece6db] hover:text-stone-800"
                  }`}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}

      <div className={`min-h-screen transition-all duration-200 ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <header className="sticky top-0 z-30 border-b border-stone-200/90 bg-[#f6f3ec]/92 px-5 py-4 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between">
            <a href="/" className="font-semibold text-stone-800">Agorax</a>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-stone-300 bg-[#fbf9f5] px-3 py-1 text-sm font-medium text-stone-700"
            >
              Menu
            </button>
          </div>
        </header>
        <main className="px-5 py-6 lg:px-10 lg:py-9">{children}</main>
      </div>
    </div>
  );
}
