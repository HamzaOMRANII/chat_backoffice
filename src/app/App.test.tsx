import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "./App";

type Route = (body: Record<string, unknown>) => [number, unknown];
let routes: Record<string, Route>;
const calls: { method: string; path: string; body: Record<string, unknown> }[] = [];

const CATEGORIES = ["Family", "Friends", "Pro", "Externals", "Secret", "Confidential"].map((name, i) => ({
  id: String(i + 1).padStart(24, "0"),
  name,
  order: i + 1,
  members: 0,
  rules: { modes: name === "Secret" ? ["live"] : ["live", "keep", "auto"], maxRetentionDays: name === "Secret" ? 0 : 7, files: "all", export: true, calls: "video" },
}));
const PENDING = {
  id: "a".repeat(24),
  username: "leila.b",
  email: "leila@example.com",
  status: "pending",
  categoryIds: [],
  createdAt: new Date().toISOString(),
  lastDevice: { type: "signup", at: new Date().toISOString(), deviceName: "Galaxy S23", ip: "203.0.113.9", country: "FR" },
};

const DASHBOARD = {
  users: { pending: 1, approved: 12, suspended: 1, rejected: 2 },
  online: { total: 5, android: 3 },
  chats: { active: 9, keep: 6, auto: 3, invited: 2 },
  messages: { last24h: 312, stored: 1420, storedBytes: 3_250_000 },
  attention: { pending: [{ id: "a".repeat(24), username: "rami.t", at: new Date().toISOString() }], locked: [{ id: "b".repeat(24), username: "nadia.s", until: new Date(Date.now() + 9e5).toISOString() }], pausedContacts: 2 },
  logins: [{ username: "leila.b", userId: "c".repeat(24), at: new Date().toISOString(), deviceName: "Galaxy S23", platform: "android" }],
};

beforeEach(() => {
  calls.length = 0;
  location.hash = "#/users";
  routes = {
    "GET /api/admin/auth/me": () => [401, { error: "Sign in", code: "unauthorized" }],
    "POST /api/admin/auth/login": () => [200, { challengeId: "c".repeat(24), emailHint: "b•••s@example.com" }],
    "POST /api/admin/auth/verify-code": () => [200, { admin: { id: "1", username: "boss" } }],
    "GET /api/admin/categories": () => [200, { categories: CATEGORIES }],
    "GET /api/admin/users?status=pending": () => [200, { users: [PENDING], counts: { pending: 1, approved: 0, suspended: 0, rejected: 0 } }],
    [`POST /api/admin/users/${PENDING.id}/approve`]: () => [200, { ok: true }],
    "GET /api/admin/dashboard": () => [200, DASHBOARD],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      calls.push({ method, path, body });
      const [status, data] = routes[`${method} ${path}`]?.(body) ?? [404, { error: "Not found" }];
      return new Response(JSON.stringify(data), { status });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("backoffice", () => {
  it("signs in with password + email code and approves a pending request with a category", async () => {
    render(<App />);
    fireEvent.change(await screen.findByLabelText("Admin username"), { target: { value: "boss" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct horse battery" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Email code")).toBeInTheDocument();
    "123456".split("").forEach((d, i) => fireEvent.change(screen.getByLabelText(`Digit ${i + 1}`), { target: { value: d } }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const review = await screen.findByRole("complementary", { name: "Review leila.b" });
    const approve = within(review).getByRole("button", { name: "Approve" });
    expect(approve).toBeDisabled(); // needs at least one category
    fireEvent.click(within(review).getByLabelText("Pro"));
    fireEvent.click(within(review).getByLabelText("Confidential"));
    fireEvent.click(approve);

    await waitFor(() => expect(calls.some((c) => c.path.endsWith("/approve"))).toBe(true));
    const call = calls.find((c) => c.path.endsWith("/approve"))!;
    expect(call.body.categoryIds).toEqual([CATEGORIES[2]!.id, CATEGORIES[5]!.id]);
    expect(screen.getByText(/1 pending/)).toBeInTheDocument();
  });
});

describe("user contacts", () => {
  it("shows a user's contacts, changes the category a pair uses, and flags paused ones", async () => {
    const id = "b".repeat(24);
    const row = (over: Record<string, unknown>) => ({
      status: "accepted",
      direction: "sent",
      via: "invite",
      createdAt: new Date().toISOString(),
      acceptedAt: new Date().toISOString(),
      categoryChosen: false,
      paused: false,
      ...over,
    });
    routes["GET /api/admin/auth/me"] = () => [200, { admin: { id: "1", username: "boss" } }];
    routes[`GET /api/admin/users/${id}`] = () => [
      200,
      {
        user: { id, username: "hamza", email: "hamza@example.com", status: "approved", categoryIds: ["2".padStart(24, "0"), "3".padStart(24, "0")], createdAt: new Date().toISOString(), approvedBy: "boss", locked: false },
        currentDeviceId: null,
        devices: [],
        events: [],
      },
    ];
    routes[`GET /api/admin/users/${id}/contacts`] = () => [
      200,
      {
        personalId: "HC-U2C2-S832",
        contacts: [
          row({ id: "f1", user: { id: "c".repeat(24), username: "leila.b", status: "approved", online: true, lastSeenAt: null }, sharedCategoryIds: ["2".padStart(24, "0"), "3".padStart(24, "0")], categoryId: "2".padStart(24, "0") }),
          row({ id: "f2", user: { id: "d".repeat(24), username: "rami.t", status: "approved", online: false, lastSeenAt: null }, sharedCategoryIds: [], categoryId: null, paused: true }),
        ],
        requests: [row({ id: "f3", status: "pending", direction: "received", user: { id: "e".repeat(24), username: "sara.m", status: "approved", online: false, lastSeenAt: null }, sharedCategoryIds: ["2".padStart(24, "0")], categoryId: "2".padStart(24, "0") })],
      },
    ];
    routes["PUT /api/admin/friendships/f1/category"] = () => [200, { ok: true }];
    location.hash = `#/users/${id}`;
    render(<App />);

    expect(await screen.findByText(/ID HC-U2C2-S832/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Contacts · 2" }));
    const select = screen.getByLabelText("Category for leila.b");
    fireEvent.change(select, { target: { value: "3".padStart(24, "0") } });
    await waitFor(() => expect(calls.some((c) => c.method === "PUT" && c.path === "/api/admin/friendships/f1/category")).toBe(true));
    expect(calls.find((c) => c.method === "PUT")!.body).toEqual({ categoryId: "3".padStart(24, "0") });
    expect(screen.getByText("no shared category")).toBeInTheDocument();
    expect(screen.getByText(/rami.t is paused/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Requests · 1" }));
    expect(screen.getByText("sara.m")).toBeInTheDocument();
  });
});

describe("users list", () => {
  it("shows every status in one list under All", async () => {
    const approved = { ...PENDING, id: "f".repeat(24), username: "hamza", email: "hamza@example.com", status: "approved", categoryIds: [CATEGORIES[0]!.id] };
    routes["GET /api/admin/auth/me"] = () => [200, { admin: { id: "1", username: "boss" } }];
    routes["GET /api/admin/users"] = () => [200, { users: [PENDING, approved], counts: { pending: 1, approved: 1, suspended: 0, rejected: 0 } }];
    render(<App />);
    fireEvent.click(await screen.findByRole("tab", { name: /^All/ }));
    expect(await screen.findByText("hamza")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("approved")).toBeInTheDocument();
    // A pending row still opens the approval panel
    fireEvent.click(screen.getByText("leila@example.com"));
    expect(await screen.findByRole("button", { name: "Approve" })).toBeInTheDocument();
  });
});

describe("dashboard and chats", () => {
  const CHAT = {
    id: "d".repeat(24),
    people: [
      { id: "1".repeat(24), username: "hamza" },
      { id: "2".repeat(24), username: "leila.b" },
    ],
    label: "hamza + leila.b",
    mode: "keep",
    retentionDays: 3,
    status: "active",
    category: "Pro",
    startedBy: "hamza",
    invitedAt: new Date().toISOString(),
    acceptedAt: new Date().toISOString(),
    endedAt: null,
    endReason: null,
    endedBy: null,
    lastMessageAt: new Date().toISOString(),
    messagesSent: 23,
    stored: { count: 23, bytes: 9200, nextExpiry: new Date(Date.now() + 2e8).toISOString() },
  };

  it("opens on the dashboard", async () => {
    location.hash = "";
    routes["GET /api/admin/auth/me"] = () => [200, { admin: { id: "1", username: "boss" } }];
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(await screen.findByText("312")).toBeInTheDocument();
    expect(screen.getByText("rami.t is waiting for approval")).toBeInTheDocument();
    expect(screen.getByText("nadia.s is locked after 5 failed attempts")).toBeInTheDocument();
    expect(screen.getByText("2 paused contacts (no shared category)")).toBeInTheDocument();
  });

  it("lists chats with metadata only and deletes one after typing its name", async () => {
    location.hash = "#/chats";
    routes["GET /api/admin/auth/me"] = () => [200, { admin: { id: "1", username: "boss" } }];
    routes["GET /api/admin/chats?status=active"] = () => [200, { chats: [CHAT], counts: { active: 1, invited: 0, ended: 0 } }];
    routes[`GET /api/admin/chats/${CHAT.id}`] = () => [
      200,
      { chat: CHAT, messages: [{ id: "m1", from: "hamza", to: "leila.b", size: 184, sentAt: new Date().toISOString(), deliveredAt: new Date().toISOString(), readAt: null, expiresAt: new Date().toISOString() }] },
    ];
    routes[`DELETE /api/admin/chats/${CHAT.id}`] = () => [200, { ok: true, deleted: 23 }];
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "hamza + leila.b" }));
    const panel = await screen.findByRole("complementary", { name: "Chat hamza + leila.b" });
    expect(within(panel).getByText("hamza → leila.b")).toBeInTheDocument();
    expect(within(panel).getByText("184 B")).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Delete chat history" }));
    const confirm = within(panel).getAllByRole("button", { name: "Delete chat history" })[0]!;
    expect(confirm).toBeDisabled();
    fireEvent.change(within(panel).getByLabelText(/Type “hamza \+ leila.b” to confirm/), { target: { value: "hamza + leila.b" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(calls.find((c) => c.method === "DELETE")?.body).toEqual({ confirm: "hamza + leila.b" }));
  });
});
