import { useCallback, useEffect, useState } from "react";
import { Notice, SmallButton, Table, time, useSort } from "../components/ui";
import { api } from "../lib/api";
import {
  ago,
  bytes,
  dateTime,
  duration,
  END_REASONS,
  modeLabel,
  modeTone,
} from "../lib/format";
import type { Category, ChatRow, LiveRow, MessageMeta } from "../app/types";
import { LiveSessions } from "./LiveSessions";

type Status = ChatRow["status"] | "live" | "all";
const TABS: [Status, string][] = [
  ["all", "All"],
  ["active", "Active"],
  ["invited", "Invited"],
  ["ended", "Ended · 30 days"],
  ["live", "Live"],
];

export function ModeBadge({
  chat,
}: {
  chat: Pick<ChatRow, "mode" | "retentionMinutes" | "status">;
}) {
  return (
    <span
      className={`whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[10.5px] font-bold ${modeTone(chat.mode)} ${chat.status === "invited" ? "border-dashed" : ""}`}
    >
      {modeLabel(chat)}
    </span>
  );
}

/** All chats, metadata only: message content is end-to-end encrypted and never reaches this page. */
export function ChatsPage({ categories }: { categories: Category[] }) {
  const [status, setStatus] = useState<Status>("all");
  const [category, setCategory] = useState("");
  const [liveRows, setLiveRows] = useState<LiveRow[] | null>(null);
  const [liveSelected, setLiveSelected] = useState<string | null>(null);
  // Rows ticked for deletion: "chat:<id>" or "live:<id>"
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [purge, setPurge] = useState<"selected" | "all" | null>(null);
  const [purgeText, setPurgeText] = useState("");
  const [purgeNote, setPurgeNote] = useState("");
  const togglePick = (key: string) => setPicked((p) => (p.has(key) ? new Set([...p].filter((k) => k !== key)) : new Set(p).add(key)));
  const visibleKeys = () => [...(rows ?? []).map((r) => `chat:${r.id}`), ...(status === "all" ? (liveRows ?? []).map((r) => `live:${r.id}`) : [])];
  async function runPurge() {
    try {
      const ids = [...picked].filter((k) => k.startsWith("chat:")).map((k) => k.slice(5));
      const liveIds = [...picked].filter((k) => k.startsWith("live:")).map((k) => k.slice(5));
      const r = await api<{ chats: number; live: number; messages: number; bytes: number }>("/chats/purge", {
        body: purge === "all" ? { confirm: purgeText, all: category ? { category } : {} } : { confirm: purgeText, ids, liveIds },
      });
      setPurgeNote(`Deleted ${r.chats} chat${r.chats === 1 ? "" : "s"} and ${r.live} live chat${r.live === 1 ? "" : "s"} · ${r.messages} messages · ${bytes(r.bytes)} of files freed.`);
      setPicked(new Set());
      setPurge(null);
      setPurgeText("");
      setSelected(null);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete");
    }
  }
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ChatRow[] | null>(null);
  const [counts, setCounts] = useState<Record<
    ChatRow["status"],
    number
  > | null>(null);
  const [liveNow, setLiveNow] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (status === "live") return;
    try {
      const params = new URLSearchParams({
        status,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(category ? { category } : {}),
      });
      const [res, liveRes] = await Promise.all([
        api<{ chats: ChatRow[]; counts: Record<ChatRow["status"], number> }>(
          `/chats?${params}`,
        ),
        status === "all"
          ? api<{ live: LiveRow[]; now: number }>(
              `/live${category ? `?category=${category}` : ""}`,
            )
          : Promise.resolve(null),
      ]);
      setRows(res.chats);
      setCounts(res.counts);
      if (liveRes) {
        setLiveRows(liveRes.live);
        setLiveNow(liveRes.now);
      }
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load chats");
    }
  }, [status, search, category]);
  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex grow flex-col gap-1">
          <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">
            Chats
          </h1>
          <p className="m-0 font-mono text-[11.5px] text-faint">
            {status === "live"
              ? "live chats are never stored: only who, when and how long is shown"
              : "metadata only · message content is end-to-end encrypted and never visible here"}
          </p>
        </div>
        <label className="flex flex-[0_1_200px]">
          <span className="sr-only">Category</span>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSelected(null);
            }}
            className="min-h-[42px] w-full rounded-field border border-line-strong bg-panel px-3 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
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

      <div
        role="tablist"
        aria-label="Chat status"
        className="flex flex-wrap gap-1.5"
      >
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
            className={`inline-flex min-h-[38px] items-center gap-2 rounded-full border px-3.5 text-[13.5px] ${
              status === id
                ? id === "live"
                  ? "border-live-line bg-live/10 font-bold text-ink"
                  : "border-accent bg-accent/15 font-bold text-ink"
                : "border-line-strong bg-transparent font-semibold text-dim"
            }`}
          >
            {id === "live" ? (
              <span
                className="size-[7px] rounded-full bg-live"
                aria-hidden="true"
              />
            ) : null}
            {label}
            {id === "live"
              ? liveNow !== null
                ? ` · ${liveNow} now`
                : ""
              : id === "all"
                ? ""
                : counts && id !== "ended"
                  ? ` · ${counts[id]}`
                  : ""}
          </button>
        ))}
      </div>

      {status === "live" ? (
        <LiveSessions
          key={category}
          search={search}
          category={category}
          initialSelected={liveSelected}
          onCount={setLiveNow}
        />
      ) : null}
      {error && status !== "live" ? (
        <Notice tone="error">{error}</Notice>
      ) : null}

      {status !== "live" ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-panel px-4 py-3">
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              checked={visibleKeys().length > 0 && visibleKeys().every((k) => picked.has(k))}
              onChange={(e) => setPicked(e.target.checked ? new Set(visibleKeys()) : new Set())}
              className="size-4 accent-[#C7707E]"
            />
            Select all shown
          </label>
          <span className="grow font-mono text-[11.5px] text-dim">{picked.size ? `${picked.size} selected` : "tick chats to delete them for good"}</span>
          <SmallButton tone="danger" disabled={!picked.size} onClick={() => setPurge("selected")}>
            Delete selected
          </SmallButton>
          <SmallButton tone="danger" onClick={() => setPurge("all")}>
            {category ? "Delete all chats of this category" : "Delete all chats"}
          </SmallButton>
        </div>
      ) : null}
      {purge ? (
        <div role="alertdialog" aria-label="Delete chats" className="flex flex-col gap-2.5 rounded-2xl border border-dashed border-danger bg-danger/[0.05] p-4">
          <p className="m-0 text-sm leading-relaxed text-ink-soft">
            {purge === "all" ? (
              <>
                Delete <strong className="text-ink">every chat{category ? " of this category" : ""}</strong>, stored and live, with all their messages, files and exports?
              </>
            ) : (
              <>
                Delete the <strong className="text-ink">{picked.size} selected</strong> chat{picked.size === 1 ? "" : "s"}, with all their messages, files and exports?
              </>
            )}{" "}
            Open chats end at once for both people. Nothing can be recovered. Logged in the activity log.
          </p>
          <label className="flex flex-col gap-1.5 text-[12.5px] text-dim">
            Type DELETE to confirm
            <input value={purgeText} onChange={(e) => setPurgeText(e.target.value)} className="min-h-[42px] max-w-[260px] rounded-field border border-danger bg-bg px-3 font-mono text-ink outline-none" />
          </label>
          <div className="flex gap-2">
            <SmallButton tone="danger" disabled={purgeText !== "DELETE"} onClick={() => void runPurge()}>
              Delete for good
            </SmallButton>
            <SmallButton
              onClick={() => {
                setPurge(null);
                setPurgeText("");
              }}
            >
              Cancel
            </SmallButton>
          </div>
        </div>
      ) : null}
      {purgeNote ? <Notice tone="ok">{purgeNote}</Notice> : null}

      {status !== "live" ? (
        <div className="flex flex-wrap items-start gap-[18px]">
          <div className="min-w-0 flex-[999_1_480px]">
            {status === "all" ? (
              <AllTable
                rows={rows}
                live={
                  liveRows?.filter(
                    (r) =>
                      !search.trim() ||
                      r.label
                        .toLowerCase()
                        .includes(search.trim().toLowerCase()),
                  ) ?? null
                }
                selected={selected}
                onSelect={setSelected}
                onSelectLive={(id) => {
                  setLiveSelected(id);
                  setStatus("live");
                }}
                picked={picked}
                onPick={togglePick}
              />
            ) : (
              <ChatTable
                rows={rows}
                selected={selected}
                onSelect={setSelected}
                picked={picked}
                onPick={togglePick}
                empty={
                  search
                    ? "No chat matches this search."
                    : `No ${status} chats.`
                }
              />
            )}
          </div>
          {selected ? (
            <ChatDetails
              key={selected}
              id={selected}
              onDeleted={() => (setSelected(null), void load())}
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

const STATUS_TEXT: Record<string, [string, string]> = {
  active: ["active", "text-online"],
  invited: ["invited", "text-keep"],
  ended: ["ended", "text-faint"],
};

/** Every chat in one list: stored ones (Keep-alive, Automatic) and live ones, newest first. */
function AllTable({
  rows,
  live,
  selected,
  onSelect,
  onSelectLive,
  picked,
  onPick,
}: {
  rows: ChatRow[] | null;
  live: LiveRow[] | null;
  selected: string | null;
  onSelect: (id: string) => void;
  onSelectLive: (id: string) => void;
  picked?: Set<string>;
  onPick?: (key: string) => void;
}) {
  type Item =
    | { kind: "chat"; at: string; row: ChatRow }
    | { kind: "live"; at: string; row: LiveRow };
  const items: Item[] | null =
    rows && live
      ? [
          ...rows.map((row): Item => ({
            kind: "chat",
            at: row.lastMessageAt ?? row.acceptedAt ?? row.invitedAt,
            row,
          })),
          ...live.map((row): Item => ({
            kind: "live",
            at: row.endedAt ?? row.startedAt ?? row.invitedAt,
            row,
          })),
        ].sort((a, b) => (a.at < b.at ? 1 : -1))
      : null;
  const started = (item: Item) => time(item.kind === "chat" ? (item.row.acceptedAt ?? item.row.invitedAt) : (item.row.startedAt ?? item.row.invitedAt));
  const { sorted, sort } = useSort(items, [
    null,
    (i) => i.row.label,
    (i) => (i.kind === "live" ? "live" : i.row.mode),
    (i) => (i.kind === "live" && i.row.status === "active" ? "live now" : i.row.status),
    (i) => i.row.category,
    started,
    (i) => time(i.at),
  ]);
  return (
    <Table
      head={["", "Between", "Type", "Status", "Category", "Started", "Activity"]}
      minWidth={760}
      sort={sort}
    >
      {items?.length === 0 ? (
        <tr>
          <td colSpan={7} className="text-dim">
            No chats.
          </td>
        </tr>
      ) : null}
      {sorted?.map((item) => {
        const r = item.row;
        const [statusText, tone] =
          r.status === "active" && item.kind === "live"
            ? ["live now", "text-live"]
            : STATUS_TEXT[r.status]!;
        return (
          <tr
            key={`${item.kind}:${r.id}`}
            onClick={() =>
              item.kind === "chat" ? onSelect(r.id) : onSelectLive(r.id)
            }
            className={`cursor-pointer hover:bg-raised ${selected === r.id ? "bg-raised shadow-[inset_3px_0_0_var(--color-accent)]" : ""}`}
          >
            <td onClick={(e) => e.stopPropagation()} className="w-10">
              <input
                type="checkbox"
                aria-label={`Select ${r.label}`}
                checked={picked?.has(`${item.kind}:${r.id}`) ?? false}
                onChange={() => onPick?.(`${item.kind}:${r.id}`)}
                className="size-4 accent-[#C7707E]"
              />
            </td>
            <td>
              <button
                type="button"
                className="bg-transparent p-0 text-left font-bold text-ink"
              >
                {r.label}
              </button>
              {r.status === "ended" ? (
                <div className="text-xs text-dim">
                  {END_REASONS[r.endReason ?? ""] ?? r.endReason}
                </div>
              ) : null}
            </td>
            <td>
              {item.kind === "chat" ? (
                <ModeBadge chat={item.row} />
              ) : (
                <span
                  className={`whitespace-nowrap rounded-full border border-live-line px-2 py-0.5 font-mono text-[10.5px] font-bold text-live ${r.status === "invited" ? "border-dashed" : ""}`}
                >
                  LIVE
                </span>
              )}
            </td>
            <td className={`font-mono text-xs ${tone}`}>{statusText}</td>
            <td className="text-ink-soft">{r.category ?? "—"}</td>
            <td className="font-mono text-xs text-ink-soft">
              {dateTime(
                item.kind === "chat"
                  ? (item.row.acceptedAt ?? item.row.invitedAt)
                  : (item.row.startedAt ?? item.row.invitedAt),
              )}
            </td>
            <td className="font-mono text-xs text-ink-soft">
              {item.kind === "chat"
                ? item.row.lastMessageAt
                  ? `last message ${ago(item.row.lastMessageAt)}`
                  : "—"
                : item.row.startedAt
                  ? `${duration((item.row.endedAt ? Date.parse(item.row.endedAt) : Date.now()) - Date.parse(item.row.startedAt))} long`
                  : "—"}
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

export function ChatTable({
  rows,
  selected,
  onSelect,
  empty,
  picked,
  onPick,
}: {
  rows: ChatRow[] | null;
  selected?: string | null;
  onSelect: (id: string) => void;
  empty: string;
  picked?: Set<string>;
  onPick?: (key: string) => void;
}) {
  const { sorted, sort } = useSort(rows, [
    ...(onPick ? [null] : []),
    (c) => c.label,
    (c) => `${c.mode}-${String(c.retentionMinutes).padStart(6, "0")}`,
    (c) => c.category,
    (c) => time(c.acceptedAt ?? c.invitedAt),
    (c) => time(c.lastMessageAt),
    (c) => (c.status === "ended" ? c.messagesSent : c.stored.bytes),
  ]);
  return (
    <Table
      sort={sort}
      head={[
        ...(onPick ? [""] : []),
        "Between",
        "Mode",
        "Category",
        "Started",
        "Last message",
        "Stored",
      ]}
      minWidth={700}
    >
      {rows?.length === 0 ? (
        <tr>
          <td colSpan={onPick ? 7 : 6} className="text-dim">
            {empty}
          </td>
        </tr>
      ) : null}
      {sorted?.map((c) => (
        <tr
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`cursor-pointer hover:bg-raised ${selected === c.id ? "bg-raised shadow-[inset_3px_0_0_var(--color-accent)]" : ""}`}
        >
          {onPick ? (
            <td onClick={(e) => e.stopPropagation()} className="w-10">
              <input
                type="checkbox"
                aria-label={`Select ${c.label}`}
                checked={picked?.has(`chat:${c.id}`) ?? false}
                onChange={() => onPick?.(`chat:${c.id}`)}
                className="size-4 accent-[#C7707E]"
              />
            </td>
          ) : null}
          <td>
            <button
              type="button"
              className="bg-transparent p-0 text-left font-bold text-ink"
            >
              {c.label}
            </button>
            {c.status === "ended" ? (
              <div className="text-xs text-dim">
                {END_REASONS[c.endReason ?? ""] ?? c.endReason}
              </div>
            ) : null}
          </td>
          <td>
            <ModeBadge chat={c} />
          </td>
          <td className="text-ink-soft">{c.category ?? "—"}</td>
          <td className="font-mono text-xs text-ink-soft">
            {dateTime(c.acceptedAt ?? c.invitedAt)}
          </td>
          <td className="font-mono text-xs text-ink-soft">
            {c.lastMessageAt ? ago(c.lastMessageAt) : "—"}
          </td>
          <td className="font-mono text-xs">
            {c.status === "ended"
              ? `${c.messagesSent} sent`
              : `${c.stored.count} · ${bytes(c.stored.bytes)}`}
          </td>
        </tr>
      ))}
    </Table>
  );
}

type ExportMeta = { id: string; by: string; approver: string; status: string; requestedAt: string; answeredAt: string | null; downloadedAt: string | null };
const EXPORT_STATUS: Record<string, string> = { pending: "waiting for an answer", approved: "approved", refused: "refused", expired: "expired without answer", cancelled: "cancelled" };

const receipt = (m: MessageMeta) =>
  m.readAt ? "✓✓" : m.deliveredAt ? "✓" : "·";

export function ChatDetails({
  id,
  onDeleted,
}: {
  id: string;
  onDeleted: () => void;
}) {
  const [data, setData] = useState<{
    chat: ChatRow;
    messages: MessageMeta[];
    exports?: ExportMeta[];
  } | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    api<{ chat: ChatRow; messages: MessageMeta[]; exports?: ExportMeta[] }>(`/chats/${id}`)
      .then(setData)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Couldn't load this chat",
        ),
      );
  }, [id]);

  async function remove() {
    try {
      await api(`/chats/${id}`, {
        method: "DELETE",
        body: { confirm: confirmText },
      });
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete");
    }
  }

  if (!data) return error ? <Notice tone="error">{error}</Notice> : null;
  const { chat, messages, exports = [] } = data;
  return (
    <aside
      aria-label={`Chat ${chat.label}`}
      className="flex flex-[1_1_340px] flex-col gap-3.5 rounded-[18px] border border-line-strong bg-panel p-5"
    >
      <div className="flex flex-col gap-1">
        <p className="eyebrow m-0">chat</p>
        <h2 className="m-0 text-xl font-extrabold">{chat.label}</h2>
        <p className="m-0 font-mono text-xs leading-relaxed text-dim">
          started by {chat.startedBy ?? "?"} ·{" "}
          {chat.acceptedAt
            ? `accepted ${dateTime(chat.acceptedAt)}`
            : `invited ${dateTime(chat.invitedAt)}`}
          {chat.category ? ` · ${chat.category} rules` : ""}
          {chat.endedAt
            ? ` · ended ${dateTime(chat.endedAt)} (${END_REASONS[chat.endReason ?? ""] ?? chat.endReason}${chat.endedBy ? `, ${chat.endedBy}` : ""})`
            : ""}
        </p>
      </div>
      {chat.status !== "ended" ? (
        <>
          <p className="eyebrow m-0">last messages (no content)</p>
          <div className="flex flex-col rounded-xl border border-line font-mono text-[11.5px]">
            {messages.length === 0 ? (
              <p className="m-0 px-3 py-2.5 text-dim">No stored messages.</p>
            ) : null}
            {messages.map((m, i) => (
              <div
                key={m.id}
                className={`grid grid-cols-[1fr_auto_auto] gap-2.5 px-3 py-2 text-ink-soft ${i ? "border-t border-line" : ""}`}
              >
                <span className="truncate">
                  {m.from} → {m.to}
                </span>
                <span>{bytes(m.size)}</span>
                <span className={m.readAt ? "text-accent-soft" : "text-dim"}>
                  {new Date(m.sentAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  {receipt(m)}
                </span>
              </div>
            ))}
          </div>
          <p className="m-0 font-mono text-[11.5px] text-dim">
            {chat.stored.count} message{chat.stored.count === 1 ? "" : "s"}{" "}
            stored
            {chat.stored.nextExpiry
              ? ` · next deleted ${dateTime(chat.stored.nextExpiry)}`
              : ""}
          </p>
          <p className="eyebrow m-0">exports</p>
          <div className="flex flex-col rounded-xl border border-line font-mono text-[11.5px]">
            {exports.length === 0 ? <p className="m-0 px-3 py-2.5 text-dim">No export asked.</p> : null}
            {exports.map((e, i) => (
              <div key={e.id} className={`grid grid-cols-[1fr_1.2fr_auto] gap-2.5 px-3 py-2 text-ink-soft ${i ? "border-t border-line" : ""}`}>
                <span className="truncate">
                  {e.by} → {e.approver}
                </span>
                <span className={e.status === "approved" ? "text-online" : e.status === "refused" ? "text-danger-ink" : "text-dim"}>
                  {EXPORT_STATUS[e.status] ?? e.status}
                  {e.downloadedAt ? ` · saved ${dateTime(e.downloadedAt)}` : ""}
                </span>
                <span className="text-dim">{dateTime(e.requestedAt)}</span>
              </div>
            ))}
          </div>
          <p className="m-0 text-xs leading-normal text-faint">The zip is built on the phone: its content never reaches the server.</p>
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
                <SmallButton
                  tone="danger"
                  disabled={confirmText !== chat.label}
                  onClick={remove}
                >
                  Delete chat history
                </SmallButton>
                <SmallButton onClick={() => setConfirming(false)}>
                  Cancel
                </SmallButton>
              </div>
            </div>
          ) : (
            <SmallButton tone="danger" onClick={() => setConfirming(true)}>
              Delete chat history
            </SmallButton>
          )}
          <p className="m-0 text-xs leading-normal text-faint">
            Deletes every stored message and ends the chat for both. Logged in
            the activity log.
          </p>
        </>
      ) : (
        <p className="m-0 text-sm text-dim">
          Ended: its messages and keys were deleted. This record disappears 30
          days after the end.
        </p>
      )}
    </aside>
  );
}
