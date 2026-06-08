"use client";

import { MessageCircle, Reply, Trash2, RefreshCw, Loader } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { SocialAccount } from "@/modules/social/types";

type Comment = {
  id: string;
  comment_id: string;
  parent_id: string | null;
  message: string;
  from_name: string | null;
  created_time: string | null;
  is_hidden: boolean;
};

type AccountWithComments = SocialAccount & {
  comments: Comment[];
  loading: boolean;
};

export function InboxPanel({
  accounts,
  organizationId
}: {
  accounts: SocialAccount[];
  organizationId: string | null;
}) {
  const [accountData, setAccountData] = useState<AccountWithComments[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [replyState, setReplyState] = useState<Record<string, { message: string; sending: boolean }>>({});
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (accounts.length > 0 && accountData.length === 0) {
      setAccountData(
        accounts.map((a) => ({ ...a, comments: [], loading: false }))
      );
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, accountData.length]);

  const fetchComments = useCallback(async (accountId: string) => {
    setAccountData((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, loading: true } : a))
    );

    try {
      const response = await fetch(`/api/comments?accountId=${accountId}`);
      if (!response.ok) {
        const err = (await response.json()) as { error?: string };
        setStatus(err.error ?? "Error al cargar comentarios");
        return;
      }

      const data = (await response.json()) as { comments?: Comment[] };
      setAccountData((prev) =>
        prev.map((a) =>
          a.id === accountId
            ? { ...a, comments: data.comments ?? [], loading: false }
            : a
        )
      );
    } catch {
      setStatus("Error de red al cargar comentarios");
    }
  }, []);

  const selected = accountData.find((a) => a.id === selectedAccountId);

  const loadComments = useCallback(() => {
    if (selectedAccountId) {
      fetchComments(selectedAccountId);
    }
  }, [selectedAccountId, fetchComments]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchComments(selectedAccountId);
    }
  }, [selectedAccountId, fetchComments]);

  async function handleReply(commentId: string) {
    const reply = replyState[commentId];
    if (!reply?.message.trim() || !selectedAccountId || !organizationId) return;

    setReplyState((prev) => ({
      ...prev,
      [commentId]: { ...prev[commentId], sending: true }
    }));

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentId,
          message: reply.message,
          accountId: selectedAccountId
        })
      });

      if (response.ok) {
        setReplyState((prev) => ({
          ...prev,
          [commentId]: { message: "", sending: false }
        }));
        setStatus("Respuesta enviada");
        fetchComments(selectedAccountId);
      } else {
        const err = (await response.json()) as { error?: string };
        setStatus(err.error ?? "Error al responder");
        setReplyState((prev) => ({
          ...prev,
          [commentId]: { ...prev[commentId], sending: false }
        }));
      }
    } catch {
      setStatus("Error de red al responder");
    }
  }

  async function handleDelete(commentId: string) {
    if (!selectedAccountId) return;

    try {
      const response = await fetch(
        `/api/comments?commentId=${commentId}&accountId=${selectedAccountId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setStatus("Comentario eliminado");
        setAccountData((prev) =>
          prev.map((a) =>
            a.id === selectedAccountId
              ? { ...a, comments: a.comments.filter((c) => c.comment_id !== commentId) }
              : a
          )
        );
      } else {
        const err = (await response.json()) as { error?: string };
        setStatus(err.error ?? "Error al eliminar");
      }
    } catch {
      setStatus("Error de red al eliminar");
    }
  }

  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Inbox</h2>
          <p className="text-sm text-muted">Comentarios de tus paginas</p>
        </div>
        <button
          type="button"
          onClick={loadComments}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold hover:bg-panel"
        >
          <RefreshCw size={15} />
          Recargar
        </button>
      </div>

      {accounts.length === 0 ? (
        <p className="rounded-md border border-dashed border-line bg-panel p-4 text-sm text-muted">
          Conecta Meta para ver comentarios.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {accounts.filter(a => a.accountType === "facebook_page").map((account) => (
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
                <MessageCircle size={14} />
                {account.username}
              </button>
            ))}
          </div>

          {selected?.loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader size={20} className="animate-spin text-muted" />
            </div>
          ) : selected?.comments.length === 0 ? (
            <p className="rounded-md border border-dashed border-line bg-panel p-4 text-sm text-muted">
              No hay comentarios en esta pagina.
            </p>
          ) : (
            <div className="space-y-4">
              {selected?.comments
                .filter((c) => !c.parent_id)
                .map((comment) => (
                  <div key={comment.comment_id} className="rounded-md border border-line p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {comment.from_name ?? "Anonimo"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(comment.comment_id)}
                          className="rounded p-1 text-muted hover:bg-coral/10 hover:text-coral"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-ink">{comment.message}</p>
                    <p className="mt-1 text-xs text-muted">
                      {comment.created_time
                        ? new Date(comment.created_time).toLocaleString("es-PE")
                        : ""}
                    </p>

                    <div className="mt-3 flex gap-2">
                      <input
                        className="h-9 flex-1 rounded-md border border-line bg-white px-3 text-sm outline-none ring-teal/20 focus:ring-4"
                        type="text"
                        placeholder="Escribe una respuesta..."
                        value={replyState[comment.comment_id]?.message ?? ""}
                        onChange={(e) =>
                          setReplyState((prev) => ({
                            ...prev,
                            [comment.comment_id]: {
                              message: e.target.value,
                              sending: prev[comment.comment_id]?.sending ?? false
                            }
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleReply(comment.comment_id);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleReply(comment.comment_id)}
                        disabled={replyState[comment.comment_id]?.sending}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-ink px-3 text-sm font-semibold text-white hover:bg-[#25313f] disabled:opacity-60"
                      >
                        <Reply size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {status ? (
        <p className="mt-3 text-sm font-medium text-teal">{status}</p>
      ) : null}
    </section>
  );
}
