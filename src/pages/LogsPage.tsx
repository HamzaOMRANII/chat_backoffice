import { useEffect, useState } from "react";
import { Notice, Table } from "../components/ui";
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
};

export function LogsPage() {
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ logs: Log[] }>("/logs")
      .then((r) => setLogs(r.logs))
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load the log"));
  }, []);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">Activity log</h1>
        <p className="m-0 text-[13.5px] text-dim">Every backoffice action, kept 90 days.</p>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Table head={["When", "Admin", "Action"]} minWidth={560}>
        {logs?.length === 0 ? (
          <tr>
            <td colSpan={3} className="text-dim">Nothing yet.</td>
          </tr>
        ) : null}
        {logs?.map((l) => (
          <tr key={l.id}>
            <td className="font-mono text-xs text-dim">{dateTime(l.at)}</td>
            <td className="font-bold">{l.admin ?? "—"}</td>
            <td className="text-ink-soft">
              {ACTIONS[l.action] ?? l.action}{" "}
              <strong className="text-ink">{l.target ?? (l.details?.username as string | undefined) ?? (l.details?.name as string | undefined) ?? ""}</strong>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
