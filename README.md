## WhatsApp Diashow

Password-protected slideshow dashboard for Raspberry Pi or any small always-on display. Import images manually or through WhatsApp, manage the library in a browser, and run a fullscreen player for continuous playback.

## Features

- Browser-based slideshow player with fullscreen mode and live image counter
- Password-protected dashboard for uploads and media management
- WhatsApp integration via `whatsapp-web.js` with QR login and automatic image import
- SQLite-backed media index with filesystem sync
- Configurable slideshow duration and random order
- Storage policies for retention days, max file count, and max storage size
- Health endpoint and dashboard status panels

## Tech Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- SQLite via `better-sqlite3`
- `whatsapp-web.js`

## Requirements

- Node.js 20+
- npm 10+
- Chrome or Chromium installed for WhatsApp Web automation

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env.local
```

3. Set these required values:

- `APP_PASSWORD`: dashboard login password
- `SESSION_SECRET`: long random secret for signed sessions

4. Start the app:

```bash
npm run dev
```

5. Open:

- Dashboard: `http://localhost:3000/dashboard`
- Player: `http://localhost:3000/player`

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `APP_PASSWORD` | Yes | Password used for dashboard login |
| `SESSION_SECRET` | Yes | Secret used to sign session cookies |
| `PUPPETEER_EXECUTABLE_PATH` | No | Explicit Chrome/Chromium path for WhatsApp automation |

## WhatsApp Setup

1. Open the dashboard.
2. Start the WhatsApp service.
3. Scan the QR code with the WhatsApp account that should receive images.
4. Send standard image messages to that account.

Imported images are stored under `data/library/` and indexed in `data/media.db`.

## Project Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

## Deployment Notes

- The app stores runtime data in the local `data/` directory.
- For Raspberry Pi deployments, make sure the app process can write to `data/`.
- If Chrome/Chromium is not auto-detected, set `PUPPETEER_EXECUTABLE_PATH` explicitly.
- Session cookies are marked `secure` automatically in production.

## Limitations

- View-once WhatsApp photos are not reliably supported by `whatsapp-web.js`.
- This project currently uses local disk storage and SQLite only.

## Open Source Notes

- Runtime data, local IDE files, and WhatsApp session files are intentionally ignored by git.
- Before publishing, review your local `data/` directory and `.env` files to make sure no private content is exposed.

## License

MIT
