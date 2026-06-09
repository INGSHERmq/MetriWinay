"use client";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-panel px-4">
      <section className="w-full max-w-md rounded-md border border-line bg-white p-6 shadow-soft text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-red-50 text-red-500">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold mb-2">Algo salio mal</h1>
        <p className="text-sm text-muted mb-6">
          {error.message || "Ocurrio un error inesperado."}
        </p>
        <button
          onClick={reset}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white hover:opacity-90"
        >
          Intentar de nuevo
        </button>
      </section>
    </main>
  );
}
