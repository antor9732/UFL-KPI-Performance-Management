# Architecture & Engineering Decision Log

| ID | Date | Area | Decision | Rationale | Alternatives Considered | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ADR-001** | 2026-11-17 | Architecture | Windows Local Host as Single Source of Truth | Operational continuity on factory LAN during internet outages. Data stays on-site. | Cloud SaaS (rejected due to offline requirement and internet dependency). | Approved |
| **ADR-002** | 2026-11-17 | Cloud Backup | Google Drive for Backups Only (Not Live Sync) | Eliminates split-brain database race conditions and sync latency. Fast local queries. | Live multi-PC sync (rejected: high risk of data conflict). | Approved |
| **ADR-003** | 2026-11-17 | Reporting | Native Editable PowerPoint Elements (Zero Screenshots) | Management requires clickable, editable tables, text, and charts matching the 85-slide baseline. | Dashboard screenshot exports (strictly prohibited). | Approved |
| **ADR-004** | 2026-11-17 | Calculations | Weighted Aggregation for YTD Ratios | Averaging monthly efficiency or DHU percentages distorts statistical accuracy. Underlying numerators and denominators must sum across periods. | Simple arithmetic average of percentages (rejected). | Approved |
| **ADR-005** | 2026-11-17 | Security | Tailscale Private Network for Remote Access | Zero exposure of database/HTTP ports to the public internet. No router port forwarding required. | Public router NAT port forwarding (rejected as insecure). | Approved |
| **ADR-006** | 2026-11-17 | Authentication | Google OAuth Identity + Server-Side Invitation Whitelist | Secure enterprise identity management without managing local passwords, gated strictly by admin invitations. | Username/password local store (higher risk of weak credentials). | Approved |
| **ADR-007** | 2026-11-17 | Storage Drive | Project Root on Local D:\ Drive | `C:\Users\PC\OneDrive\Documents` has cloud-filter locks and chokes on `node_modules`/`vendor` sync. `D:\` provides fast, reliable, unblocked local storage. | OneDrive Documents (fails due to cloud placeholder lock). | Approved |
