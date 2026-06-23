## WhatsApp Diashow

Turn a Raspberry Pi, or spare browser into a photo slideshow that can be updated remotely through WhatsApp.

This project provides:

- a password-protected dashboard for uploads and library management
- a fullscreen browser player for continuous playback
- WhatsApp image import
- local storage with SQLite-backed indexing and cleanup policies

## Why This Exists

It is especially useful for family events like marriages or birthdays, where everyone can send pictures through WhatsApp and instantly create a cool slideshow on a monitor.

It works well for:

- family photo frames
- weddings, birthdays, and other family events
- event slideshows
- office displays
- always-on Raspberry Pi screens

## Features

- Fullscreen slideshow player
- Password-protected admin dashboard
- Manual image upload
- WhatsApp QR login and automatic image import
- Media library with hide/delete controls
- SQLite media index synced with files on disk
- Configurable slide duration and random order
- Storage cleanup rules by age, count, and total size
- Health/status endpoints for monitoring

## Requirements

- Node.js 20+
- npm 10+
- Chrome or Chromium installed

Chrome/Chromium is required because `whatsapp-web.js` automates WhatsApp Web in a real browser runtime.

## Quick Start

1. Install dependencies.

```bash
npm install
```

2. Create a local env file.

```bash
cp .env.example .env.local
```

3. Set required secrets.

- `APP_PASSWORD`: password for dashboard login
- `SESSION_SECRET`: long random secret for session signing

Example secret generation:

```bash
openssl rand -base64 32
```

4. Start the app.

```bash
npm run dev
```

5. Open the app.

- Dashboard: `http://localhost:3000/dashboard`
- Player: `http://localhost:3000/player`

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `APP_PASSWORD` | Yes | Password used for dashboard login |
| `SESSION_SECRET` | Yes | Secret used to sign session cookies |
| `PUPPETEER_EXECUTABLE_PATH` | No | Explicit Chrome/Chromium path for WhatsApp automation |

## How It Works

1. Images are uploaded manually or received through WhatsApp.
2. Files are stored in `data/library/`.
3. Metadata is indexed in `data/media.db`.
4. The player fetches visible media through `/api/media` and refreshes periodically.
5. Cleanup rules can remove old files when storage limits are exceeded.

## WhatsApp Setup

1. Open the dashboard.
2. Start the WhatsApp service.
3. Scan the QR code with the WhatsApp account that should receive images.
4. Send normal image messages to that account.

After import, the bot reacts with `✅` and marks the chat as seen.

## Runtime Data

The app creates local runtime files inside `data/`:

- `data/library/`: stored images
- `data/media.db`: SQLite database
- `data/media.db-wal`: SQLite write-ahead log
- `data/media.db-shm`: SQLite shared-memory sidecar
- `data/whatsapp-auth/`: persisted WhatsApp session data

These files are generated locally and should not be committed.

## Project Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

## Deployment Notes

- The app expects write access to `data/`.
- Session cookies become `secure` automatically in production.
- If Chrome/Chromium is not auto-detected, set `PUPPETEER_EXECUTABLE_PATH` explicitly.
- For Raspberry Pi deployments, keep the browser player open in kiosk/fullscreen mode.

## Limitations

- View-once WhatsApp photos are not reliably supported.
- Storage is local-only right now; there is no multi-node/shared storage mode.
- The cleanup system is currently policy-based, not archival.

## API Surface

- `GET /api/media`: list visible slideshow items
- `GET /api/media/[id]`: stream a media file
- `GET /api/settings`: read dashboard settings
- `PUT /api/settings`: update dashboard settings
- `GET /api/health`: read storage and app health information
- `GET /api/whatsapp`: read WhatsApp runtime status
- `POST /api/whatsapp`: start, restart, or stop the WhatsApp service

Protected routes require a valid dashboard session.

## Repo Layout

```text
app/
  api/              API routes
  dashboard/        dashboard pages and actions
  login/            login UI and actions
  player/           slideshow player
lib/
  auth.ts           session and password handling
  cleanup.ts        storage policy enforcement
  media-store.ts    file storage and SQLite indexing
  settings.ts       persisted app settings
  whatsapp.ts       WhatsApp runtime integration
data/               runtime-only local data
```

## Troubleshooting

### WhatsApp does not start

- Make sure Chrome or Chromium is installed.
- Set `PUPPETEER_EXECUTABLE_PATH` manually if auto-detection fails.
- Remove stale local auth data in `data/whatsapp-auth/` only if you want to fully re-pair the bot.

### Login fails immediately

- Verify `APP_PASSWORD` matches your `.env.local` value.
- Verify `SESSION_SECRET` is set.

### Images exist on disk but do not appear

- Confirm the files are inside `data/library/`.
- Confirm they are supported image types: `jpg`, `png`, `webp`, `gif`.
- Check whether the media item is hidden in the dashboard.

## Open Source Notes

- Local runtime data, IDE files, and WhatsApp session files are ignored by git.
- Review your local `data/` and `.env` files before publishing a repository snapshot.
- If you fork this project, set your own password and session secret before deployment.

## License

MIT
