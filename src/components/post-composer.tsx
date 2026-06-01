"use client";

import { Calendar, ImagePlus, SendHorizonal } from "lucide-react";
import { useState } from "react";
import type { SocialAccount } from "@/modules/social/types";

export function PostComposer({
  accounts,
  organizationId
}: {
  accounts: SocialAccount[];
  organizationId: string | null;
}) {
  const [body, setBody] = useState(
    "Nuevo lanzamiento: descubre como optimizar tu calendario social con reportes claros."
  );
  const [scheduledFor, setScheduledFor] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  async function submitPost() {
    if (!organizationId) {
      setStatus("Crea un workspace antes de programar.");
      return;
    }

    if (selectedAccounts.length === 0) {
      setStatus("Selecciona al menos una cuenta conectada.");
      return;
    }

    const response = await fetch("/api/posts/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId,
        accountIds: selectedAccounts,
        body,
        mediaUrls: [],
        scheduledFor: scheduledFor
          ? new Date(scheduledFor).toISOString()
          : new Date(Date.now() + 60 * 60 * 1000).toISOString()
      })
    });

    setStatus(response.ok ? "Publicacion programada." : "No se pudo programar.");
  }

  function toggleAccount(accountId: string) {
    setSelectedAccounts((current) =>
      current.includes(accountId)
        ? current.filter((id) => id !== accountId)
        : [...current, accountId]
    );
  }

  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Crear publicacion</h2>
          <p className="text-sm text-muted">Redacta, selecciona cuentas y programa.</p>
        </div>
      </div>
      <textarea
        className="min-h-32 w-full resize-none rounded-md border border-line bg-panel p-3 text-sm outline-none ring-teal/20 transition focus:ring-4"
        maxLength={2200}
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{body.length}/2200</span>
        <span>{selectedAccounts.length} cuenta(s)</span>
      </div>
      <div className="mt-4 grid gap-3">
        <label className="text-sm font-medium">
          Fecha de programacion
          <input
            className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none ring-teal/20 focus:ring-4"
            type="datetime-local"
            value={scheduledFor}
            onChange={(event) => setScheduledFor(event.target.value)}
          />
        </label>
        <div className="grid gap-2">
          {accounts.length === 0 ? (
            <p className="rounded-md border border-dashed border-line bg-panel px-3 py-2 text-sm text-muted">
              Conecta Meta para seleccionar cuentas.
            </p>
          ) : null}
          {accounts.map((account) => (
            <label
              className="flex items-center gap-3 rounded-md border border-line px-3 py-2 text-sm"
              key={account.id}
            >
              <input
                checked={selectedAccounts.includes(account.id)}
                onChange={() => toggleAccount(account.id)}
                type="checkbox"
              />
              <span className="font-medium">{account.username}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold hover:bg-panel"
          type="button"
          title="Agregar media"
        >
          <ImagePlus size={16} />
          Media
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold hover:bg-panel"
          type="button"
          title="Programar fecha"
        >
          <Calendar size={16} />
          Programar
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-[#25313f]"
          onClick={submitPost}
          type="button"
          title="Enviar a programacion"
        >
          <SendHorizonal size={16} />
          Guardar
        </button>
      </div>
      {status ? <p className="mt-3 text-sm font-medium text-teal">{status}</p> : null}
    </section>
  );
}
