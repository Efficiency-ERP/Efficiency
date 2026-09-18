// Sits outside /dashboard on purpose: documents render without the sidebar,
// header or breadcrumbs. Auth still applies — src/proxy.ts gates every
// non-static path.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>
}
