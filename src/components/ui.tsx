import { useState } from "react";
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

type SortValue = string | number | null | undefined;
export type Sort = { col: number; dir: 1 | -1 } | null;

/**
 * Click a column to sort by it: ascending, then descending, then back to the server's order.
 * `keys[i]` gives the value column i sorts by (null = that column doesn't sort).
 */
export function useSort<T>(rows: T[] | null, keys: (((row: T) => SortValue) | null)[]) {
  const [sort, setSort] = useState<Sort>(null);
  const toggle = (col: number) => setSort((s) => (s?.col !== col ? { col, dir: 1 } : s.dir === 1 ? { col, dir: -1 } : null));
  const key = sort ? keys[sort.col] : null;
  const sorted =
    rows && sort && key
      ? [...rows].sort((a, b) => {
          const x = key(a);
          const y = key(b);
          // Empty values always last
          if (x === y) return 0;
          if (x === null || x === undefined || x === "") return 1;
          if (y === null || y === undefined || y === "") return -1;
          const order = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { sensitivity: "base", numeric: true });
          return order * sort.dir;
        })
      : rows;
  return { sorted, sort: { state: sort, onSort: toggle, sortable: keys.map(Boolean) } };
}

/** ISO dates as numbers, for sorting. */
export const time = (iso?: string | null) => (iso ? Date.parse(iso) : null);

/** Wide tables scroll inside their box on small screens. Headers sort when `sort` is given. */
export function Table({
  head,
  children,
  minWidth = 640,
  sort,
}: {
  head: string[];
  children: ReactNode;
  minWidth?: number;
  sort?: { state: Sort; onSort: (col: number) => void; sortable: boolean[] };
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
      <table className="w-full border-collapse text-[13.5px]" style={{ minWidth }}>
        <thead>
          <tr className="text-left font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim">
            {head.map((h, i) => {
              const active = sort?.state?.col === i ? sort.state.dir : 0;
              return (
                <th key={`${h}-${i}`} className="px-4 py-3 font-medium" aria-sort={active === 1 ? "ascending" : active === -1 ? "descending" : undefined}>
                  {sort?.sortable[i] && h ? (
                    <button
                      type="button"
                      onClick={() => sort.onSort(i)}
                      className={`inline-flex items-center gap-1 bg-transparent p-0 font-mono text-[10.5px] uppercase tracking-[0.12em] hover:text-ink ${active ? "text-ink" : "text-dim"}`}
                    >
                      {h}
                      <span aria-hidden="true" className={active ? "" : "opacity-30"}>
                        {active === -1 ? "▼" : "▲"}
                      </span>
                    </button>
                  ) : (
                    h
                  )}
                </th>
              );
            })}
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
