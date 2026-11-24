# KPI Performance Management System

A desktop application for garment factories to record monthly KPIs and produce the monthly KPI PowerPoint deck — line by line, with everyone's photos — in one click.

It is company-neutral: the company name, logo, cover texts, departments, lines, people and KPI goals are all set in **Settings**. Nothing about a specific company is built in.

## What it does

- **Monthly data entry** per department: efficiency, productivity, line cost (profit/loss, idle hour loss, total difference), sewing and finishing DHU for every line, plus NPT reasons. "Copy last month's targets" / "Copy all of last month" fill a new month in one click.
- **Units** (cutting, printing, embroidery, schiffli, sample …): plan / produce, efficiency, earnings and DHU for the whole unit and for each supervisor.
- **People & photos**: department head, six photo cards per line (IE, SUP, SUP, LC, APM, QC by default — roles are editable, any card can be marked *Vacant*), and unit supervisors.
- **Presentation**: an editable PowerPoint in the classic monthly layout — cover, KPI goal tables, "Line wise Cost Achievement" per department, one slide per line (photo cards, year-to-date table with red/green cells, finishing DHU, profit/loss and sewing DHU charts), NPT reasons, unit and supervisor-wise slides, thank-you slide.
- **Dashboards** for the whole factory and each department.
- **Accounts & backup**: the app always opens as a default local user. Anyone can optionally *Sign in with Google*; while signed in, the database and photos are backed up automatically to a folder in their Google Drive and can be restored from there. Backups can also be downloaded / restored as a `.zip` file.

## Installing on a client PC

Run `KPI_Performance_System_Setup_v2.0.0.exe` → Next → Install → Finish. No administrator rights, server, database or other software are needed: PHP, Node.js and SQLite are bundled. The app appears in the Start Menu, on the Desktop and in **Settings → Apps** (uninstall from there). Updates and reinstalls keep the client's data; uninstall asks whether to delete the data too.

The app opens in its own window (Microsoft Edge "app mode", built into Windows 10/11). Closing the window stops the app.

### Google sign-in (optional, once per installation)

1. Google Cloud Console → APIs & Services → enable **Google Drive API**.
2. Credentials → Create OAuth client ID → type **Desktop app**.
3. In the app: Settings → Account & backups → *Google sign-in setup* → paste Client ID and Client Secret → Save.

To ship the credentials with every installation instead, put `GOOGLE_CLIENT_ID=` and `GOOGLE_CLIENT_SECRET=` into `server/desktop-env.template` before building the installer.

## Building the installer (developer PC)

`build-release.bat` builds the screens, installs production PHP libraries, bundles the PowerPoint engine, compiles `KPI_System.exe` (with the `csc.exe` that ships with Windows) and builds the installer with NSIS 3 into `dist-installer\`.

## Layout

```
client/                 React + TypeScript + Tailwind screens (built into server/public)
server/                 Laravel API, SQLite database, PowerPoint engine
  app/Services/         ReportDataService (YTD figures), BackupService, GoogleService
  scripts/              generate_presentation.js (pptxgenjs) + backgrounds
  database/seed.sqlite  neutral demo data for a fresh install
desktop/Launcher.cs     KPI_System.exe: starts the bundled PHP server and the app window
installer/kpi-setup.nsi Windows installer
runtime/                portable PHP 8.4 and Node.js
```

## Tests

```
cd server
php artisan test
```
