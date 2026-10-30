/** An error answered by the API: { error, code, details }. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** Backoffice API call (same origin, admin session cookie). */
export async function api<T = Record<string, unknown>>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/admin${path}`, {
      method: options.method ?? (options.body === undefined ? "GET" : "POST"),
      headers: options.body === undefined ? {} : { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, "network", "No connection to the server.");
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok)
    throw new ApiError(
      res.status,
      String(data.code ?? "error"),
      String(data.error ?? "Something went wrong"),
      data.details as Record<string, unknown> | undefined,
    );
  return data as T;
}

const DEVICE_ID_KEY = "hc.admin.deviceId";

/** Identifies this browser in the admin's own security log. */
export function deviceInfo() {
  let deviceId: string;
  try {
    deviceId = localStorage.getItem(DEVICE_ID_KEY) ?? crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  } catch {
    deviceId = crypto.randomUUID();
  }
  return {
    deviceId,
    platform: "web" as const,
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language?.slice(0, 20),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone?.slice(0, 60),
  };
}
