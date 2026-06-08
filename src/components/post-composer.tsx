"use client";

import { ImagePlus, SendHorizonal, Film, Monitor, Clapperboard, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SocialAccount, PostType } from "@/modules/social/types";

const postTypeOptions: { value: PostType; label: string; icon: typeof Monitor }[] = [
  { value: "feed", label: "Feed", icon: Monitor },
  { value: "story", label: "Historia", icon: Film },
  { value: "reel", label: "Reel", icon: Clapperboard }
];

export function PostComposer({
  accounts,
  organizationId
}: {
  accounts: SocialAccount[];
  organizationId: string | null;
}) {
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState<PostType>("feed");
  const [scheduledFor, setScheduledFor] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaUrlInput, setMediaUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function submitPost() {
    if (!organizationId) {
      setStatus("Crea un workspace antes de programar.");
      return;
    }

    if (selectedAccounts.length === 0) {
      setStatus("Selecciona al menos una cuenta conectada.");
      return;
    }

    if ((postType === "story" || postType === "reel") && mediaUrls.length === 0) {
      setStatus(`${postType === "story" ? "Las historias" : "Los reels"} requieren al menos una imagen o video.`);
      return;
    }

    const response = await fetch("/api/posts/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId,
        accountIds: selectedAccounts,
        body,
        mediaUrls,
        postType,
        scheduledFor: scheduledFor
          ? new Date(scheduledFor).toISOString()
          : new Date(Date.now() + 60 * 60 * 1000).toISOString()
      })
    });

    if (response.ok) {
      setStatus("Publicacion programada.");
      setBody("");
      setMediaUrls([]);
      setSelectedAccounts([]);
      router.refresh();
    } else {
      setStatus("No se pudo programar.");
    }
  }

  function addMediaUrl() {
    const url = mediaUrlInput.trim();
    if (url && !mediaUrls.includes(url)) {
      setMediaUrls([...mediaUrls, url]);
      setMediaUrlInput("");
    }
  }

  function removeMediaUrl(url: string) {
    setMediaUrls(mediaUrls.filter((u) => u !== url));
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus("Subiendo archivo...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const data = (await response.json()) as { url: string };
        setMediaUrls([...mediaUrls, data.url]);
        setStatus("Archivo subido");
      } else {
        setStatus("Error al subir archivo");
      }
    } catch {
      setStatus("Error de red al subir");
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
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

      <div className="mb-4 flex gap-2">
        {postTypeOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPostType(opt.value)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition ${
              postType === opt.value
                ? "bg-ink text-white"
                : "border border-line bg-white text-ink hover:bg-panel"
            }`}
          >
            <opt.icon size={15} />
            {opt.label}
          </button>
        ))}
      </div>

      <textarea
        className="min-h-32 w-full resize-none rounded-md border border-line bg-panel p-3 text-sm outline-none ring-teal/20 transition focus:ring-4"
        maxLength={2200}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={postType === "story" ? "Texto opcional para la historia..." : "Escribe tu mensaje..."}
      />
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{body.length}/2200</span>
        <span>{selectedAccounts.length} cuenta(s)</span>
      </div>

      <div className="mt-4 grid gap-3">
        <div>
          <label className="text-sm font-medium">Media (imagen o video)</label>
          <div className="mt-2 flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold hover:bg-panel disabled:opacity-60"
            >
              <Upload size={16} />
              {uploading ? "Subiendo..." : "Subir archivo"}
            </button>
            <input
              className="h-10 flex-1 rounded-md border border-line bg-white px-3 text-sm outline-none ring-teal/20 focus:ring-4"
              type="url"
              placeholder="O pega una URL..."
              value={mediaUrlInput}
              onChange={(e) => setMediaUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMediaUrl(); } }}
            />
            <button
              type="button"
              onClick={addMediaUrl}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold hover:bg-panel"
            >
              <ImagePlus size={16} />
              Agregar URL
            </button>
          </div>
          {mediaUrls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {mediaUrls.map((url) => (
                <span
                  key={url}
                  className="inline-flex items-center gap-1.5 rounded-md bg-panel px-2.5 py-1 text-xs font-medium text-ink"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="size-5 rounded object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  {url.split("/").pop()?.slice(0, 20) ?? url}
                  <button
                    type="button"
                    onClick={() => removeMediaUrl(url)}
                    className="text-muted hover:text-coral"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

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
          <p className="text-sm font-medium">Cuentas destino</p>
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
              <span className="ml-auto text-xs text-muted">{account.accountType === "instagram_business" ? "IG" : "FB"}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-[#25313f]"
          onClick={submitPost}
          type="button"
          title="Enviar a programacion"
        >
          <SendHorizonal size={16} />
          Programar
        </button>
      </div>
      {status ? <p className="mt-3 text-sm font-medium text-teal">{status}</p> : null}
    </section>
  );
}
