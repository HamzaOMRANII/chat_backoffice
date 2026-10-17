import { useCallback, useEffect, useState } from "react";
import {
  Notice,
  Panel,
  SmallButton,
  StatusBadge,
  Table,
} from "../components/ui";
import { api } from "../lib/api";
import { ago, dateTime, EVENT_LABELS, place } from "../lib/format";
import type { Category, UserContacts, UserDetails } from "../app/types";
import { ContactsTable, RequestsTable } from "./UserContacts";
import { ChatDetails, ChatTable } from "./ChatsPage";
import type { ChatRow } from "../app/types";

const BAD_EVENTS = new Set([
  "failed_password",
  "failed_code",
  "failed_passcode",
  "locked",
]);
const WARN_EVENTS = new Set([
  "kicked",
  "passcode_used",
  "admin_reset_used",
  "email_changed",
]);
type Tab = "account" | "contacts" | "requests" | "chats" | "history";

export function UserDetailsPage({
  id,
  categories,
  onBack,
}: {
  id: string;
  categories: Category[];
  onBack: () => void;
}) {
  const [data, setData] = useState<UserDetails | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetCode, setResetCode] = useState<{
    code: string;
    expiresAt: string;
  } | null>(null);
  const [editing, setEditing] = useState<string[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [contacts, setContacts] = useState<UserContacts | null>(null);
  const [tab, setTab] = useState<Tab>("account");
  const [chats, setChats] = useState<ChatRow[] | null>(null);
  const [openChat, setOpenChat] = useState<string | null>(null);
  const [confirmingHistory, setConfirmingHistory] = useState(false);
  const [historyText, setHistoryText] = useState("");

  const load = useCallback(async () => {
    try {
      const [details, friends] = await Promise.all([
        api<UserDetails>(`/users/${id}`),
        api<UserContacts>(`/users/${id}/contacts`),
      ]);
      setData(details);
      setContacts(friends);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this user");
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  async function act(
    label: string,
    path: string,
    method = "POST",
    body: unknown = {},
  ) {
    setError("");
    setMessage("");
    try {
      const res = await api<Record<string, unknown>>(`/users/${id}${path}`, {
        method,
        body,
      });
      if (path === "/reset-access")
        setResetCode(res as { code: string; expiresAt: string });
      setMessage(label);
      if (method === "DELETE" && path === "") onBack();
      else await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (!data)
    return error ? (
      <Notice tone="error">{error}</Notice>
    ) : (
      <p className="text-dim">Loading…</p>
    );
  const { user, devices, events, currentDeviceId } = data;
  const current = devices.find((d) => d.deviceId === currentDeviceId);
  const categoryName = (cid: string) =>
    categories.find((c) => c.id === cid)?.name ?? "?";

  return (
    <>
      <p className="m-0 font-mono text-[11.5px] text-faint">
        <a href="#/users">users</a> /{" "}
        <span className="text-dim">{user.username}</span>
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-[1_1_240px] flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">
              {user.username}
            </h1>
            <StatusBadge status={user.status} />
            {user.locked ? <StatusBadge status="locked" /> : null}
            {currentDeviceId ? (
              <span className="font-mono text-[11px] text-ok">● signed in</span>
            ) : null}
          </div>
          <p className="m-0 font-mono text-xs text-dim">
            {user.email} · since {dateTime(user.createdAt)}
            {contacts?.personalId ? ` · ID ${contacts.personalId}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.status === "approved" ? (
            <>
              <SmallButton
                onClick={() => act("Signed out everywhere.", "/force-logout")}
              >
                Force logout
              </SmallButton>
              <SmallButton
                onClick={() =>
                  act("One-time reset code created.", "/reset-access")
                }
              >
                Reset access
              </SmallButton>
              <SmallButton
                tone="warn"
                onClick={() => act("Account suspended.", "/suspend")}
              >
                Suspend
              </SmallButton>
            </>
          ) : null}
          {user.status === "suspended" ? (
            <SmallButton
              onClick={() => act("Account reactivated.", "/reactivate")}
            >
              Reactivate
            </SmallButton>
          ) : null}
          {user.locked ? (
            <SmallButton onClick={() => act("Sign-in unlocked.", "/unlock")}>
              Unlock
            </SmallButton>
          ) : null}
          <SmallButton tone="danger" onClick={() => setConfirming(true)}>
            Delete account
          </SmallButton>
        </div>
      </div>

      {message ? <Notice tone="ok">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {resetCode ? (
        <Notice tone="warning">
          Give this one-time code to {user.username} in person:{" "}
          <strong className="font-mono text-base tracking-[0.15em] text-ink">
            {resetCode.code}
          </strong>
          . It works once, until {dateTime(resetCode.expiresAt)}, on the sign-in
          screen under “I have a reset code”. It won't be shown again.
        </Notice>
      ) : null}
      {confirming ? (
        <Panel eyebrow="delete account">
          <p className="m-0 text-sm text-ink-soft">
            This deletes <strong className="text-ink">{user.username}</strong>{" "}
            and ends their sessions. Type the username to confirm.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              aria-label="Type the username to confirm"
              className="min-h-[42px] flex-[1_1_200px] rounded-field border border-danger bg-bg px-3 font-mono text-ink outline-none"
            />
            <SmallButton
              tone="danger"
              disabled={confirmText !== user.username}
              onClick={() =>
                act("Account deleted.", "", "DELETE", { confirm: confirmText })
              }
            >
              Delete
            </SmallButton>
            <SmallButton onClick={() => setConfirming(false)}>
              Cancel
            </SmallButton>
          </div>
        </Panel>
      ) : null}

      <div
        role="tablist"
        aria-label="User sections"
        className="flex flex-wrap gap-1.5"
      >
        {(
          [
            ["account", "Account & devices"],
            ["contacts", `Contacts · ${contacts?.contacts.length ?? 0}`],
            ["requests", `Requests · ${contacts?.requests.length ?? 0}`],
            ["chats", `Chats · ${chats?.length ?? 0}`],
            ["history", "Login history"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`min-h-[38px] rounded-full border px-3.5 text-[13.5px] ${tab === key ? "border-accent bg-accent/15 font-bold text-ink" : "border-line-strong bg-transparent font-semibold text-dim"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "contacts" && contacts ? (
        <ContactsTable
          rows={contacts.contacts}
          categories={categories}
          onChanged={async (m) => {
            setMessage(m);
            await load();
          }}
        />
      ) : null}
      {tab === "requests" && contacts ? (
        <RequestsTable rows={contacts.requests} />
      ) : null}

      {tab === "account" ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3">
            <Panel eyebrow="categories">
              {editing ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    {categories.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={editing.includes(c.id)}
                          onChange={() =>
                            setEditing((e) =>
                              e!.includes(c.id)
                                ? e!.filter((x) => x !== c.id)
                                : [...e!, c.id],
                            )
                          }
                          className="size-4 accent-brand"
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <SmallButton
                      tone="primary"
                      disabled={editing.length === 0}
                      onClick={async () => {
                        await act("Categories updated.", "/categories", "PUT", {
                          categoryIds: editing,
                        });
                        setEditing(null);
                      }}
                    >
                      Save
                    </SmallButton>
                    <SmallButton onClick={() => setEditing(null)}>
                      Cancel
                    </SmallButton>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {user.categoryIds.length ? (
                      user.categoryIds.map((cid) => (
                        <span
                          key={cid}
                          className="rounded-full border border-line-strong bg-raised px-2.5 py-1 text-[12.5px] font-semibold"
                        >
                          {categoryName(cid)}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-dim">none yet</span>
                    )}
                  </div>
                  {user.status !== "pending" && user.status !== "rejected" ? (
                    <button
                      type="button"
                      onClick={() => setEditing(user.categoryIds)}
                      className="self-start bg-transparent p-0 text-sm font-semibold text-link"
                    >
                      Edit
                    </button>
                  ) : null}
                </>
              )}
            </Panel>
            <Panel eyebrow="current device">
              <p className="m-0 text-[15px] font-bold">
                {current?.name ?? "not signed in"}
              </p>
              <p className="m-0 font-mono text-xs text-dim">
                {current
                  ? [
                      current.platform === "android"
                        ? `Android ${current.osVersion ?? ""}`
                        : current.os,
                      current.appVersion && `app ${current.appVersion}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : `last seen ${ago(user.lastSeenAt)}`}
              </p>
            </Panel>
            <Panel eyebrow="account">
              <p className="m-0 font-mono text-xs leading-relaxed text-ink-soft">
                approved {dateTime(user.approvedAt)}
                {user.approvedBy ? ` by ${user.approvedBy}` : ""}
                <br />
                privacy accepted {dateTime(user.privacyAcceptedAt)}
                <br />
                failed attempts {user.failedAttempts ?? 0}
                {user.mustReset ? (
                  <>
                    <br />
                    must set new credentials
                  </>
                ) : null}
              </p>
            </Panel>
          </div>

          <section className="flex flex-col gap-2.5">
            <h2 className="m-0 text-lg font-extrabold">Devices</h2>
            <Table
              head={[
                "Device",
                "System",
                "Screen · language · time zone",
                "First seen",
                "Last seen",
                "Logins",
              ]}
              minWidth={860}
            >
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-dim">
                    No devices yet.
                  </td>
                </tr>
              ) : null}
              {devices.map((d) => (
                <tr key={d.deviceId}>
                  <td className="font-bold">
                    {d.name ?? "unknown"}
                    {d.deviceId === currentDeviceId ? (
                      <span className="font-mono text-[10.5px] text-ok">
                        {" "}
                        · current
                      </span>
                    ) : null}
                  </td>
                  <td className="text-ink-soft">
                    {[
                      d.platform === "android"
                        ? `Android ${d.osVersion ?? ""}`
                        : d.os,
                      d.browser,
                      d.appVersion && `app ${d.appVersion}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </td>
                  <td className="text-ink-soft">
                    {[d.screen, d.language, d.timezone]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="font-mono text-xs text-dim">
                    {dateTime(d.firstSeen)}
                  </td>
                  <td className="font-mono text-xs text-dim">
                    {dateTime(d.lastSeen)}
                  </td>
                  <td className="font-mono text-xs">{d.logins}</td>
                </tr>
              ))}
            </Table>
          </section>
        </>
      ) : null}

      {tab === "history" ? (
        <section className="flex flex-col gap-2.5">
          <h2 className="m-0 text-lg font-extrabold">
            Login history · 90 days
          </h2>
          <Table
            head={["When", "Event", "IP", "Location", "Device"]}
            minWidth={720}
          >
            {events.map((e) => (
              <tr key={e._id}>
                <td className="font-mono text-xs text-dim">{dateTime(e.at)}</td>
                <td
                  className={`font-bold ${BAD_EVENTS.has(e.type) ? "text-danger-ink" : WARN_EVENTS.has(e.type) ? "text-keep" : "text-ok"}`}
                >
                  {EVENT_LABELS[e.type] ?? e.type}
                </td>
                <td className="font-mono text-xs">{e.ip ?? "—"}</td>
                <td>{place(e.city, e.country)}</td>
                <td>{e.deviceName ?? "—"}</td>
              </tr>
            ))}
          </Table>
        </section>
      ) : null}
    </>
  );
}
