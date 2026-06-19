import { NavLink, Outlet } from "react-router-dom";

/**
 * App shell: a left/top nav linking every page plus the routed
 * outlet. The nav is the single place all surfaces are reachable, so every demo
 * criterion is one click away.
 */

const NAV = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/sources", label: "Sources" },
  { to: "/catalog", label: "Catalog" },
  { to: "/review", label: "Review Queue" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/register", label: "Register Agent" },
];

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <NavLink to="/" className="text-lg font-semibold text-slate-900">
            Agent Network
            <span className="ml-2 text-sm font-normal text-slate-400">
              registration &amp; certification
            </span>
          </NavLink>
          <nav className="flex flex-wrap gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
