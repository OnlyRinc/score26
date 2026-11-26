// Wird bei jedem Seitenwechsel neu eingehängt: dadurch blendet jede Seite sanft ein.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
