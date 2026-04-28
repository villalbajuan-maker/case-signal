import Link from "next/link";
import { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
  email: string | undefined;
}

const navItems = [
  { href: "/dashboard", label: "Attention Queue" },
  { href: "/inventory", label: "Inventory" },
  { href: "/reports", label: "Weekly Reports" }
] as const;

export function AppShell({ children, email }: AppShellProps) {
  return (
    <div className="appShell">
      <aside className="sidebar">
        <div>
          <div className="brandMark">CS</div>
          <div className="brandBlock">
            <p className="eyebrow">CaseSignal</p>
            <h2>Decision Layer</h2>
          </div>
        </div>

        <nav className="sidebarNav">
          {navItems.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebarFooter">
          <p className="muted">Signed in as</p>
          <strong>{email ?? "Unknown user"}</strong>
        </div>
      </aside>

      <main className="appMain">{children}</main>
    </div>
  );
}
