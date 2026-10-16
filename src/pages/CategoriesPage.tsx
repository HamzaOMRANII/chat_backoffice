import { useEffect, useState, type FormEvent } from "react";
import { Notice, SmallButton, Table } from "../components/ui";
import { api } from "../lib/api";
import type { Category, Rules } from "../app/types";

const MODE_LABELS: Record<Rules["modes"][number], [string, string]> = {
  live: ["LIVE", "deleted when either side leaves"],
  keep: ["KEEP", "1 to 7 days"],
  auto: ["AUTO", "7 days"],
};
const FILES = { all: "Allowed", p2p: "Direct only", none: "None" } as const;
const CALLS = { video: "Voice + video", voice: "Voice", none: "None" } as const;
const NEW_RULES: Rules = { modes: ["keep"], maxRetentionDays: 3, files: "none", export: false, calls: "voice" };

const summary = (r: Rules) => `${r.files === "all" ? "✓" : r.files === "p2p" ? "direct" : "✗"} · ${r.export ? "✓" : "✗"} · ${CALLS[r.calls].toLowerCase()}`;

export function CategoriesPage({ categories, reload }: { categories: Category[]; reload: () => Promise<void> }) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [error, setError] = useState("");
  const editing = editingId === "new" ? null : categories.find((c) => c.id === editingId) ?? null;

  async function move(index: number, delta: number) {
    const ids = categories.map((c) => c.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved!);
    try {
      await api("/categories/reorder", { body: { ids } });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reorder");
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex grow flex-col gap-1">
          <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">Categories</h1>
          <p className="m-0 text-[13.5px] text-dim">Users only see each other if they share one. Users never see category names. Order decides which one a friendship uses.</p>
        </div>
        <SmallButton tone="primary" onClick={() => setEditingId("new")}>
          New category
        </SmallButton>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="min-w-0 flex-[999_1_460px]">
          <Table head={["#", "Category", "Modes", "Kept", "Files · export · calls", "Users", "Order"]} minWidth={720}>
            {categories.map((c, i) => (
              <tr key={c.id} onClick={() => setEditingId(c.id)} className={`cursor-pointer hover:bg-raised ${editingId === c.id ? "bg-raised shadow-[inset_3px_0_0_var(--color-accent)]" : ""}`}>
                <td className="font-mono text-faint">{c.order}</td>
                <td>
                  <button type="button" className="bg-transparent p-0 font-bold text-ink">
                    {c.name}
                  </button>
                </td>
                <td className="font-mono text-[11.5px]">{c.rules.modes.length === 1 && c.rules.modes[0] === "live" ? <span className="text-live">LIVE only</span> : c.rules.modes.map((m) => MODE_LABELS[m][0]).join(" ")}</td>
                <td>{c.rules.modes.some((m) => m !== "live") ? `${c.rules.maxRetentionDays} d` : "never"}</td>
                <td className="text-ink-soft">{summary(c.rules)}</td>
                <td className="font-mono">{c.members}</td>
                <td onClick={(e) => e.stopPropagation()} className="whitespace-nowrap">
                  <button type="button" aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => move(i, -1)} className="size-8 rounded-lg border border-line-strong bg-transparent text-ink disabled:opacity-30">
                    ↑
                  </button>{" "}
                  <button type="button" aria-label={`Move ${c.name} down`} disabled={i === categories.length - 1} onClick={() => move(i, 1)} className="size-8 rounded-lg border border-line-strong bg-transparent text-ink disabled:opacity-30">
                    ↓
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        </div>
        {editingId ? (
          <Editor
            key={editingId}
            category={editing}
            onSaved={async () => {
              await reload();
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : null}
      </div>
    </>
  );
}

function Editor({ category, onSaved, onCancel }: { category: Category | null; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [rules, setRules] = useState<Rules>(category?.rules ?? NEW_RULES);
  const [members, setMembers] = useState<{ id: string; username: string; status: string }[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (category) void api<{ members: typeof members }>(`/categories/${category.id}/members`).then((r) => setMembers(r.members));
  }, [category]);

  const toggleMode = (m: Rules["modes"][number]) =>
    setRules((r) => ({ ...r, modes: r.modes.includes(m) ? r.modes.filter((x) => x !== m) : [...r.modes, m] }));

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    const onlyLive = rules.modes.every((m) => m === "live");
    const body = { name, rules: { ...rules, maxRetentionDays: onlyLive ? 0 : Math.max(1, rules.modes.includes("auto") ? 7 : rules.maxRetentionDays) } };
    setBusy(true);
    setError("");
    try {
      if (category) await api(`/categories/${category.id}`, { method: "PATCH", body });
      else await api("/categories", { body });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!category) return;
    try {
      await api(`/categories/${category.id}`, { method: "DELETE" });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete");
    }
  }

  const select = "min-h-10 rounded-[10px] border border-line-strong bg-bg px-2 text-[13px] text-ink";
  return (
    <form onSubmit={save} aria-label={category ? `Edit ${category.name}` : "New category"} className="flex flex-[1_1_340px] flex-col gap-4 rounded-[18px] border border-line-strong bg-panel p-5">
      <label className="flex flex-col gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-dim">
        Name
        <input name="name" defaultValue={category?.name ?? ""} required maxLength={40} className="min-h-11 rounded-field border border-line-strong bg-bg px-3 font-sans text-[15px] normal-case tracking-normal text-ink outline-none focus:border-accent" />
      </label>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-sm font-bold">Chat modes allowed</legend>
        {(Object.keys(MODE_LABELS) as Rules["modes"]).map((m) => (
          <label key={m} className="flex items-center gap-2 text-[13.5px]">
            <input type="checkbox" checked={rules.modes.includes(m)} onChange={() => toggleMode(m)} className="size-[18px] accent-brand" />
            <span className={`font-mono ${m === "live" ? "text-live" : m === "keep" ? "text-keep" : "text-auto"}`}>{MODE_LABELS[m][0]}</span> {MODE_LABELS[m][1]}
          </label>
        ))}
      </fieldset>
      {rules.modes.includes("keep") ? (
        <label className="flex flex-col gap-1.5 text-[12.5px] text-dim">
          Keep-alive maximum: {rules.maxRetentionDays || 1} day{(rules.maxRetentionDays || 1) > 1 ? "s" : ""}
          <input type="range" min={1} max={7} value={rules.maxRetentionDays || 1} onChange={(e) => setRules((r) => ({ ...r, maxRetentionDays: Number(e.target.value) }))} className="accent-brand" />
        </label>
      ) : null}
      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1.5 text-[12.5px] text-dim">
          Files
          <select value={rules.files} onChange={(e) => setRules((r) => ({ ...r, files: e.target.value as Rules["files"] }))} className={select}>
            {Object.entries(FILES).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[12.5px] text-dim">
          Export
          <select value={rules.export ? "on" : "off"} onChange={(e) => setRules((r) => ({ ...r, export: e.target.value === "on" }))} className={select}>
            <option value="on">On</option>
            <option value="off">Off</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[12.5px] text-dim">
          Calls
          <select value={rules.calls} onChange={(e) => setRules((r) => ({ ...r, calls: e.target.value as Rules["calls"] }))} className={select}>
            {Object.entries(CALLS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      {category ? (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-sm font-bold">Members · {members?.length ?? category.members}</p>
          <div className="flex flex-wrap gap-1.5">
            {members?.map((m) => (
              <a key={m.id} href={`#/users/${m.id}`} className="rounded-full border border-line-strong px-2.5 py-1 text-[13px] text-ink no-underline">
                {m.username}
              </a>
            ))}
            {members?.length === 0 ? <span className="text-sm text-dim">No one yet. Assign people from their user page.</span> : null}
          </div>
        </div>
      ) : null}
      <Notice tone="warning">Tighter rules end existing chats that break them, once chats exist.</Notice>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap gap-2">
        <SmallButton tone="primary" type="submit" disabled={busy || rules.modes.length === 0}>
          {category ? `Save ${category.name}` : "Create"}
        </SmallButton>
        <SmallButton onClick={onCancel}>Cancel</SmallButton>
        {category ? (
          <SmallButton tone="danger" onClick={remove}>
            Delete
          </SmallButton>
        ) : null}
      </div>
    </form>
  );
}
