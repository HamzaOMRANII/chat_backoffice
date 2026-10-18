import type { ReactNode } from "react";
import { Wordmark } from "./Logo";

export type Section = "dashboard" | "users" | "chats" | "groups" | "storage" | "categories" | "logs" | "settings";

const LINKS: [Section, string][] = [
  ["dashboard", "Dashboard"],
  ["users", "Users"],
  ["chats", "Chats"],
  ["groups", "Groups"],
  ["storage", "Storage"],
  ["categories", "Categories"],
  ["logs", "Activity log"],
  ["settings", "Settings"],
];
const LATER: string[] = [];

/** Sidebar + content; the sidebar stacks above the content on a phone. */
export function Layout({ current, pending, admin, onSignOut, children }: { current: Section; pending: number; admin: string; onSignOut: () => void; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-wrap">
      <nav aria-label="Backoffice" className="flex max-w-full flex-[1_1_220px] flex-col gap-1 border-r border-line bg-[#07080C] px-4 py-6">
        <div className="flex flex-col gap-1 px-2.5 pb-5">
          <span className="text-lg">
            <Wordmark />
          </span>
          <span className="eyebrow">backoffice</span>
        </div>
        {LINKS.map(([id, label]) => (
          <a
            key={id}
            href={`#/${id}`}
            aria-current={current === id ? "page" : undefined}
            className={`rounded-[10px] border px-3 py-2.5 text-sm no-underline ${current === id ? "border-line-strong bg-raised font-bold text-ink" : "border-transparent font-semibold text-dim hover:text-ink"}`}
          >
            {label}
            {id === "users" && pending > 0 ? <span className="font-mono text-[11px] text-accent-soft"> · {pending} pending</span> : null}
          </a>
        ))}
        {LATER.map((label) => (
          <span key={label} className="px-3 py-2.5 text-sm font-semibold text-[#4A4F63]">
            {label}
          </span>
        ))}
        <div className="mt-auto flex flex-col gap-2 border-t border-dashed border-line-strong px-2.5 pt-4">
          <span className="font-mono text-xs text-dim">signed in as {admin}</span>
          <button type="button" onClick={onSignOut} className="min-h-10 self-start bg-transparent p-0 text-left text-sm font-semibold text-link hover:text-ink">
            Sign out
          </button>
        </div>
      </nav>
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 px-5 py-7 sm:px-8">{children}</main>
    </div>
  );
}
