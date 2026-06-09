export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-panel px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-teal border-t-transparent" />
        <p className="text-sm text-muted">Cargando...</p>
      </div>
    </main>
  );
}
