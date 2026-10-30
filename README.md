# H_CHAT backoffice

Admin web app for H_CHAT (`adminchat.omranisystems.com`, behind the omranisystems.com gate, then its own
admin sign-in with an email code). React 19 + Vite + TypeScript + Tailwind 4, same design tokens as `chat_app`.
It talks only to `/api/admin/*` on `chat_backend` and never sees message content (end-to-end encrypted).
Full system documentation: `/projects/chat_documentation/`. When something breaks:
`/projects/chat_backend/docs/TROUBLESHOOTING.md`.

## Start in 5 minutes

```bash
npm ci
npm run dev      # proxies /api to the backend on 127.0.0.1:12000
npm run check    # code checker + types + tests: run before every commit
```

Create an administrator once on the backend: `cd ../chat_backend && npm run create-admin`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Live reload |
| `npm test` | Tests (jsdom + Testing Library, fake server in `src/app/App.test.tsx`) |
| `npm run lint` / `npm run format` | Code checker / house style (Biome) |
| `npm run check` | lint + typecheck + tests |
| `npm run build` | → `dist/`, served by nginx directly (live at once) |

## Where things live

```
src/
  app/App.tsx          sign-in and the hash router (#/users, #/chats, …)
  app/types.ts         shapes of the /api/admin answers
  components/Layout.tsx   side menu; ui.tsx = Panel, Table, Notice, SmallButton, StatusBadge
  lib/api.ts           api(path) → /api/admin/<path>
  lib/format.ts        dates, sizes, security-log event labels (EVENT_LABELS)
  pages/               one file per menu entry, matching a file in chat_backend/src/modules/admin/:
    DashboardPage      dashboard.ts       UsersPage, UserDetailsPage, UserContacts   users.ts, contacts.ts
    ChatsPage          chats.ts           LiveSessions   live.ts         GroupsPage   groups.ts
    StoragePage        storage.ts         CategoriesPage categories.ts   LogsPage     logs.ts
    SettingsPage       settings.ts (minimum app version, backup download / restore)
```

## Common changes

New admin action: add the route in `chat_backend/src/modules/admin/<section>.ts` (with `log(...)`), then a
`SmallButton` calling `act(label, path, method, body)` on the page (see `UserDetailsPage.tsx`), then a test in
`App.test.tsx` that answers the route in `routes["METHOD /api/admin/…"]`.

Deploy: `npm run build` (or `bash /projects/hchat-deploy.sh` for everything).
