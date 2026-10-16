export type Status = "pending" | "approved" | "suspended" | "rejected";

export type Rules = {
  modes: ("live" | "keep" | "auto")[];
  maxRetentionDays: number;
  files: "all" | "p2p" | "none";
  export: boolean;
  calls: "none" | "voice" | "video";
};

export type Category = { id: string; name: string; order: number; rules: Rules; members: number };

export type UserRow = {
  id: string;
  username: string;
  email: string;
  status: Status;
  categoryIds: string[];
  createdAt: string;
  lastSeenAt?: string;
  lastDevice: { type: string; at: string; deviceName?: string; city?: string; country?: string; ip?: string } | null;
};

export type DeviceRow = {
  deviceId: string;
  name?: string;
  platform?: string;
  model?: string;
  manufacturer?: string;
  osVersion?: string;
  os?: string;
  browser?: string;
  appVersion?: string;
  screen?: string;
  language?: string;
  timezone?: string;
  network?: string;
  firstSeen: string;
  lastSeen: string;
  logins: number;
};

export type EventRow = { _id: string; type: string; at: string; deviceName?: string; ip?: string; city?: string; country?: string };

export type UserDetails = {
  user: {
    id: string;
    username: string;
    email: string;
    status: Status;
    categoryIds: string[];
    createdAt: string;
    approvedAt?: string;
    approvedBy: string | null;
    privacyAcceptedAt?: string;
    lastSeenAt?: string;
    mustReset?: boolean;
    locked: boolean;
    failedAttempts?: number;
  };
  currentDeviceId: string | null;
  devices: DeviceRow[];
  events: EventRow[];
};
