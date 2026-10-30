import { useCallback, useEffect, useMemo, useState } from "react";
import { Notice, SmallButton, Table, time, useSort } from "../components/ui";
import { api } from "../lib/api";
import { ago, modeLabel, modeTone } from "../lib/format";
import type { Category, UserRow } from "../app/types";

type GroupRow = {
  id: string;
  name: string;
  status: "pending" | "active";
  categoryId: string | null;
  category: string | null;
  mode: "keep" | "auto" | null;
  retentionMinutes: number | null;
  members: { id: string; username: string }[];
  requestedBy: string | null;
  createdAt: string;
  lastMessageAt: string | null;
  messageCount: number;
};

const MAX = 10;
const DURATIONS = [30, 60, 180, 360, 720, 1440, 2880, 4320, 5760, 7200, 8640, 10080];
const durationText = (m: number) => (m < 60 ? `${m} minutes` : m < 1440 ? `${m / 60} hour${m > 60 ? "s" : ""}` : `${m / 1440} day${m > 1440 ? "s" : ""}`);

/** Groups: made here, or asked by a user and approved here. Only the administrator sets rules and members. */
export function GroupsPage({ categories }: { categories: Category[] }) {
  const [groups, setGroups] = useState<GroupRow[] | null>(null);
  const [editing, setEditing] = useState<GroupRow | "new" | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      setGroups((await api<{ groups: GroupRow[] }>("/groups")).groups);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load groups");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const pending = groups?.filter((g) => g.status === "pending") ?? [];
  const active = groups?.filter((g) => g.status === "active") ?? null;
  const { sorted, sort } = useSort(active, [
    (g) => g.name,
    (g) => g.category,
    (g) => g.members.length,
    (g) => g.retentionMinutes,
    (g) => time(g.lastMessageAt),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex grow flex-col gap-1">
          <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">Groups</h1>
          <p className="m-0 font-mono text-[11.5px] text-faint">
            only the administrator creates groups and chooses who is in them · messages are end-to-end encrypted
          </p>
        </div>
        <SmallButton tone="primary" onClick={() => setEditing("new")}>
          New group
        </SmallButton>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {note ? <Notice tone="ok">{note}</Notice> : null}

      {pending.length ? (
        <section aria-labelledby="pending-groups" className="flex flex-col gap-2">
          <h2 id="pending-groups" className="eyebrow m-0">
            asked by users · {pending.length}
          </h2>
          {pending.map((g) => (
            <div key={g.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-keep-line bg-keep/[0.06] px-4 py-3">
              <span className="flex min-w-[14rem] grow flex-col gap-0.5">
                <span className="text-[14.5px] font-bold">{g.name}</span>
                <span className="text-[12.5px] text-dim">
                  asked by {g.requestedBy} {ago(g.createdAt)} · {g.members.map((m) => m.username).join(", ")}
                </span>
              </span>
              <SmallButton tone="primary" onClick={() => setEditing(g)}>
                Review and approve
              </SmallButton>
              <SmallButton
                tone="danger"
                onClick={() =>
                  void api(`/groups/${g.id}/refuse`, { method: "POST" })
                    .then(() => (setNote(`${g.name} was refused.`), load()))
                    .catch((err) => setError(err instanceof Error ? err.message : "Couldn't refuse"))
                }
              >
                Refuse
              </SmallButton>
            </div>
          ))}
        </section>
      ) : null}

      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="min-w-0 flex-[999_1_460px]">
          <Table head={["Group", "Rules of", "Members", "Messages", "Last message"]} sort={sort} minWidth={600}>
            {sorted?.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-dim">
                  No groups yet.
                </td>
              </tr>
            ) : null}
            {sorted?.map((g) => (
              <tr
                key={g.id}
                onClick={() => setEditing(g)}
                className={`cursor-pointer hover:bg-raised ${editing !== "new" && editing?.id === g.id ? "bg-raised shadow-[inset_3px_0_0_var(--color-accent)]" : ""}`}
              >
                <td>
                  <button type="button" className="bg-transparent p-0 text-left font-bold text-ink">
                    {g.name}
                  </button>
                </td>
                <td className="text-ink-soft">{g.category ?? "—"}</td>
                <td className="font-mono text-xs">
                  {g.members.length} of {MAX}
                </td>
                <td>
                  {g.mode && g.retentionMinutes ? (
                    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10.5px] font-bold ${modeTone(g.mode)}`}>
                      {modeLabel({ mode: g.mode, retentionMinutes: g.retentionMinutes })}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="font-mono text-xs text-ink-soft">{g.lastMessageAt ? ago(g.lastMessageAt) : "—"}</td>
              </tr>
            ))}
          </Table>
        </div>
        {editing ? (
          <GroupEditor
            key={editing === "new" ? "new" : editing.id}
            group={editing === "new" ? null : editing}
            categories={categories}
            onDone={(text) => {
              setNote(text);
              setEditing(null);
              void load();
            }}
            onClose={() => setEditing(null)}
          />
        ) : null}
      </div>
    </>
  );
}

function GroupEditor({
  group,
  categories,
  onDone,
  onClose,
}: {
  group: GroupRow | null;
  categories: Category[];
  onDone: (text: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [categoryId, setCategoryId] = useState(group?.categoryId ?? "");
  const [minutes, setMinutes] = useState(group?.retentionMinutes ?? 1440);
  const [members, setMembers] = useState(group?.members ?? []);
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<UserRow[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const pending = group?.status === "pending";
  const category = categories.find((c) => c.id === categoryId);
  // The durations this category allows: Keep-alive up to its maximum, 7 days when it allows Automatic
  const allowed = useMemo(() => {
    if (!category) return [];
    const max = category.rules.modes.includes("keep") ? category.rules.maxRetentionDays * 1440 : 0;
    return DURATIONS.filter((d) => d <= max || (d === 10080 && category.rules.modes.includes("auto")));
  }, [category]);
  useEffect(() => {
    if (allowed.length && !allowed.includes(minutes)) setMinutes(allowed[allowed.length - 1]!);
  }, [allowed, minutes]);
  useEffect(() => {
    if (search.trim().length < 2) return setFound([]);
    const t = setTimeout(() => {
      void api<{ users: UserRow[] }>(`/users?status=approved&search=${encodeURIComponent(search.trim())}`)
        .then((r) => setFound(r.users.filter((u) => !members.some((m) => m.id === u.id)).slice(0, 6)))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [search, members]);

  async function save() {
    setError("");
    try {
      const body = { name: name.trim(), categoryId, retentionMinutes: minutes, memberIds: members.map((m) => m.id) };
      if (group) await api(`/groups/${group.id}`, { method: "PUT", body });
      else await api("/groups", { body });
      onDone(pending ? `${name} was approved.` : group ? `${name} saved.` : `${name} created.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    }
  }
  async function remove() {
    try {
      await api(`/groups/${group!.id}`, { method: "DELETE" });
      onDone(`${group!.name} deleted with all its messages and files.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete");
    }
  }

  const field = "min-h-[42px] w-full rounded-field border border-line-strong bg-sunken px-3 text-sm text-ink outline-none focus:border-accent";
  return (
    <aside
      aria-label={group ? `Group ${group.name}` : "New group"}
      className="flex flex-[1_1_380px] flex-col gap-3.5 rounded-[18px] border border-line-strong bg-panel p-5"
    >
      <div className="flex items-center justify-between">
        <p className="eyebrow m-0">{pending ? `request from ${group?.requestedBy}` : group ? "group" : "new group"}</p>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-lg bg-transparent text-dim">
          ✕
        </button>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10.5px] text-dim">name</span>
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} className={field} />
      </label>
      <div className="flex gap-2.5">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="font-mono text-[10.5px] text-dim">rules of category</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={field}>
            <option value="">Choose…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="font-mono text-[10.5px] text-dim">messages stay</span>
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} disabled={!allowed.length} className={field}>
            {allowed.map((d) => (
              <option key={d} value={d}>
                {durationText(d)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {category && !allowed.length ? (
        <p className="m-0 text-[12.5px] text-keep">{category.name} doesn't allow stored messages: choose another category.</p>
      ) : null}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10.5px] text-dim">
          members · {members.length} of {MAX}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-1.5 rounded-full border border-line-strong py-1 pl-2.5 pr-1.5 text-[12.5px]">
              {m.username}
              <button
                type="button"
                aria-label={`Remove ${m.username}`}
                onClick={() => setMembers((list) => list.filter((x) => x.id !== m.id))}
                className="grid size-5 place-items-center rounded-full bg-transparent text-danger-ink"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        {members.length < MAX ? (
          <label className="flex flex-col gap-1.5">
            <span className="sr-only">Add a user</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="+ add a user (search)" className={`${field} border-dashed`} />
          </label>
        ) : null}
        {found.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => {
              setMembers((list) => [...list, { id: u.id, username: u.username }]);
              setSearch("");
            }}
            className="flex min-h-9 items-center rounded-lg border border-line bg-transparent px-3 text-left text-[13px] text-ink hover:border-accent"
          >
            + {u.username}
          </button>
        ))}
      </div>
      <p className="m-0 text-[12.5px] leading-normal text-dim">
        Removing someone: their devices can't read anything sent after that moment. What they already received stays until it expires.
      </p>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap gap-2">
        <SmallButton tone="primary" disabled={name.trim().length < 2 || !categoryId || !allowed.length || members.length < 2} onClick={() => void save()}>
          {pending ? "Approve" : group ? "Save" : "Create"}
        </SmallButton>
        {group && !pending ? (
          confirmDelete ? (
            <>
              <SmallButton tone="danger" onClick={() => void remove()}>
                Delete for good
              </SmallButton>
              <SmallButton onClick={() => setConfirmDelete(false)}>Keep it</SmallButton>
            </>
          ) : (
            <SmallButton tone="danger" onClick={() => setConfirmDelete(true)}>
              Delete group
            </SmallButton>
          )
        ) : null}
      </div>
    </aside>
  );
}
