# System architecture

**Desktop launcher** — `KPI_System.exe` (C#, .NET Framework 4.x, ships with Windows). On start it
creates `server/.env` with a unique `APP_KEY`, creates `server/database/database.sqlite` from
`seed.sqlite` when missing, runs migrations, starts the bundled PHP built-in server on the first free
port 8000-8010 (router: `server/server.php`), opens the app in an Edge/Chrome app window and keeps a
tray icon. Closing the window stops the server (Windows Job Object).

**Server** — Laravel + SQLite. Main tables: `departments` (kind `lines` or `unit`), `lines`,
`line_staff` (6 photo slots per line), `line_metrics` (per line per month; month 0 = previous-year
average), `npt_reasons`, `kpi_goals`, `unit_people`, `unit_metrics`, `app_settings`, `users`,
`backup_logs`. Photos live in `storage/app/public/photos` and are served at `/storage/photos/...`.

**Reports** — `ReportDataService` builds year-to-date rows for a month; `scripts/generate_presentation.js`
(pptxgenjs, bundled into one file, run with the bundled `node.exe`) writes the editable deck.

**Accounts & backup** — default local user always available. Optional Google sign-in (OAuth for
installed apps, loopback redirect `http://127.0.0.1:<port>/auth/google/callback`, scope `drive.file`).
Tokens are stored encrypted. Backups are zip files (SQLite snapshot via `VACUUM INTO` + photos),
uploaded to "<Company> - KPI System Backups" in the user's Drive after changes (throttled) and on demand.
