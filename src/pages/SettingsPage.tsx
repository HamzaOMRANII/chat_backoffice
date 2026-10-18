import { useEffect, useRef, useState } from "react";
import { Notice, SmallButton } from "../components/ui";
import { api } from "../lib/api";

/** Minimum Android app version, and a backup of everything configured here (never messages). */
export function SettingsPage({ onRestored }: { onRestored: () => void }) {
  const [min, setMin] = useState("");
  const [saved, setSaved] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [restore, setRestore] = useState<{ name: string; data: unknown } | null>(null);
  const [confirm, setConfirm] = useState("");
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ minAppVersion: string }>("/settings")
      .then((r) => {
        setMin(r.minAppVersion);
        setSaved(r.minAppVersion);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load the settings"));
  }, []);

  async function saveMin() {
    setError("");
    try {
      const r = await api<{ minAppVersion: string }>("/settings", { method: "PUT", body: { minAppVersion: min.trim() } });
      setSaved(r.minAppVersion);
      setNote(`Phones older than ${r.minAppVersion} must now update before using H_CHAT.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    }
  }

  async function download() {
    setError("");
    try {
      const res = await fetch("/api/admin/backup", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Couldn't make the backup");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `h_chat-settings-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      setNote("Backup downloaded. Keep it somewhere safe: it holds the categories, their rules, the groups and their members.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't make the backup");
    }
  }

  async function pick(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    try {
      setRestore({ name: f.name, data: JSON.parse(await f.text()) });
      setConfirm("");
    } catch {
      setError("This file isn't an H_CHAT settings backup.");
    }
  }

  async function runRestore() {
    setError("");
    try {
      const r = await api<{ categories: number; groups: number; skipped: string[] }>("/restore", { body: { confirm, backup: restore!.data } });
      setNote(`Restored ${r.categories} categories and ${r.groups} new groups${r.skipped.length ? ` · skipped: ${r.skipped.join(", ")} (missing members or category)` : ""}.`);
      setRestore(null);
      onRestored();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't restore");
    }
  }

  const card = "flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5";
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">Settings</h1>
        <p className="m-0 font-mono text-[11.5px] text-faint">app version policy and a backup of everything configured in this backoffice</p>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {note ? <Notice tone="ok">{note}</Notice> : null}

      <section className={card} aria-labelledby="min-title">
        <h2 id="min-title" className="m-0 text-lg font-extrabold">
          Minimum Android app version
        </h2>
        <p className="m-0 text-[13px] leading-normal text-dim">
          Phones running an older version see "Update required" and can't use H_CHAT until they install the latest one. Raise it after a security fix. Currently: <strong className="text-ink">{saved || "…"}</strong>
          {saved === "0.0.0" ? " (no minimum)" : ""}.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10.5px] text-dim">version</span>
            <input value={min} onChange={(e) => setMin(e.target.value)} placeholder="1.0.0" className="min-h-[42px] w-[140px] rounded-field border border-line-strong bg-sunken px-3 font-mono text-sm text-ink outline-none focus:border-accent" />
          </label>
          <SmallButton tone="primary" disabled={!/^\d+\.\d+\.\d+$/.test(min.trim()) || min.trim() === saved} onClick={() => void saveMin()}>
            Save
          </SmallButton>
        </div>
      </section>

      <section className={card} aria-labelledby="backup-title">
        <h2 id="backup-title" className="m-0 text-lg font-extrabold">
          Settings backup
        </h2>
        <p className="m-0 text-[13px] leading-normal text-dim">
          A file with the categories and their rules, the groups and their members, and these settings. It never contains messages, files or passwords: messages are end-to-end encrypted and can't be read here.
        </p>
        <div className="flex flex-wrap gap-2">
          <SmallButton tone="primary" onClick={() => void download()}>
            Download a backup
          </SmallButton>
          <SmallButton onClick={() => file.current?.click()}>Restore from a file…</SmallButton>
          <input ref={file} type="file" accept="application/json,.json" hidden aria-label="Backup file" onChange={(e) => void pick(e.target.files)} />
        </div>
        {restore ? (
          <div role="alertdialog" aria-label="Restore" className="flex flex-col gap-2.5 rounded-xl border border-dashed border-keep-line p-3.5">
            <p className="m-0 text-[13px] leading-normal text-ink-soft">
              Restore <strong className="text-ink">{restore.name}</strong>? Categories are updated with the file's rules (chats that no longer fit end), and groups that don't exist yet are created. Nothing is
              deleted.
            </p>
            <label className="flex flex-col gap-1.5 text-[12.5px] text-dim">
              Type RESTORE to confirm
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="min-h-[42px] max-w-[240px] rounded-field border border-keep-line bg-bg px-3 font-mono text-ink outline-none" />
            </label>
            <div className="flex gap-2">
              <SmallButton tone="warn" disabled={confirm !== "RESTORE"} onClick={() => void runRestore()}>
                Restore
              </SmallButton>
              <SmallButton onClick={() => setRestore(null)}>Cancel</SmallButton>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
