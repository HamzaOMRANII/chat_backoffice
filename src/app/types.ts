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

export type FriendshipRow = {
  id: string;
  status: "pending" | "accepted";
  direction: "sent" | "received";
  via: "id" | "invite";
  createdAt: string;
  acceptedAt: string | null;
  user: { id: string; username: string; status: Status; online: boolean; lastSeenAt: string | null };
  sharedCategoryIds: string[];
  categoryId: string | null;
  categoryChosen: boolean;
  paused: boolean;
};

export type UserContacts = { personalId: string | null; contacts: FriendshipRow[]; requests: FriendshipRow[] };

export type ChatRow = {
  id: string;
  people: { id: string; username: string }[];
  label: string;
  mode: "keep" | "auto";
  retentionMinutes: number;
  status: "invited" | "active" | "ended";
  category: string | null;
  startedBy: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  endedAt: string | null;
  endReason: string | null;
  endedBy: string | null;
  lastMessageAt: string | null;
  messagesSent: number;
  stored: { count: number; bytes: number; nextExpiry: string | null };
};

export type MessageMeta = { id: string; from: string; to: string; size: number; sentAt: string; deliveredAt: string | null; readAt: string | null; expiresAt: string };

export type Dashboard = {
  users: Record<Status, number>;
  online: { total: number; android: number };
  chats: { active: number; keep: number; auto: number; invited: number };
  messages: { last24h: number; stored: number; storedBytes: number };
  attention: { pending: { id: string; username: string; at: string }[]; locked: { id: string; username: string; until: string }[]; pausedContacts: number };
  logins: { username: string; userId: string; at: string; deviceName: string | null; platform: string | null }[];
};

/** A live chat: who, when, how long. Nothing typed is ever stored. */
export type LiveRow = {
  id: string;
  label: string;
  status: "invited" | "active" | "ended";
  category: string | null;
  startedBy: string | null;
  invitedAt: string;
  startedAt: string | null;
  endedAt: string | null;
  endReason: string | null;
  endedBy: string | null;
};
