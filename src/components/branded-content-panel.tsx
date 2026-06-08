"use client";

import { DollarSign, RefreshCw, Sparkles, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { SocialAccount } from "@/modules/social/types";

type BrandedPost = {
  id: string;
  message?: string;
  created_time?: string;
  is_branded_content?: boolean;
  tags?: { id: string; name: string }[];
};

type Partner = {
  id: string;
  name: string;
  picture?: string;
};

export function BrandedContentPanel({
  accounts
}: {
  accounts: SocialAccount[];
}) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [posts, setPosts] = useState<BrandedPost[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [mediaUrl, setMediaUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const fbAccounts = accounts.filter((a) => a.accountType === "facebook_page");

  useEffect(() => {
    if (fbAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(fbAccounts[0].id);
    }
  }, [fbAccounts, selectedAccountId]);

  const fetchData = useCallback(async () => {
    if (!selectedAccountId) return;
    setLoading(true);

    try {
      const [postsRes, partnersRes] = await Promise.all([
        fetch(`/api/branded-content?accountId=${selectedAccountId}`),
        fetch(`/api/branded-content?accountId=${selectedAccountId}&action=partners`)
      ]);

      const postsData = postsRes.ok ? (await postsRes.json()) as { posts?: BrandedPost[] } : { posts: [] };
      const partnersData = partnersRes.ok ? (await partnersRes.json()) as { partners?: Partner[] } : { partners: [] };

      setPosts(postsData.posts ?? []);
      setPartners(partnersData.partners ?? []);
    } catch {
      setPosts([]);
      setPartners([]);
    }

    setLoading(false);
  }, [selectedAccountId]);

  useEffect(() => {
    if (selectedAccountId) fetchData();
  }, [selectedAccountId, fetchData]);

  async function createPost() {
    if (!selectedAccountId || !message) return;

    const response = await fetch("/api/branded-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: selectedAccountId,
        message,
        partnerIds: selectedPartners,
        mediaUrl: mediaUrl || undefined
      })
    });

    if (response.ok) {
      setStatus("Contenido patrocinado creado");
      setMessage("");
      setSelectedPartners([]);
      setMediaUrl("");
      fetchData();
    } else {
      const err = (await response.json()) as { error?: string };
      setStatus(err.error ?? "Error al crear");
    }
  }

  function togglePartner(partnerId: string) {
    setSelectedPartners((current) =>
      current.includes(partnerId)
        ? current.filter((id) => id !== partnerId)
        : [...current, partnerId]
    );
  }

  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Contenido patrocinado</h2>
          <p className="text-sm text-muted">Branded content y partnership ads</p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-sm font-semibold hover:bg-panel"
        >
          <RefreshCw size={14} />
          Recargar
        </button>
      </div>

      {fbAccounts.length === 0 ? (
        <p className="rounded-md border border-dashed border-line bg-panel p-4 text-sm text-muted">
          Conecta una pagina de Facebook para usar contenido patrocinado.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {fbAccounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => setSelectedAccountId(account.id)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition ${
                  selectedAccountId === account.id
                    ? "bg-ink text-white"
                    : "border border-line bg-white text-ink hover:bg-panel"
                }`}
              >
                <Users size={14} />
                {account.username}
              </button>
            ))}
          </div>

          <div className="mb-6 rounded-md border border-line bg-panel p-4">
            <h3 className="mb-3 text-sm font-semibold">Crear publicacion patrocinada</h3>
            <textarea
              className="mb-3 min-h-24 w-full resize-none rounded-md border border-line bg-white p-3 text-sm outline-none ring-teal/20 focus:ring-4"
              placeholder="Mensaje de la publicacion..."
              maxLength={2200}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <input
              className="mb-3 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none ring-teal/20 focus:ring-4"
              type="url"
              placeholder="URL de media (opcional)"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
            {partners.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-xs font-semibold text-muted">Socios comerciales (marca a los patrocinadores)</p>
                <div className="flex flex-wrap gap-2">
                  {partners.map((partner) => (
                    <button
                      key={partner.id}
                      type="button"
                      onClick={() => togglePartner(partner.id)}
                      className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition ${
                        selectedPartners.includes(partner.id)
                          ? "bg-coral text-white"
                          : "border border-line bg-white text-ink hover:bg-panel"
                      }`}
                    >
                      <Sparkles size={11} />
                      {partner.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={createPost}
              disabled={!message}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-coral px-3 text-sm font-semibold text-white hover:bg-coral/80 disabled:opacity-50"
            >
              <DollarSign size={14} />
              Publicar como patrocinado
            </button>
          </div>

          {loading ? (
            <p className="py-4 text-center text-sm text-muted">Cargando...</p>
          ) : posts.length === 0 ? (
            <p className="rounded-md border border-dashed border-line bg-panel p-4 text-sm text-muted">
              No hay contenido patrocinado en esta pagina.
            </p>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Publicaciones patrocinadas existentes</h3>
              {posts.map((post) => (
                <div key={post.id} className="rounded-md border border-line p-3">
                  <p className="text-sm">{post.message ?? "(sin texto)"}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                    {post.created_time && (
                      <span>{new Date(post.created_time).toLocaleDateString("es-PE")}</span>
                    )}
                    {post.tags && post.tags.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Users size={12} />
                        {post.tags.map((t) => t.name).join(", ")}
                      </span>
                    )}
                    <span className="rounded-md bg-coral/10 px-2 py-0.5 text-xs font-semibold text-coral">
                      Patrocinado
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {status && <p className="mt-3 text-sm font-medium text-teal">{status}</p>}
    </section>
  );
}
