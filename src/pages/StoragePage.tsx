import { useCallback, useEffect, useState } from "react";
import { Notice, SmallButton, Table, time, useSort } from "../components/ui";
import { api } from "../lib/api";
import { ago, bytes, dateTime } from "../lib/format";

type UserRow = { id: string; username: string; files: number; bytes: number; nextExpiry: string | null; request: string | null };
type Storage = {
  files: number;
  bytes: number;
  chats: number;
  quota: number;
  disk: { used: number; total: number; ratio: number; limit: number };
  lastCleanup: { at: string; files: number; bytes: number } | null;
  users: UserRow[];
};
type FileRow = { id: string; kind: string; size: number; to: string; createdAt: string | null; expiresAt: string };

/** "in 4 h", "in 2 d" */
function until(iso?: string | null) {
  if (!iso) return "—";
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return "now";
  const h = ms / 3600_000;
  return h < 1 ? `in ${Math.ceil(ms / 60_000)} min` : h < 48 ? `in ${Math.round(h)} h` : `in ${Math.round(h / 24)} d`;
}
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Encrypted files: sizes and dates only. Ask a user to download before a deadline, or delete now. */
export function StoragePage() {
  const [data, setData] = useState<Storage | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api<Storage>("/storage"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load storage");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function cleanup() {
    try {
      const r = await api<{ files: number; bytes: number }>("/storage/cleanup", { method: "POST" });
      setNote(r.files ? `${r.files} expired file${r.files === 1 ? "" : "s"} deleted · ${bytes(r.bytes)} freed.` : "Nothing expired to clean up.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cleanup failed");
    }
  }

  const { sorted, sort } = useSort(data?.users ?? null, [(u) => u.username, (u) => u.files, (u) => u.bytes, (u) => u.bytes, (u) => time(u.nextExpiry), (u) => time(u.request)]);
  const d = data?.disk;
  const full = d ? d.ratio >= d.limit : false;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex grow flex-col gap-1">
          <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">Storage</h1>
          <p className="m-0 font-mono text-[11.5px] text-faint">files are encrypted on the phones: only sizes and dates are visible here</p>
        </div>
        <SmallButton onClick={cleanup}>Clean up now</SmallButton>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {note ? <Notice tone="ok">{note}</Notice> : null}
      {data && d ? (
        <>
          <div className="flex flex-wrap gap-3">
            {[
              ["files stored", String(data.files), `in ${data.chats} chat${data.chats === 1 ? "" : "s"}`, ""],
              ["space used", bytes(data.bytes), `of ${bytes(d.total)} server disk`, ""],
              ["server disk", pct(d.ratio), full ? "uploads are stopped" : `uploads stop at ${pct(d.limit)}`, full ? "text-danger-ink" : d.ratio > d.limit - 0.1 ? "text-keep" : "text-online"],
              [
                "last cleanup",
                data.lastCleanup ? ago(data.lastCleanup.at) : "—",
                data.lastCleanup ? `${data.lastCleanup.files} file${data.lastCleanup.files === 1 ? "" : "s"} · ${bytes(data.lastCleanup.bytes)} freed · runs every minute` : "runs every minute",
                "",
              ],
            ].map(([label, value, sub, tone]) => (
              <div key={label} className="flex flex-[1_1_200px] flex-col gap-1.5 rounded-2xl border border-line bg-panel p-[18px]">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-dim">{label}</span>
                <span className={`text-[26px] font-extrabold ${tone}`}>{value}</span>
                <span className="font-mono text-[11.5px] text-faint">{sub}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-panel px-[18px] py-4">
            <div className="flex justify-between font-mono text-[11px] text-dim">
              <span>server disk</span>
              <span>
                {bytes(d.used)} of {bytes(d.total)}
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-line">
              <div className={`h-full rounded-full ${full ? "bg-danger" : d.ratio > d.limit - 0.1 ? "bg-keep" : "bg-online"}`} style={{ width: pct(Math.min(1, d.ratio)) }} />
              <div className="absolute -top-[5px] h-[18px] w-0.5 bg-danger" style={{ left: pct(d.limit) }} aria-hidden="true" />
            </div>
            <p className="m-0 font-mono text-[11px] text-faint">at {pct(d.limit)} new uploads are refused until space is freed; messages and live chats keep working</p>
          </div>
        </>
      ) : null}

      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="min-w-0 flex-[999_1_480px]">
          <Table head={["User", "Files", "Space", "Quota", "Next expiry", "Request"]} sort={sort}>
            {sorted?.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-dim">
                  No files stored.
                </td>
              </tr>
            ) : null}
            {sorted?.map((u) => {
              const share = data ? u.bytes / data.quota : 0;
              return (
                <tr
                  key={u.id}
                  onClick={() => setSelected(u.id)}
                  className={`cursor-pointer hover:bg-raised ${selected === u.id ? "bg-raised shadow-[inset_3px_0_0_var(--color-accent)]" : ""}`}
                >
                  <td>
                    <button type="button" className="bg-transparent p-0 text-left font-bold text-ink">
                      {u.username}
                    </button>
                  </td>
                  <td className="font-mono text-xs text-ink-soft">{u.files}</td>
                  <td className="font-mono text-xs">{bytes(u.bytes)}</td>
                  <td>
                    <span className="flex items-center gap-2.5">
                      <span className="h-[5px] w-[70px] overflow-hidden rounded-full bg-line">
                        <span className={`block h-full ${share > 0.8 ? "bg-keep" : "bg-accent"}`} style={{ width: pct(Math.min(1, share)) }} />
                      </span>
                      <span className={`font-mono text-[11px] ${share > 0.8 ? "text-keep" : "text-dim"}`}>{pct(share)}</span>
                    </span>
                  </td>
                  <td className="font-mono text-xs text-dim">{until(u.nextExpiry)}</td>
                  <td className={`text-[12.5px] ${u.request ? "text-keep" : "text-faint"}`}>{u.request ? `asked · until ${dateTime(u.request)}` : "—"}</td>
                </tr>
              );
            })}
          </Table>
        </div>
        {selected && data ? (
          <UserMedia
            key={selected}
            id={selected}
            onChanged={(text) => {
              setNote(text);
              void load();
            }}
          />
        ) : null}
      </div>
    </>
  );
}

function UserMedia({ id, onChanged }: { id: string; onChanged: (text: string) => void }) {
  const [data, setData] = useState<{ user: { username: string; request: string | null }; quota: number; files: FileRow[] } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [hours, setHours] = useState<24 | 72 | 168>(72);
  const [confirm, setConfirm] = useState<"selected" | "all" | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<{ user: { username: string; request: string | null }; quota: number; files: FileRow[] }>(`/storage/users/${id}`)
      .then((d) => {
        setData(d);
        setPicked(new Set());
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load"));
  }, [id]);
  useEffect(load, [load]);

  async function run(action: () => Promise<unknown>, text: string) {
    setError("");
    try {
      await action();
      setConfirm(null);
      onChanged(text);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (!data) return error ? <Notice tone="error">{error}</Notice> : null;
  const total = data.files.reduce((a, f) => a + f.size, 0);
  const name = data.user.username;
  return (
    <aside aria-label={`Media of ${name}`} className="flex flex-[1_1_340px] flex-col gap-3.5 rounded-[18px] border border-line-strong bg-panel p-5">
      <div className="flex flex-col gap-1">
        <p className="eyebrow m-0">media</p>
        <h2 className="m-0 text-xl font-extrabold">{name}</h2>
        <p className="m-0 font-mono text-xs text-dim">
          {data.files.length} file{data.files.length === 1 ? "" : "s"} · {bytes(total)} · {pct(total / data.quota)} of quota
        </p>
      </div>
      {data.files.length ? (
        <div className="flex max-h-[320px] flex-col overflow-y-auto rounded-xl border border-line font-mono text-[11.5px]">
          {data.files.map((f, i) => (
            <label key={f.id} className={`grid cursor-pointer grid-cols-[18px_1fr_auto_auto] items-center gap-2.5 px-3 py-2.5 text-ink-soft ${i ? "border-t border-line" : ""}`}>
              <input
                type="checkbox"
                checked={picked.has(f.id)}
                onChange={() => setPicked((p) => (p.has(f.id) ? new Set([...p].filter((x) => x !== f.id)) : new Set(p).add(f.id)))}
                className="size-3.5 accent-[#C7707E]"
              />
              <span className="truncate">
                {f.kind} · to {f.to}
              </span>
              <span>{bytes(f.size)}</span>
              <span className="text-faint">{until(f.expiresAt)}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="m-0 text-sm text-dim">No files on the server.</p>
      )}
      <p className="m-0 text-[12.5px] leading-normal text-dim">Files are end-to-end encrypted: you see type, size and dates, never the content.</p>
      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="flex flex-col gap-2 rounded-xl border border-[#5C4A22] bg-keep/[0.06] p-3">
        <p className="m-0 text-[13.5px] font-bold">Ask to download, then delete</p>
        {data.user.request ? (
          <>
            <p className="m-0 text-[12.5px] text-keep">Asked · deleted {dateTime(data.user.request)}</p>
            <SmallButton onClick={() => void run(() => api(`/storage/users/${id}/request`, { method: "DELETE" }), `Request to ${name} cancelled.`)}>Cancel the request</SmallButton>
          </>
        ) : (
          <>
            <div role="radiogroup" aria-label="Deadline" className="flex flex-wrap gap-1.5">
              {([24, 72, 168] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  role="radio"
                  aria-checked={hours === h}
                  onClick={() => setHours(h)}
                  className={`rounded-full border px-2.5 py-1.5 text-[12.5px] ${hours === h ? "border-keep-line bg-keep/[0.12] font-bold text-ink" : "border-line-strong text-dim"}`}
                >
                  {h === 24 ? "24 hours" : h === 72 ? "3 days" : "7 days"}
                </button>
              ))}
            </div>
            <SmallButton
              tone="warn"
              disabled={!data.files.length}
              onClick={() => void run(() => api(`/storage/users/${id}/request`, { body: { hours } }), `${name} was asked to download their media.`)}
            >
              Send the request
            </SmallButton>
          </>
        )}
        <p className="m-0 text-[11.5px] leading-normal text-faint">{name} gets a notification and a banner with the deadline, reminded 24 h and 1 h before. Then the files are deleted automatically.</p>
      </div>

      {confirm ? (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-danger p-3">
          <p className="m-0 text-[13px] text-ink-soft">
            Delete {confirm === "all" ? `all ${data.files.length} files` : `${picked.size} file${picked.size === 1 ? "" : "s"}`} of {name} now? Their chats show "removed by an administrator".
          </p>
          <div className="flex gap-2">
            <SmallButton
              tone="danger"
              onClick={() =>
                void run(
                  () => api("/storage/delete", { body: confirm === "all" ? { userId: id } : { ids: [...picked] } }),
                  `Deleted ${confirm === "all" ? "all files" : `${picked.size} file${picked.size === 1 ? "" : "s"}`} of ${name}.`,
                )
              }
            >
              Delete
            </SmallButton>
            <SmallButton onClick={() => setConfirm(null)}>Cancel</SmallButton>
          </div>
        </div>
      ) : (
        <>
          <SmallButton tone="danger" disabled={!picked.size} onClick={() => setConfirm("selected")}>
            Delete selected now
          </SmallButton>
          <SmallButton tone="danger" disabled={!data.files.length} onClick={() => setConfirm("all")}>
            Delete all {data.files.length} files now
          </SmallButton>
        </>
      )}
      <p className="m-0 text-xs leading-normal text-faint">Logged in the activity log.</p>
    </aside>
  );
}
