import { Component, type ReactNode } from "react";

/**
 * Catches render-time crashes in an admin page.
 *
 * Without this, one bad record anywhere in a page unmounts the whole admin app
 * and leaves a blank white screen with the real cause only visible in the
 * console. Showing the actual error on screen is the difference between
 * "it's broken" and a fixable bug report.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; page?: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    // Keep the full stack in the console for anyone with devtools open
    console.error(`[admin:${this.props.page || "page"}] render failed`, error, info);
  }

  componentDidUpdate(prev: { page?: string }) {
    // Navigating away should clear the error, not strand the user
    if (prev.page !== this.props.page && this.state.error) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            maxWidth: 620, borderRadius: 16, padding: 20,
            background: "#FEF2F2", border: "1px solid #FECACA",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#B91C1C" }}>
            This page hit an error
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#7F1D1D" }}>
            {error.message || String(error)}
          </p>
          {error.stack && (
            <pre
              style={{
                marginTop: 12, padding: 10, borderRadius: 8, maxHeight: 180,
                overflow: "auto", background: "rgba(0,0,0,0.05)",
                fontSize: 11, lineHeight: 1.5, color: "#7F1D1D", whiteSpace: "pre-wrap",
              }}
            >
              {error.stack.split("\n").slice(0, 6).join("\n")}
            </pre>
          )}
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 12, padding: "7px 14px", borderRadius: 10, border: "none",
              background: "#5E8B7E", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
