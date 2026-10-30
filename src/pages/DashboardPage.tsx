import { useEffect, useState } from "react";
import { Notice } from "../components/ui";
import { api } from "../lib/api";
import { ago, bytes } from "../lib/format";
import type { Dashboard } from "../app/types";

const card = "flex flex-col gap-1.5 rounded-2xl border border-line bg-panel p-4 text-ink no-underline";
const label = "font-mono text-[10.5px] uppercase tracking-[0.14em] text-dim";

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = () =>
      api<Dashboard>("/dashboard")
        .then((d) => {
          setData(d);
          setError("");
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load the dashboard"));
    void load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const totalUsers = data ? Object.values(data.users).reduce((a, b) => a + b, 0) - data.users.rejected : 0;
  const attention = data
    ? [
        ...data.attention.pending.map((u) => ({
          key: `p${u.id}`,
          href: `#/users/${u.id}`,
          tone: "bg-keep",
          text: `${u.username} is waiting for approval`,
          when: ago(u.at),
        })),
        ...data.attention.locked.map((u) => ({
          key: `l${u.id}`,
          href: `#/users/${u.id}`,
          tone: "bg-danger",
          text: `${u.username} is locked after 5 failed attempts`,
          when: `until ${new Date(u.until).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        })),
        ...(data.attention.pausedContacts
          ? [
              {
                key: "paused",
                href: "#/users",
                tone: "bg-keep",
                text: `${data.attention.pausedContacts} paused contact${data.attention.pausedContacts > 1 ? "s" : ""} (no shared category)`,
                when: "—",
              },
            ]
          : []),
      ]
    : [];

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="m-0 grow text-[28px] font-extrabold tracking-[-0.02em]">Dashboard</h1>
        <span className="font-mono text-[11.5px] text-faint">refreshes every 30 s</span>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-3">
        <a href="#/users" className={card}>
          <span className={label}>{"// users"}</span>
          <span className="text-3xl font-extrabold">{data ? totalUsers : "…"}</span>
          <span className="font-mono text-[11.5px] text-dim">
            <span className="text-keep">{data?.users.pending ?? 0} pending</span> · {data?.users.suspended ?? 0} suspended
          </span>
        </a>
        <div className={card}>
          <span className={label}>{"// online now"}</span>
          <span className="text-3xl font-extrabold text-ok">{data?.online.total ?? "…"}</span>
          <span className="font-mono text-[11.5px] text-dim">
            {data ? `${data.online.android} Android · ${data.online.total - data.online.android} web` : ""}
          </span>
        </div>
        <a href="#/chats" className={card}>
          <span className={label}>{"// active chats"}</span>
          <span className="text-3xl font-extrabold">{data?.chats.active ?? "…"}</span>
          <span className="flex gap-2 font-mono text-[11px]">
            <span className="text-keep">{data?.chats.keep ?? 0} keep</span>
            <span className="text-auto">{data?.chats.auto ?? 0} auto</span>
            {data?.chats.invited ? <span className="text-dim">{data.chats.invited} invited</span> : null}
          </span>
        </a>
        <div className={card}>
          <span className={label}>{"// messages · 24 h"}</span>
          <span className="text-3xl font-extrabold">{data?.messages.last24h ?? "…"}</span>
          <span className="font-mono text-[11.5px] text-dim">
            {data ? `${data.messages.stored} stored · ${bytes(data.messages.storedBytes)} encrypted` : ""}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-[18px]">
        <section className="flex min-w-0 flex-[2_1_420px] flex-col gap-2.5">
          <h2 className="m-0 text-lg font-extrabold">Needs attention</h2>
          <div className="flex flex-col rounded-2xl border border-line bg-panel">
            {data && attention.length === 0 ? <p className="m-0 px-4 py-3.5 text-sm text-dim">Nothing right now.</p> : null}
            {attention.map((a, i) => (
              <a
                key={a.key}
                href={a.href}
                className={`flex items-center gap-3 px-4 py-3 text-sm text-ink no-underline hover:bg-raised ${i ? "border-t border-line" : ""}`}
              >
                <span className={`size-2 shrink-0 rounded-full ${a.tone}`} aria-hidden="true" />
                <span className="grow">{a.text}</span>
                <span className="font-mono text-[11px] text-faint">{a.when}</span>
              </a>
            ))}
          </div>
        </section>
        <section className="flex min-w-0 flex-[1_1_280px] flex-col gap-2.5">
          <h2 className="m-0 text-lg font-extrabold">Latest sign-ins</h2>
          <div className="flex flex-col rounded-2xl border border-line bg-panel text-[13.5px]">
            {data?.logins.length === 0 ? <p className="m-0 px-4 py-3.5 text-sm text-dim">None yet.</p> : null}
            {data?.logins.map((l, i) => (
              <a
                key={`${l.userId}${l.at}`}
                href={`#/users/${l.userId}`}
                className={`flex flex-wrap gap-x-2.5 px-4 py-3 text-ink no-underline hover:bg-raised ${i ? "border-t border-line" : ""}`}
              >
                <span className="grow font-bold">{l.username}</span>
                <span className="text-dim">{l.deviceName ?? "—"}</span>
                <span className="font-mono text-[11px] text-faint">{ago(l.at)}</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
