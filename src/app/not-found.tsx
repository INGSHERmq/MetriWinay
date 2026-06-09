import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-panel px-4">
      <section className="w-full max-w-md rounded-md border border-line bg-white p-6 shadow-soft text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-amber-50 text-amber-500">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold mb-2">Pagina no encontrada</h1>
        <p className="text-sm text-muted mb-6">
          La pagina que buscas no existe o fue movida.
        </p>
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white hover:opacity-90"
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
