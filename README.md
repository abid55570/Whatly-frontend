# Whatly — Frontend

The customer-facing web app for **Whatly** (WhatsApp Business automation for
Indian SMBs). Next.js 15 (App Router) PWA — landing page, signup/verify,
owner dashboard, inbox, settings, onboarding.

> **Backend lives in a separate repo:** `Whatly-backend`
> (FastAPI + Postgres + Redis + Celery). This app talks to it over `/api/*`.

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20 LTS+ |
| npm | 10+ (ships with Node) |
| Backend running | `Whatly-backend` on `http://localhost:8000` |

---

## 1. Install

```bash
npm install
```

> An `.npmrc` sets `legacy-peer-deps=true`. It's required: `@react-three/fiber@9`
> / `@react-three/drei@10` declare React 19 peers while this app runs React 18.
> They work fine at runtime; this just lets the install resolve.

## 2. Configure

```bash
cp .env.local.example .env.local
```
Defaults work if the backend is on `localhost:8000`:
```env
NEXT_PUBLIC_API_URL=
BACKEND_INTERNAL_URL=http://localhost:8000
```
- `NEXT_PUBLIC_API_URL` empty = **same-origin**. The browser calls `/api/*` on
  whatever host it loaded; `next.config.mjs` proxies that to the backend.
- `BACKEND_INTERNAL_URL` = where Next forwards `/api/*` server-side. This is
  what makes phone/tunnel testing work with **no CORS** and no hardcoded URLs.

## 3. Run

```bash
npm run dev
```
Open **http://localhost:3000**.

(Make sure the backend is up first — see the `Whatly-backend` README.)

---

## 📱 Test on a phone (Windows) — port forwarding

The app proxies `/api/*` to the backend itself, so you only expose **one** port
(`3000`) and everything works — even over mobile data.

### Option A — Public HTTPS link (any network, recommended)

Cloudflare quick tunnel. Free, HTTPS, no account.

**Install cloudflared once** (PowerShell):
```powershell
winget install --id Cloudflare.cloudflared
```

**Start a tunnel to the dev server:**
```powershell
cloudflared tunnel --url http://localhost:3000
```
It prints a URL like `https://random-words.trycloudflare.com` — open that on
your phone. Stop sharing with **Ctrl+C**.

> No install? If you have Docker:
> ```powershell
> docker run --rm cloudflare/cloudflared:latest tunnel --url http://host.docker.internal:3000
> ```

### Option B — Same WiFi (fastest)

1. Find your PC's IP:
   ```powershell
   ipconfig | findstr IPv4      # e.g. 192.168.1.42
   ```
2. On the phone (same WiFi) open `http://192.168.1.42:3000`.
3. If it won't load, allow inbound TCP **3000** through Windows Firewall for
   Private networks (Docker Desktop usually prompts for this).

> ⚠️ A public tunnel exposes your dev app to the internet while it runs. Don't
> post the link publicly; stop the tunnel when done.

---

## Languages

UI + demo content ship in 6 locales: English, Hindi, Hinglish, Bengali, Urdu,
Bhojpuri. Switch via the language picker (top-right on the landing page); the
choice is stored in a `locale` cookie.

## Build (production)

```bash
npm run build
npm run start          # serves the production build on :3000
```

## Run with Docker (optional)

A `Dockerfile` is included. Set `BACKEND_INTERNAL_URL` to your API and:
```bash
docker build -t whatly-frontend .
docker run -p 3000:3000 -e BACKEND_INTERNAL_URL=http://host.docker.internal:8000 whatly-frontend
```

## Project structure

```
app/           Next.js App Router pages (landing, signup, dashboard, …)
components/    UI + feature components (DemoReels, HookReel, ui/*)
lib/           api client (axios), react-query hooks, utils
stores/        zustand stores (auth)
i18n/          locale config + request handler
messages/      per-locale JSON (en, hi, hinglish, bn, ur, bho)
public/        static assets (favicon, …)
types/         shared API types
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Module not found` after pull | `npm install` again (deps changed). |
| Login/data calls fail | Backend not running, or `BACKEND_INTERNAL_URL` not set to `http://localhost:8000`. |
| `npm install` peer-dep error | Ensure `.npmrc` (legacy-peer-deps) exists. |
| Phone can't load LAN IP | Allow port 3000 through Windows Firewall (Private). |
| Tunnel link 502 | Dev server still starting — wait ~15s, retry. |
