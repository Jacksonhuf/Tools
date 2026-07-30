import type { ReactNode } from "react";

export interface NavItem {
  id: string;
  label: string;
  testId?: string;
}

export function AppShell({
  brand,
  navItems,
  activeId,
  onNavigate,
  languageSelect,
  children,
}: {
  brand: string;
  navItems: NavItem[];
  activeId: string;
  onNavigate: (id: string) => void;
  languageSelect: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="app-layout" data-testid="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-logo" aria-hidden>
            ◈
          </span>
          <span className="sidebar-title">{brand}</span>
        </div>
        <nav className="sidebar-nav" aria-label="Main">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-link${activeId === item.id ? " active" : ""}`}
              data-testid={item.testId}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-spacer" />
          {languageSelect}
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
