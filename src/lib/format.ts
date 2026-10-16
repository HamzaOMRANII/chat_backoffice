export function dateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { year: "numeric", month: "2-digit", day: "2-digit" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function ago(iso?: string | null) {
  if (!iso) return "never";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export const place = (city?: string | null, country?: string | null) => [city, country].filter(Boolean).join(", ") || "—";

export const EVENT_LABELS: Record<string, string> = {
  signup: "sign-up",
  login: "login",
  logout: "logout",
  kicked: "kicked",
  failed_password: "wrong password",
  failed_code: "wrong code",
  failed_passcode: "wrong passcode",
  passcode_used: "passcode used",
  admin_reset_used: "reset code used",
  credentials_reset: "new credentials",
  email_changed: "email changed",
  locked: "locked",
};

export function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export const modeLabel = (c: { mode: string; retentionDays: number }) => `${c.mode === "auto" ? "AUTO" : "KEEP"} · ${c.retentionDays}D`;
export const modeTone = (mode: string) => (mode === "auto" ? "border-auto-line text-auto" : "border-keep-line text-keep");

export const END_REASONS: Record<string, string> = {
  ended_by_user: "ended by a participant",
  declined: "invitation declined",
  cancelled: "invitation cancelled",
  invite_expired: "invitation expired",
  expired: "all messages expired",
  rules_changed: "category rules changed",
  contact_unavailable: "contact removed, paused or blocked",
  deleted_by_admin: "deleted by admin",
};
