import { useCallback, useEffect, useState } from "react";
import { Notice, SmallButton, StatusBadge, Table } from "../components/ui";
import { api } from "../lib/api";
import { ago, dateTime, place } from "../lib/format";
import type { Category, Status, UserRow } from "../app/types";

type Filter = Status | "all";
const TABS: [Filter, string][] = [
  ["all", "All"],
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["suspended", "Suspended"],
  ["rejected", "Rejected"],
];

type Props = { categories: Category[]; onCounts: (counts: Record<Status, number>) => void; onOpen: (id: string) => void };

export function UsersPage({ categories, onCounts, onOpen }: Props) {
  const [status, setStatus] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [counts, setCounts] = useState<Record<Status, number> | null>(null);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ ...(status !== "all" ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) });
      const res = await api<{ users: UserRow[]; counts: Record<Status, number> }>(`/users${params.size ? `?${params}` : ""}`);
      setRows(res.users);
      setCounts(res.counts);
      onCounts(res.counts);
      setSelected((current) => res.users.find((u) => u.id === current?.id) ?? (status === "pending" ? res.users[0] ?? null : null));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load users");
    }
  }, [status, search, onCounts]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "?";

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 grow text-[28px] font-extrabold tracking-[-0.02em]">Users</h1>
        <label className="flex flex-[0_1_300px]">
          <span className="sr-only">Search users</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username or email"
            className="min-h-[42px] w-full rounded-field border border-line-strong bg-panel px-3.5 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
      </div>

      <div role="tablist" aria-label="Status" className="flex flex-wrap gap-1.5">
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
            {counts ? ` · ${id === "all" ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[id]}` : ""}
          </button>
        ))}
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="min-w-0 flex-[999_1_420px]">
          <Table head={status === "pending" ? ["User", "Requested", "Sign-up device"] : ["User", "Status", "Categories", "Last device", "Last seen"]} minWidth={status === "pending" ? 520 : 760}>
            {rows?.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-dim">
                  No {status === "all" ? "" : `${status} `}users{search ? " match this search" : ""}.
                </td>
              </tr>
            ) : null}
            {rows?.map((u) => (
              <tr
                key={u.id}
                onClick={() => (u.status === "pending" ? setSelected(u) : onOpen(u.id))}
                className={`cursor-pointer hover:bg-raised ${selected?.id === u.id ? "bg-raised shadow-[inset_3px_0_0_var(--color-accent)]" : ""}`}
              >
                <td>
                  <button type="button" className="bg-transparent p-0 text-left font-bold text-ink" onClick={(e) => { e.stopPropagation(); onOpen(u.id); }}>
                    {u.username}
                  </button>
                  <div className="text-xs text-dim">{u.email}</div>
                </td>
                {status === "pending" ? (
                  <>
                    <td className="font-mono text-xs text-ink-soft">{dateTime(u.createdAt)}</td>
                    <td className="text-ink-soft">
                      {u.lastDevice?.deviceName ?? "—"} · {place(u.lastDevice?.city, u.lastDevice?.country)}
                    </td>
                  </>
                ) : (
                  <>
                    <td>
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="text-ink-soft">{u.categoryIds.map(categoryName).join(", ") || "—"}</td>
                    <td className="text-ink-soft">{u.lastDevice?.deviceName ?? "—"}</td>
                    <td className="font-mono text-xs text-ink-soft">{ago(u.lastSeenAt ?? u.lastDevice?.at)}</td>
                  </>
                )}
              </tr>
            ))}
          </Table>
        </div>
        {selected?.status === "pending" ? <Review key={selected.id} user={selected} categories={categories} onDone={load} /> : null}
      </div>
    </>
  );
}

function Review({ user, categories, onDone }: { user: UserRow; categories: Category[]; onDone: () => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(path: "approve" | "reject") {
    setBusy(true);
    setError("");
    try {
      await api(`/users/${user.id}/${path}`, { body: path === "approve" ? { categoryIds: picked } : {} });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside aria-label={`Review ${user.username}`} className="flex flex-[1_1_340px] flex-col gap-4 rounded-[18px] border border-line-strong bg-panel p-5">
      <div className="flex flex-col gap-1">
        <p className="eyebrow m-0">review request</p>
        <h2 className="m-0 text-xl font-extrabold">{user.username}</h2>
        <p className="m-0 text-[13px] text-dim">{user.email} · privacy notice accepted</p>
      </div>
      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="mb-2 p-0 text-sm font-bold">
          Categories <span className="font-normal text-dim">(at least one)</span>
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((c) => {
            const on = picked.includes(c.id);
            return (
              <label key={c.id} className={`flex min-h-10 items-center gap-2 rounded-[10px] border px-3 text-[13.5px] ${on ? "border-accent bg-accent/10" : "border-line-strong"}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => setPicked((p) => (on ? p.filter((id) => id !== c.id) : [...p, c.id]))}
                  className="size-[18px] accent-brand"
                />
                {c.name}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5 rounded-field border border-dashed border-line-strong bg-bg px-3.5 py-3 font-mono text-xs text-ink-soft">
        <div>
          <span className="text-faint">sign-up from </span>
          {user.lastDevice?.deviceName ?? "unknown device"}
        </div>
        <div>
          <span className="text-faint">ip </span>
          {user.lastDevice?.ip ?? "—"} · {place(user.lastDevice?.city, user.lastDevice?.country)}
        </div>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex gap-2 [&>*]:grow">
        <SmallButton tone="primary" disabled={busy || picked.length === 0} onClick={() => act("approve")}>
          Approve
        </SmallButton>
        <SmallButton tone="danger" disabled={busy} onClick={() => act("reject")}>
          Reject
        </SmallButton>
      </div>
      <p className="m-0 text-xs text-faint">Rejected requests are deleted after 7 days. The user sees the result when they try to sign in.</p>
    </aside>
  );
}
