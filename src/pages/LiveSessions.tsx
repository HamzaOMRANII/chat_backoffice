import { useCallback, useEffect, useState } from "react";
import { Notice, SmallButton, Table } from "../components/ui";
import { api } from "../lib/api";
import { dateTime, duration, END_REASONS } from "../lib/format";
import type { LiveRow } from "../app/types";

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Live chats: who, when and how long. What is typed only passes through the server, encrypted, and is never stored. */
export function LiveSessions({ search, category = "", initialSelected = null, onCount }: { search: string; category?: string; initialSelected?: string | null; onCount: (n: number) => void }) {
  const [rows, setRows] = useState<LiveRow[] | null>(null);
  const [selected, setSelected] = useState<string | null>(initialSelected);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try {
      const res = await api<{ live: LiveRow[]; now: number }>(`/live${category ? `?category=${category}` : ""}`);
      setRows(res.live);
      onCount(res.now);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load live chats");
    }
  }, [onCount, category]);
  useEffect(() => {
    void load();
    // Running durations tick; the list itself refreshes every 10 s
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const refresh = setInterval(() => void load(), 10_000);
    return () => (clearInterval(tick), clearInterval(refresh));
  }, [load]);

  async function end(id: string) {
    try {
      await api(`/live/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't end it");
    }
  }

  const q = search.trim().toLowerCase();
  const shown = rows?.filter((r) => !q || r.label.toLowerCase().includes(q)) ?? null;
  const current = rows?.find((r) => r.id === selected) ?? null;
  const length = (r: LiveRow) => (r.startedAt ? duration((r.endedAt ? new Date(r.endedAt).getTime() : now) - new Date(r.startedAt).getTime()) : null);

  return (
    <>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="min-w-0 flex-[999_1_480px]">
          <Table head={["Between", "Category", "Started", "Duration", "Ended"]} minWidth={700}>
            {shown?.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-dim">
                  {q ? "No live chat matches this search." : "No live chats in the last 30 days."}
                </td>
              </tr>
            ) : null}
            {shown?.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={`cursor-pointer hover:bg-raised ${selected === r.id ? "bg-raised shadow-[inset_3px_0_0_var(--color-live-line)]" : ""}`}
              >
                <td>
                  <button type="button" className="bg-transparent p-0 text-left font-bold text-ink">
                    {r.label}
                  </button>
                </td>
                <td className="text-ink-soft">{r.category ?? "—"}</td>
                <td className="font-mono text-xs text-ink-soft">{dateTime(r.startedAt ?? r.invitedAt)}</td>
                <td className={`font-mono text-xs ${r.status === "active" ? "text-live" : r.startedAt ? "" : "text-faint"}`}>
                  {r.status === "active" ? `${length(r)} · live now` : r.status === "invited" ? "invited" : (length(r) ?? "—")}
                </td>
                <td className="text-[13px] text-ink-soft">
                  {r.status === "ended" ? (r.endReason === "left" && r.endedBy ? `${r.endedBy} left` : (END_REASONS[r.endReason ?? ""] ?? r.endReason)) : "—"}
                </td>
              </tr>
            ))}
          </Table>
        </div>

        {current ? (
          <aside aria-label={`Live chat ${current.label}`} className="flex flex-[1_1_340px] flex-col gap-3.5 rounded-[18px] border border-line-strong bg-panel p-5">
            <div className="flex flex-col gap-1">
              <p className="eyebrow m-0">live chat</p>
              <h2 className="m-0 text-xl font-extrabold">{current.label}</h2>
              <p className="m-0 font-mono text-xs text-dim">
                started by {current.startedBy ?? "?"}
                {current.category ? ` · ${current.category} rules` : ""}
              </p>
            </div>
            <div className="flex flex-col rounded-xl border border-line font-mono text-[11.5px]">
              <div className="grid grid-cols-[1fr_auto] gap-2.5 px-3 py-2.5 text-ink-soft">
                <span>invited</span>
                <span className="text-dim">{time(current.invitedAt)}</span>
              </div>
              {current.startedAt ? (
                <div className="grid grid-cols-[1fr_auto] gap-2.5 border-t border-line px-3 py-2.5 text-ink-soft">
                  <span>accepted by {current.label.split(" + ").find((n) => n !== current.startedBy) ?? "?"}</span>
                  <span className="text-dim">{time(current.startedAt)}</span>
                </div>
              ) : null}
              {current.status === "active" ? (
                <div className="grid grid-cols-[1fr_auto] gap-2.5 border-t border-line px-3 py-2.5 text-live">
                  <span>both connected · live</span>
                  <span>{length(current)}</span>
                </div>
              ) : null}
              {current.endedAt ? (
                <div className="grid grid-cols-[1fr_auto] gap-2.5 border-t border-line px-3 py-2.5 text-ink-soft">
                  <span>ended · {END_REASONS[current.endReason ?? ""] ?? current.endReason}</span>
                  <span className="text-dim">{time(current.endedAt)}</span>
                </div>
              ) : null}
            </div>
            <p className="m-0 text-[12.5px] leading-normal text-dim">
              Nothing typed in a live chat reaches the database or the disk. It passes through the server encrypted and is only shown on the two phones.
            </p>
            {current.status !== "ended" ? (
              <>
                <SmallButton tone="danger" onClick={() => void end(current.id)}>
                  End this live chat
                </SmallButton>
                <p className="m-0 text-xs leading-normal text-faint">Ends it at once for both and wipes their screens. Logged in the activity log.</p>
              </>
            ) : null}
          </aside>
        ) : null}
      </div>
    </>
  );
}
