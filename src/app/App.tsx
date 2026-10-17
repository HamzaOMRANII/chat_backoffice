import { useCallback, useEffect, useState } from "react";
import { Layout, type Section } from "../components/Layout";
import { api, ApiError } from "../lib/api";
import { CategoriesPage } from "../pages/CategoriesPage";
import { ChatsPage } from "../pages/ChatsPage";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";
import { LogsPage } from "../pages/LogsPage";
import { UserDetailsPage } from "../pages/UserDetailsPage";
import { UsersPage } from "../pages/UsersPage";
import type { Category, Status } from "./types";

type Route = { section: Section; userId?: string };

function parseHash(): Route {
  const [, section, id] = location.hash.split("/");
  if (section === "categories" || section === "logs" || section === "chats") return { section };
  if (section === "users") return { section: "users", userId: id || undefined };
  return { section: "dashboard" };
}

export function App() {
  const [admin, setAdmin] = useState<string | null | undefined>(undefined);
  const [route, setRoute] = useState<Route>(parseHash);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    api<{ admin: { username: string } }>("/auth/me")
      .then((r) => setAdmin(r.admin.username))
      .catch(() => setAdmin(null));
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setCategories((await api<{ categories: Category[] }>("/categories")).categories);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setAdmin(null);
    }
  }, []);
  useEffect(() => {
    if (admin) void loadCategories();
  }, [admin, loadCategories]);

  const onCounts = useCallback((counts: Record<Status, number>) => setPending(counts.pending), []);

  async function signOut() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setAdmin(null);
  }

  if (admin === undefined) return <main className="bg-grid min-h-dvh" aria-busy="true" />;
  if (admin === null) return <LoginPage onSignedIn={setAdmin} />;

  return (
    <Layout current={route.section} pending={pending} admin={admin} onSignOut={signOut}>
      {route.section === "users" && route.userId ? (
        <UserDetailsPage key={route.userId} id={route.userId} categories={categories} onBack={() => (location.hash = "#/users")} />
      ) : null}
      {route.section === "users" && !route.userId ? <UsersPage categories={categories} onCounts={onCounts} onOpen={(id) => (location.hash = `#/users/${id}`)} /> : null}
      {route.section === "categories" ? <CategoriesPage categories={categories} reload={loadCategories} /> : null}
      {route.section === "logs" ? <LogsPage /> : null}
      {route.section === "dashboard" ? <DashboardPage /> : null}
      {route.section === "chats" ? <ChatsPage categories={categories} /> : null}
    </Layout>
  );
}
