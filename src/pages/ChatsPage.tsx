import { useCallback, useEffect, useState } from "react";
import { Notice, SmallButton, Table } from "../components/ui";
import { api } from "../lib/api";
import { ago, bytes, dateTime, END_REASONS, modeLabel, modeTone } from "../lib/format";
import type { ChatRow, MessageMeta } from "../app/types";

type Status = ChatRow["status"];
const TABS: [Status, string][] = [
  ["active", "Active"],
  ["invited", "Invited"],
  ["ended", "Ended · 30 days"],
];

export function ModeBadge({ chat }: { chat: Pick<ChatRow, "mode" | "retentionMinutes" | "status"> }) {
  return (
    <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[10.5px] font-bold ${modeTone(chat.mode)} ${chat.status === "invited" ? "border-dashed" : ""}`}>
      {modeLabel(chat)}
    </span>
  );
}

/** All chats, metadata only: message content is end-to-end encrypted and never reaches this page. */
export function ChatsPage() {
  const [status, setStatus] = useState<Status>("active");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ChatRow[] | null>(null);
  const [counts, setCounts] = useState<Record<Status, number> | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status, ...(search.trim() ? { search: search.trim() } : {}) });
      const res = await api<{ chats: ChatRow[]; counts: Record<Status, number> }>(`/chats?${params}`);
      setRows(res.chats);
      setCounts(res.counts);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load chats");
    }
  }, [status, search]);
  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex grow flex-col gap-1">
          <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">Chats</h1>
          <p className="m-0 font-mono text-[11.5px] text-faint">metadata only · message content is end-to-end encrypted and never visible here</p>
        </div>
        <label className="flex flex-[0_1_280px]">
          <span className="sr-only">Search chats</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a username"
            className="min-h-[42px] w-full rounded-field border border-line-strong bg-panel px-3.5 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
      </div>

      <div role="tablist" aria-label="Chat status" className="flex flex-wrap gap-1.5">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={status === id}
            onClick={() => {
              setStatus(id);
              setSelected(null);
            }}
            className={`min-h-[38px] rounded-full border px-3.5 text-[13.5px] ${status === id ? "border-accent bg-accent/15 font-bold text-ink" : "border-line-strong bg-transparent font-semibold text-dim"}`}
          >
            {label}
            {counts && id !== "ended" ? ` · ${counts[id]}` : ""}
          </button>
        ))}
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="min-w-0 flex-[999_1_480px]">
          <ChatTable rows={rows} selected={selected} onSelect={setSelected} empty={search ? "No chat matches this search." : `No ${status} chats.`} />
        </div>
        {selected ? <ChatDetails key={selected} id={selected} onDeleted={() => (setSelected(null), void load())} /> : null}
      </div>
    </>
  );
}

export function ChatTable({ rows, selected, onSelect, empty }: { rows: ChatRow[] | null; selected?: string | null; onSelect: (id: string) => void; empty: string }) {
  return (
    <Table head={["Between", "Mode", "Category", "Started", "Last message", "Stored"]} minWidth={700}>
      {rows?.length === 0 ? (
        <tr>
          <td colSpan={6} className="text-dim">{empty}</td>
        </tr>
      ) : null}
      {rows?.map((c) => (
        <tr
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`cursor-pointer hover:bg-raised ${selected === c.id ? "bg-raised shadow-[inset_3px_0_0_var(--color-accent)]" : ""}`}
        >
          <td>
            <button type="button" className="bg-transparent p-0 text-left font-bold text-ink">
              {c.label}
            </button>
            {c.status === "ended" ? <div className="text-xs text-dim">{END_REASONS[c.endReason ?? ""] ?? c.endReason}</div> : null}
          </td>
          <td>
            <ModeBadge chat={c} />
          </td>
          <td className="text-ink-soft">{c.category ?? "—"}</td>
          <td className="font-mono text-xs text-ink-soft">{dateTime(c.acceptedAt ?? c.invitedAt)}</td>
          <td className="font-mono text-xs text-ink-soft">{c.lastMessageAt ? ago(c.lastMessageAt) : "—"}</td>
          <td className="font-mono text-xs">{c.status === "ended" ? `${c.messagesSent} sent` : `${c.stored.count} · ${bytes(c.stored.bytes)}`}</td>
        </tr>
      ))}
    </Table>
  );
}

const receipt = (m: MessageMeta) => (m.readAt ? "✓✓" : m.deliveredAt ? "✓" : "·");

export function ChatDetails({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [data, setData] = useState<{ chat: ChatRow; messages: MessageMeta[] } | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    api<{ chat: ChatRow; messages: MessageMeta[] }>(`/chats/${id}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load this chat"));
  }, [id]);

  async function remove() {
    try {
      await api(`/chats/${id}`, { method: "DELETE", body: { confirm: confirmText } });
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete");
    }
  }

  if (!data) return error ? <Notice tone="error">{error}</Notice> : null;
  const { chat, messages } = data;
  return (
    <aside aria-label={`Chat ${chat.label}`} className="flex flex-[1_1_340px] flex-col gap-3.5 rounded-[18px] border border-line-strong bg-panel p-5">
      <div className="flex flex-col gap-1">
        <p className="eyebrow m-0">chat</p>
        <h2 className="m-0 text-xl font-extrabold">{chat.label}</h2>
        <p className="m-0 font-mono text-xs leading-relaxed text-dim">
          started by {chat.startedBy ?? "?"} · {chat.acceptedAt ? `accepted ${dateTime(chat.acceptedAt)}` : `invited ${dateTime(chat.invitedAt)}`}
          {chat.category ? ` · ${chat.category} rules` : ""}
          {chat.endedAt ? ` · ended ${dateTime(chat.endedAt)} (${END_REASONS[chat.endReason ?? ""] ?? chat.endReason}${chat.endedBy ? `, ${chat.endedBy}` : ""})` : ""}
        </p>
      </div>
      {chat.status !== "ended" ? (
        <>
          <p className="eyebrow m-0">last messages (no content)</p>
          <div className="flex flex-col rounded-xl border border-line font-mono text-[11.5px]">
            {messages.length === 0 ? <p className="m-0 px-3 py-2.5 text-dim">No stored messages.</p> : null}
            {messages.map((m, i) => (
              <div key={m.id} className={`grid grid-cols-[1fr_auto_auto] gap-2.5 px-3 py-2 text-ink-soft ${i ? "border-t border-line" : ""}`}>
                <span className="truncate">
                  {m.from} → {m.to}
                </span>
                <span>{bytes(m.size)}</span>
                <span className={m.readAt ? "text-accent-soft" : "text-dim"}>
                  {new Date(m.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {receipt(m)}
                </span>
              </div>
            ))}
          </div>
          <p className="m-0 font-mono text-[11.5px] text-dim">
            {chat.stored.count} message{chat.stored.count === 1 ? "" : "s"} stored
            {chat.stored.nextExpiry ? ` · next deleted ${dateTime(chat.stored.nextExpiry)}` : ""}
          </p>
          {error ? <Notice tone="error">{error}</Notice> : null}
          {confirming ? (
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1.5 text-[12.5px] text-dim">
                Type “{chat.label}” to confirm
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="min-h-[42px] rounded-field border border-danger bg-bg px-3 font-mono text-ink outline-none"
                />
              </label>
              <div className="flex gap-2">
                <SmallButton tone="danger" disabled={confirmText !== chat.label} onClick={remove}>
                  Delete chat history
                </SmallButton>
                <SmallButton onClick={() => setConfirming(false)}>Cancel</SmallButton>
              </div>
            </div>
          ) : (
            <SmallButton tone="danger" onClick={() => setConfirming(true)}>
              Delete chat history
            </SmallButton>
          )}
          <p className="m-0 text-xs leading-normal text-faint">Deletes every stored message and ends the chat for both. Logged in the activity log.</p>
        </>
      ) : (
        <p className="m-0 text-sm text-dim">Ended: its messages and keys were deleted. This record disappears 30 days after the end.</p>
      )}
    </aside>
  );
}
