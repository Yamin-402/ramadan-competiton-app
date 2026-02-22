# Ramadan Admin Panel

Web admin panel for backend routes under `/admin`.

## Setup

1. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL`.
2. Install dependencies:
   - `npm --prefix admin-web install`
3. Run backend (`npm run dev`) and then panel:
   - `npm run admin:dev`

## Access From Mobile / Other Devices

- When you run `npm run admin:dev`, Vite listens on all interfaces.
- Open from same Wi-Fi network:
  - `http://<YOUR_PC_LOCAL_IP>:4174`
- Ensure Windows Firewall allows inbound traffic on `4174` and backend port `3000`.
what does "
For internet-wide access (outside local network), run the panel/backend behind a public server or tunnel (Cloudflare Tunnel / ngrok / VPS). 
Without that, access is limited to your local network.

## Login

- Use an account with role `ADMIN` or `SUPER_ADMIN`.
- Login uses `POST /auth/session`.

## Covered features

- Dashboard (campaign + leaderboard summary)
- Tasks (create + list with dependencies/rules/conditions)
- Counters (create + list)
- Task Counter Rules (create/list/delete)
- Manual point adjustments
- Notification campaigns (create + list stats)
- Daily questions (create + reveal + list)
- Leaderboard view
