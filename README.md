# Utah Fashion Ltd. - KPI Performance Management & Automated Presentation System

The **UFL KPI Performance Management System** is an enterprise-grade, local-first performance intelligence and executive reporting suite built for **Utah Fashion Ltd.**. It delivers automated 85-slide PowerPoint deck generation matching the official factory baseline (`KPI Presentation-Oct (All).pptx`), seamless monthly data cloning, dynamic personnel/role photo management, real-time spreadsheet data entry, and secure LAN/Tailscale distribution.

---

## 🚀 Key Highlights & User Capabilities

### 1. 🖥️ Standalone Desktop App & Zero-Install Client Distribution
- **Zero External Server Required**: Clients do NOT need Laragon, XAMPP, Apache, Node.js, or MySQL installed.
- **Embedded Portable Runtimes**: Bundles a standalone portable PHP 8.4 runtime (`runtime/php/`) and Node.js (`runtime/node/node.exe`) directly inside the application folder!
- **Native Windows GUI Executable (`UFL_KPI_App.exe`)**:
  - Double-clicking `UFL_KPI_App.exe` launches the application instantly with zero black console windows.
  - Automatically loads the local engine, connects to the portable pre-seeded SQLite database (`server\database\database.sqlite`), and opens the dashboard in the default browser.
  - Adds a Utah Fashion Ltd. System Tray icon in the Windows taskbar for 1-click access and clean shutdown.
- **Official Windows Installer**: Inno Setup script (`installer/setup.iss`) compiles an `.exe` setup wizard that installs the system and places a desktop shortcut.
- **Alternative Launchers**: `UFL_KPI_Launcher.vbs` (silent script launcher) and `start-ufl-kpi.bat` (batch launcher).

### 2. 🔄 Monthly Roll-Forward / 1-Click Baseline Cloning
> *"proti mas e jehetu same types er data bosiye kaj korte hoy tai chaile previous pptx er data gulo current mas e use kora jay sudhu jekhane change kora dorkar sekhane change korbe."*
- Click **"Copy Previous Month Baseline"** in the **Monthly Data Entry** tab.
- Automatically carries over all 45 production lines, targets, budgets, operator counts, standard SMV, and line cost baselines from the prior month (e.g. October 2026 into November 2026).
- Floor staff and In-Charges only edit what actually changed in the real-time reactive spreadsheet grid.
- Instant atomic batch saving (`PUT /api/v1/submissions/{id}/batch-update`).

### 3. 📸 Real-Time Personnel & Role Avatar Photo Manager
> *"and role gulor image jeno change kora jay anytime."*
- Full management of photos for **Department Heads** (PM-Hafizur Rahman, FM-Mohibul Islam, AGM-Rafiq, PM-Mr. Suhag, AGM-Mr. Jahangir, AGM-Mr. Azam, EMBM-Mr. Zulfiker, SFM-Mr. Kamal, AGM-Mr. Hafiz Al Asad), **Line Supervisors**, and **System Roles & Badges**.
- Upload or update any photo anytime with instant live preview.
- All updated photos are immediately embedded into live dashboards and exported PowerPoint presentations!

### 4. 📊 85-Slide Automated Native PowerPoint Deck Generator
- Generates 100% editable Microsoft PowerPoint (`.pptx`) presentations matching the official 85-slide deck:
  - **Slide 1**: Cover & Review Title
  - **Slide 2**: Factory Executive KPI Scorecard
  - **Slides 3-17**: Knit-01 (Overview, Lines 1-9 DHU & Defect Charts, Line Cost, Shipment, NPT, Leftovers)
  - **Slides 18-40**: Knit-02 (Overview, Lines 1-18 DHU & Defect Charts, Leftovers, NPT, Summary)
  - **Slides 41-55**: Knit-03 (Overview, Lines 1-9 DHU & Defect Charts, Line Cost, Shipment, NPT, Summary)
  - **Slides 56-71**: Woven (Overview, Lines 1-9 DHU & Defect Charts, Costing Productivity, Wastage, NPT, Shipment)
  - **Slides 72-76**: Cutting (Overview, Supervisors Fozlu, Salam, Sumon & Delower, Fabric Utilization)
  - **Slides 77-80**: Printing ($2500 Daily Target), Embroidery, Schiffli, Specialized Summary
  - **Slides 81-84**: Sample (Capacity, Lead Time, Buyer-wise RFT %, Rejection Root Cause)
  - **Slide 85**: Executive Conclusion & Corrective Roadmap
- **Zero Screenshots**: Every slide contains true native PowerPoint shapes, tables, chart series, and photo cards editable in PowerPoint!
- **Dynamic Presentation Background & Themes**:
  - **Executive Navy (Dark)**: Official boardroom dark navy `#0B132B` theme with cyan and cobalt accents.
  - **Corporate White (Light / Printable)**: Crisp white `#FFFFFF` background with slate/navy contrast, ideal for black-and-white printing and daylight projectors.
  - **Industrial Slate (Dark)**: Charcoal `#0F172A` theme with emerald metrics.
  - **Royal Blue & Gold**: Deep royal blue `#172554` with gold and amber accents.

### 5. 🧮 Weighted YTD Aggregation & Zero-Denominator Safety
- Implements `App\Services\KpiCalculationEngine` with strict division-by-zero guards.
- Respects industrial apparel standards: monthly percentages (DHU, efficiency, achievement) are never averaged directly; numerators and denominators are aggregated across reporting periods.

---

## 📁 Repository & Directory Layout

```
D:\UFL KPI Performance Management
├── client/                     # React 19 + TypeScript + Tailwind CSS v4 Single Page App
│   ├── src/components/         # ExecutiveDashboard, DepartmentAnalytics, MonthlyDataEntry,
│   │                           # PersonnelManager, PresentationGenerator, SystemSettings
│   └── dist/                   # Production build assets
├── server/                     # Laravel 11/13 Backend API & Reporting Engine
│   ├── app/Models/             # 22 Normalized Eloquent Domain Models
│   ├── app/Services/           # KpiCalculationEngine, PresentationDataService
│   ├── app/Http/Controllers/   # DashboardController, KpiSubmissionController, PersonnelController, ReportExportController
│   ├── database/seeders/       # MasterOrganizationSeeder, ReportingPeriodsSeeder, HistoricalDataSeeder (2026 data)
│   ├── scripts/                # generate_presentation.js (Native 85-slide pptxgen engine)
│   ├── public/                 # Bundled SPA assets & public storage link
│   └── tests/Feature/          # 19 Feature & Unit tests (100% Passing)
├── desktop/                    # Native Electron Desktop Application Wrapper
│   ├── main.cjs                # Background server launcher & native desktop window
│   └── package.json            # Electron configuration
├── installer/                  # Inno Setup Script
│   └── setup.iss               # Builds 1-click Windows client installer setup.exe
├── start-ufl-kpi.bat           # 1-Click interactive launcher
├── stop-ufl-kpi.bat            # Clean server shutdown script
├── UFL_KPI_Launcher.vbs        # Silent background launcher (no command prompt popup)
├── DECISION_LOG.md             # Architectural & engineering decisions log
└── README.md                   # System documentation
```

---

## 🏃 Running the Application

### Client PC (no server setup needed)
1. Run the installer `UFL_KPI_Performance_Setup_v1.0.1.exe` (no admin rights required).
2. Open **Utah Fashion Ltd. KPI System** from the desktop shortcut.
3. The first launch takes about a minute (it unpacks the bundled PHP libraries). After that it starts in a few seconds.

`UFL_KPI_App.exe` does everything automatically:
- uses the bundled portable PHP (`runtime\php`) and Node.js (`runtime\node`), so Laragon, XAMPP, Apache, MySQL or Node do not need to be installed
- unpacks `server\vendor.zip`, creates `server\.env` with a unique `APP_KEY`, and creates `server\database\database.sqlite` from the seeded `ufl_kpi_db`
- runs pending database migrations, so updates are safe
- starts the local engine on `127.0.0.1` (port 8000, or the next free port up to 8010), opens the browser, and adds a tray icon
- stops the PHP server when you choose **Stop Server & Exit** or close the launcher
- writes its log to `server\storage\logs\launcher.log`

Updates and reinstalls never overwrite the client's database (`server\database\database.sqlite`).

`start-ufl-kpi.bat` and `UFL_KPI_Launcher.vbs` both simply start `UFL_KPI_App.exe`. `stop-ufl-kpi.bat` stops it.

### Building a new installer (developer PC only)
Run `build-release.bat`. It builds the client into `server\public`, installs production Composer packages, packs `server\vendor.zip`, compiles `UFL_KPI_App.exe` from `desktop\Launcher.cs` using the `csc.exe` that comes with Windows, and compiles `installer\setup.iss` with Inno Setup 6.

### Desktop Window (Electron, optional/dev)
```powershell
cd desktop
npm install
npm start
```

---

## 🧪 Automated Test Suite Verification

Run all 19 feature and unit tests:
```powershell
cd 'D:\UFL KPI Performance Management\server'
php artisan test
```
*Current Status: 19 passed, 241 assertions, 0 failures.*
