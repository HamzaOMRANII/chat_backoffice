import type { ReactNode } from "react";

type Tone = "error" | "warning" | "info" | "ok";
const tones: Record<Tone, string> = {
  error: "border-dashed border-danger text-[#FFC9C9]",
  warning: "border-keep-line bg-keep/10 text-[#F3E3BF]",
  info: "border-line-strong bg-sunken text-ink-soft",
  ok: "border-ok/50 bg-ok/10 text-ok",
};

export function Notice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-field border px-3.5 py-3 text-[13px] leading-relaxed ${tones[tone]}`}>
      {children}
    </div>
  );
}

export function Panel({ title, eyebrow, children, className = "" }: { title?: string; eyebrow?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 ${className}`}>
      {eyebrow ? <p className="eyebrow m-0">{eyebrow}</p> : null}
      {title ? <h2 className="m-0 text-lg font-extrabold">{title}</h2> : null}
      {children}
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-keep/15 text-keep",
  approved: "bg-ok/15 text-ok",
  suspended: "bg-danger/15 text-danger-ink",
  rejected: "bg-line text-dim",
  locked: "bg-danger/15 text-danger-ink",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase ${STATUS_STYLES[status] ?? ""}`}>{status}</span>;
}

/** Wide tables scroll inside their box on small screens. */
export function Table({ head, children, minWidth = 640 }: { head: string[]; children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
      <table className="w-full border-collapse text-[13.5px]" style={{ minWidth }}>
        <thead>
          <tr className="text-left font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim">
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-line [&_td]:px-4 [&_td]:py-3">{children}</tbody>
      </table>
    </div>
  );
}

export function SmallButton({ children, onClick, tone = "default", disabled, type = "button" }: { children: ReactNode; onClick?: () => void; tone?: "default" | "warn" | "danger" | "primary"; disabled?: boolean; type?: "button" | "submit" }) {
  const styles = {
    default: "border border-line-strong bg-panel text-ink hover:border-accent",
    primary: "border-0 bg-brand text-white hover:bg-brand-hover",
    warn: "border border-keep-line bg-panel text-keep",
    danger: "border border-dashed border-danger bg-transparent font-mono text-xs uppercase tracking-[0.04em] text-danger-ink before:content-['[_'] after:content-['_]'] hover:bg-danger/10",
  }[tone];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`min-h-[42px] rounded-field px-3.5 text-[13.5px] font-semibold disabled:opacity-50 ${styles}`}>
      {children}
    </button>
  );
}
