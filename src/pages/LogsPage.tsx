import { useCallback, useEffect, useState } from "react";
import { Notice, SmallButton, Table } from "../components/ui";
import { api } from "../lib/api";
import { dateTime } from "../lib/format";

type Log = { id: string; at: string; action: string; admin: string | null; target: string | null; details: Record<string, unknown> | null };

const ACTIONS: Record<string, string> = {
  "user.approved": "approved",
  "user.rejected": "rejected",
  "user.suspended": "suspended",
  "user.reactivated": "reactivated",
  "user.force_logout": "forced logout of",
  "user.unlocked": "unlocked",
  "user.reset_access": "created a reset code for",
  "user.categories_changed": "changed categories of",
  "user.deleted": "deleted",
  "category.created": "created category",
  "category.updated": "updated category",
  "category.reordered": "reordered categories",
  "category.deleted": "deleted category",
  "friendship.category_changed": "changed the category of contacts",
  "friendship.ended": "ended the contact",
  "chat.deleted": "deleted the chat history of",
  "user.chats_deleted": "deleted all chat history of",
  "live.ended": "ended a live chat",
  "storage.request": "asked to download their media:",
  "storage.request_cancelled": "cancelled the media request of",
  "storage.deleted": "deleted media",
  "storage.cleanup": "ran the storage cleanup",
  "chats.purged": "deleted chats for good",
  "group.created": "created a group",
  "group.updated": "changed a group",
  "group.approved": "approved a group asked by a user",
  "group.refused": "refused the group asked by",
  "group.deleted": "deleted a group",
  "settings.min_version": "set the minimum app version",
  "settings.backup": "downloaded a settings backup",
  "settings.restore": "restored a settings backup",
};

const detailText = (l: Log) => {
  const d = l.details ?? {};
  const bits = Object.entries(d)
    .filter(([k]) => !["username", "name", "pair"].includes(k))
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
  return bits.join(" · ");
};

/** Every backoffice action, kept 90 days: filter by action or admin, search a person or a name, load older. */
export function LogsPage() {
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [more, setMore] = useState(false);
  const [actions, setActions] = useState<string[]>([]);
  const [admins, setAdmins] = useState<string[]>([]);
  const [action, setAction] = useState("");
  const [admin, setAdmin] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  const query = (before?: string) =>
    new URLSearchParams({ ...(action ? { action } : {}), ...(admin ? { admin } : {}), ...(q.trim() ? { q: q.trim() } : {}), ...(before ? { before } : {}) }).toString();
  const load = useCallback(
    async (before?: string) => {
      try {
        const r = await api<{ logs: Log[]; more: boolean; actions: string[]; admins: string[] }>(`/logs?${query(before)}`);
        setLogs((list) => (before && list ? [...list, ...r.logs] : r.logs));
        setMore(r.more);
        setActions(r.actions);
        setAdmins(r.admins);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load the log");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action, admin, q],
  );
  useEffect(() => {
    const t = setTimeout(() => void load(), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  // Grouped choices: a whole family ("group.", "user.") or one action
  const families = [...new Set(actions.map((a) => a.split(".")[0] + "."))];
  const field = "min-h-[42px] rounded-field border border-line-strong bg-panel px-3 text-sm text-ink outline-none focus:border-accent";
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">Activity log</h1>
        <p className="m-0 text-[13.5px] text-dim">Every backoffice action, kept 90 days.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-[0_1_240px]">
          <span className="sr-only">Action</span>
          <select value={action} onChange={(e) => setAction(e.target.value)} className={`${field} w-full`}>
            <option value="">All actions</option>
            {families.map((f) => (
              <optgroup key={f} label={f.slice(0, -1)}>
                <option value={f}>all {f.slice(0, -1)} actions</option>
                {actions
                  .filter((a) => a.startsWith(f))
                  .map((a) => (
                    <option key={a} value={a}>
                      {ACTIONS[a] ?? a}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex flex-[0_1_180px]">
          <span className="sr-only">Admin</span>
          <select value={admin} onChange={(e) => setAdmin(e.target.value)} className={`${field} w-full`}>
            <option value="">All admins</option>
            {admins.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-[1_1_220px]">
          <span className="sr-only">Search the log</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a user, group or chat" className={`${field} w-full`} />
        </label>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Table head={["When", "Admin", "Action", "Details"]} minWidth={720}>
        {logs?.length === 0 ? (
          <tr>
            <td colSpan={4} className="text-dim">
              Nothing matches.
            </td>
          </tr>
        ) : null}
        {logs?.map((l) => (
          <tr key={l.id}>
            <td className="whitespace-nowrap font-mono text-xs text-dim">{dateTime(l.at)}</td>
            <td className="font-bold">{l.admin ?? "—"}</td>
            <td className="text-ink-soft">
              {ACTIONS[l.action] ?? l.action}{" "}
              <strong className="text-ink">{l.target ?? (l.details?.username as string | undefined) ?? (l.details?.name as string | undefined) ?? (l.details?.pair as string | undefined) ?? ""}</strong>
            </td>
            <td className="font-mono text-[11.5px] text-faint">{detailText(l)}</td>
          </tr>
        ))}
      </Table>
      {more && logs?.length ? (
        <SmallButton onClick={() => void load(logs[logs.length - 1]!.at)}>Load older</SmallButton>
      ) : null}
    </>
  );
}
