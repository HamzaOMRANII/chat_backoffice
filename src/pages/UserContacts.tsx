import { useState } from "react";
import { Notice, SmallButton, Table } from "../components/ui";
import { api } from "../lib/api";
import { ago, dateTime } from "../lib/format";
import type { Category, FriendshipRow } from "../app/types";

const VIA = { id: "ID request", invite: "invite code" };

/** A user's contacts: which shared category's rules apply to each pair, and ending a contact. */
export function ContactsTable({
  rows,
  categories,
  onChanged,
}: {
  rows: FriendshipRow[];
  categories: Category[];
  onChanged: (message: string) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [ending, setEnding] = useState<string | null>(null);
  const name = (id: string) => categories.find((c) => c.id === id)?.name ?? "?";
  const ordered = (ids: string[]) => categories.filter((c) => ids.includes(c.id));

  async function run(fn: () => Promise<unknown>, message: string) {
    setError("");
    try {
      await fn();
      await onChanged(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const paused = rows.filter((r) => r.paused);
  return (
    <>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Table head={["Contact", "Category used", "Since", "Added with", "Last seen", ""]} minWidth={820}>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={6} className="text-dim">
              No contacts yet.
            </td>
          </tr>
        ) : null}
        {rows.map((r) => (
          <tr key={r.id}>
            <td>
              <a href={`#/users/${r.user.id}`} className="font-bold text-ink">
                {r.user.username}
              </a>
            </td>
            <td>
              {r.sharedCategoryIds.length === 0 ? (
                <span className="text-keep">no shared category</span>
              ) : r.sharedCategoryIds.length === 1 ? (
                name(r.sharedCategoryIds[0]!)
              ) : (
                <label>
                  <span className="sr-only">Category for {r.user.username}</span>
                  <select
                    value={r.categoryId ?? ""}
                    onChange={(e) =>
                      run(() => api(`/friendships/${r.id}/category`, { method: "PUT", body: { categoryId: e.target.value } }), "Category changed.")
                    }
                    className={`min-h-[38px] rounded-[10px] border bg-bg px-2 text-[13px] text-ink ${r.categoryChosen ? "border-accent" : "border-line-strong"}`}
                  >
                    {ordered(r.sharedCategoryIds).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {r.user.status !== "approved" ? (
                <span className="block font-mono text-[11px] text-keep">
                  {r.user.username} is {r.user.status}
                </span>
              ) : null}
            </td>
            <td className="font-mono text-xs text-ink-soft">{dateTime(r.acceptedAt ?? r.createdAt)}</td>
            <td className="text-ink-soft">{VIA[r.via]}</td>
            <td className={`font-mono text-xs ${r.user.online ? "text-ok" : "text-dim"}`}>
              {r.user.online ? "online" : r.user.lastSeenAt ? ago(r.user.lastSeenAt) : "—"}
            </td>
            <td className="whitespace-nowrap text-right">
              {ending === r.id ? (
                <span className="inline-flex gap-1.5">
                  <SmallButton
                    tone="danger"
                    onClick={() => run(() => api(`/friendships/${r.id}`, { method: "DELETE" }), `Contact with ${r.user.username} ended.`)}
                  >
                    Confirm end
                  </SmallButton>
                  <SmallButton onClick={() => setEnding(null)}>Cancel</SmallButton>
                </span>
              ) : (
                <SmallButton tone="danger" onClick={() => setEnding(r.id)}>
                  End
                </SmallButton>
              )}
            </td>
          </tr>
        ))}
      </Table>
      {paused.length ? (
        <Notice tone="warning">
          {paused.map((r) => r.user.username).join(", ")} {paused.length === 1 ? "is" : "are"} paused: hidden from both sides, no new chats. Give the pair a
          shared category (or reactivate the account) to restore it, or end it.
        </Notice>
      ) : null}
      <p className="m-0 text-[12.5px] leading-relaxed text-dim">
        The category used decides the chat rules for this pair (modes, files, calls). When both share several, the first one in the Categories order is used;
        change it here.
      </p>
    </>
  );
}

export function RequestsTable({ rows }: { rows: FriendshipRow[] }) {
  return (
    <Table head={["With", "Direction", "Sent", "Status"]} minWidth={560}>
      {rows.length === 0 ? (
        <tr>
          <td colSpan={4} className="text-dim">
            No open requests.
          </td>
        </tr>
      ) : null}
      {rows.map((r) => (
        <tr key={r.id}>
          <td>
            <a href={`#/users/${r.user.id}`} className="font-bold text-ink">
              {r.user.username}
            </a>
          </td>
          <td className="text-ink-soft">{r.direction === "sent" ? "sent by this user" : "received"}</td>
          <td className="font-mono text-xs text-ink-soft">{dateTime(r.createdAt)}</td>
          <td className={r.paused ? "text-keep" : "text-dim"}>{r.paused ? "hidden: no shared category" : "waiting"}</td>
        </tr>
      ))}
    </Table>
  );
}
