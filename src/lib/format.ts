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
