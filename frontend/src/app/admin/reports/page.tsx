"use client";
import { useEffect, useState } from "react";
import Card from "../../../components/Card";
import { api, type AdminItem, type AdminQueue } from "../../../lib/api";

type View = "pending" | "hidden";

const REASON_LABEL: Record<string, string> = {
  harassment: "Harassment",
  medical_misinformation: "Medical misinformation",
  self_harm_concern: "Self-harm concern",
  spam: "Spam",
  other: "Other",
};

export default function ReportsAdmin() {
  const [view, setView] = useState<View>("pending");
  const [state, setState] = useState<{
    view: View;
    items: AdminItem[];
    error: "forbidden" | "failed" | null;
  } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<AdminQueue>(`/api/admin/reports?view=${view}`)
      .then((d) => {
        if (!cancelled) setState({ view, items: d.items, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            view,
            items: [],
            error:
              err instanceof Error && err.message.startsWith("API 403")
                ? "forbidden"
                : "failed",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [view]);

  const loading = state?.view !== view;
  const keyOf = (i: AdminItem) => `${i.kind}-${i.id}`;

  async function resolve(item: AdminItem, action: "hide" | "restore") {
    setBusyKey(keyOf(item));
    try {
      await api(`/api/admin/items/${item.kind}/${item.id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      // Either way the item leaves this list (resolved, or no longer hidden)
      setState((s) =>
        s
          ? { ...s, items: s.items.filter((i) => keyOf(i) !== keyOf(item)) }
          : s,
      );
    } catch {
      window.alert("Couldn't do that. Please try again.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#4F4F4F]">Moderation</h1>
        <p className="text-sm text-gray-500">
          Moderators see the real author of anonymous items. Handle that with
          care.
        </p>
      </div>

      <div className="flex gap-2" role="tablist">
        {(["pending", "hidden"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              view === v
                ? "bg-[#B19CD9] text-white"
                : "bg-[#EEDDFF] text-[#4F4F4F] hover:opacity-80"
            }`}
          >
            {v === "pending" ? "Needs review" : "Hidden"}
          </button>
        ))}
      </div>

      <div className={`space-y-4 ${loading ? "opacity-50" : ""}`}>
        {state?.error === "forbidden" && (
          <Card>
            <p className="text-sm text-red-500">
              This page is for FemVita moderators only.
            </p>
          </Card>
        )}
        {state?.error === "failed" && (
          <Card>
            <p className="text-sm text-red-500">
              Couldn&apos;t load the list. Is the backend running?
            </p>
          </Card>
        )}
        {state && !state.error && state.items.length === 0 && !loading && (
          <Card>
            <p className="text-sm text-gray-500">
              {view === "pending"
                ? "Nothing to review right now."
                : "Nothing is hidden."}
            </p>
          </Card>
        )}

        {state?.items.map((item) => (
          <Card key={keyOf(item)}>
            {item.self_harm && (
              <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                Self-harm concern reported. Review this first.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-[#EEDDFF] px-2.5 py-0.5 text-[#4F4F4F]">
                {item.kind === "post"
                  ? "Post"
                  : `Reply on post #${item.post_id}`}
              </span>
              {item.is_hidden && (
                <span className="rounded-full bg-[#FFDAC1] px-2.5 py-0.5 text-[#4F4F4F]">
                  Hidden
                </span>
              )}
              <span>
                by{" "}
                <span className="font-medium text-[#4F4F4F]">
                  {item.author}
                </span>
                {item.anonymous && " (posted anonymously)"}
              </span>
            </div>

            {item.title && (
              <h2 className="mt-2 font-semibold text-[#4F4F4F]">
                {item.title}
              </h2>
            )}
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">
              {item.body}
            </p>

            {item.report_count > 0 && (
              <div className="mt-3 text-sm text-[#4F4F4F]">
                <p className="font-medium">
                  {item.report_count} report{item.report_count === 1 ? "" : "s"}
                  :{" "}
                  <span className="font-normal">
                    {Object.entries(item.reasons)
                      .map(([r, n]) => `${REASON_LABEL[r] ?? r} × ${n}`)
                      .join(", ")}
                  </span>
                </p>
                {item.notes.length > 0 && (
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-gray-600">
                    {item.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {view === "pending" ? (
                <>
                  <button
                    disabled={busyKey === keyOf(item)}
                    onClick={() => resolve(item, "restore")}
                    className="rounded-full border border-gray-300 px-5 py-2 text-sm text-[#4F4F4F] hover:bg-gray-50 disabled:opacity-50"
                  >
                    Keep visible
                  </button>
                  <button
                    disabled={busyKey === keyOf(item) || item.is_hidden}
                    onClick={() => resolve(item, "hide")}
                    className="rounded-full bg-[#E57373] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {item.is_hidden ? "Already hidden" : "Hide"}
                  </button>
                </>
              ) : (
                <button
                  disabled={busyKey === keyOf(item)}
                  onClick={() => resolve(item, "restore")}
                  className="rounded-full bg-[#B19CD9] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  Restore
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
