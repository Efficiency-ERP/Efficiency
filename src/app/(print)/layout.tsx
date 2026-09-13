// Sits outside /dashboard on purpose: documents render without the sidebar,
// header or breadcrumbs, so what goes on paper is only the document itself.
// Auth still applies — src/proxy.ts gates every non-static path.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-100 py-6 print:bg-white print:py-0">
      {children}
    </div>
  )
}
