# H_CHAT backoffice

Admin web app for H_CHAT (`adminchat.omranisystems.com`, behind the omranisystems.com gate).
React 19 + Vite + TypeScript, same design tokens as `chat_app`. Talks only to `/api/admin/*`.

```bash
npm ci
npm run dev      # proxies /api to the backend on 127.0.0.1:12000
npm test
npm run build    # -> dist/ (served by nginx)
```

Deploy: `/projects/deploy.sh chat_backoffice`.
