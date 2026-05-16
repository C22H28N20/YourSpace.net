import type { ReactNode } from "react";

// Page shell component: main content area without the online users sidebar.
// Provides consistent layout structure for all pages with centered content.
type PageShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    // Centered main content area with full width for better space usage
    <section className="content-grid">
      <article className="main-panel card-enter">
        <div className="panel-head">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="panel-body">{children}</div>
      </article>
    </section>
  );
}
