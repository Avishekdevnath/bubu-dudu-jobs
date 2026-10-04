# User Guide: Bubu-Dudu Job Portal & Autonomous Watchdog

Welcome to your personalized recruitment command center! This tool is built specifically for **Avishek Devnath (CSE)** and **Chandrima Devnath (Agriculture)** to ensure you **never miss an eligible circular**, **always catch urgent application deadlines**, and **receive automated WhatsApp alerts directly to your private group**.

---

## 1. Quick Start

### Starting the Web Portal Locally
Open PowerShell or Command Prompt in `s:\Bubu-Dudu Job Gallary\job-portal` and run:
```powershell
npx serve -l 5173
```
Or simply double-click [`index.html`](file:///s:/Bubu-Dudu%20Job%20Gallary/job-portal/index.html) in any modern web browser!

---

## 2. The 3 Core Post Categories

In accordance with your core recruitment monitoring workflow, circulars are dynamically classified into **3 prominent lifecycle categories**:

| Category | Filter Rule | UI Badge | Purpose |
| :--- | :--- | :--- | :--- |
| **✨ Just Came In** | `0 <= daysOld <= 5` | `✨ Just Dropped Today!` / `✨ New (Xd ago)` | Catch brand new circulars right after gazette publication so you can prepare certificates, photographs, and signatures early. |
| **🚨 ≤ 3 Days Left** | `0 <= daysLeft <= 3` | `🔥 Last Day Today!` / `⚡ Closes Tomorrow!` / `🚨 3 Days Left` | Emergency urgent alert! Complete fee submission on Teletalk SMS immediately before midnight. |
| **📦 Expired / Archived** | `daysLeft < 0` | `📦 Expired (Xd ago)` | Automatically moved out of the active board. Preserves past applicant copies, syllabus, and official circular PDFs for exam prep. |

In addition, an **`⚡ All Active`** view is always available to see the complete list of open recruitment opportunities.

---

## 3. Mobile Experience & PWA Installation

### 📱 Responsive Mobile-First Design
* **Bottom Navigation Bar:** When opened on mobile devices, a fixed bottom navigation bar lets you switch with one thumb between:
  - `⚡ Active`
  - `✨ Just In`
  - `🚨 ≤ 3 Days`
  - `📦 Expired`
* **Safe Area Support:** Automatically adjusts for iPhone notches and Android system gesture bars (`env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`).
* **Offline Caching:** Powered by [`sw.js`](file:///s:/Bubu-Dudu%20Job%20Gallary/job-portal/sw.js), circulars and the app interface are cached locally on your device so you can view them even without an active internet connection.

### 📲 Installing on Your Phone (PWA)
1. **Android (Chrome / Samsung Internet):**
   - Tap the **"Install App"** button at the top or on the bottom navigation bar.
   - Or tap Chrome's three dots menu $\to$ **"Add to Home Screen"** / **"Install App"**.
   - The app installs as a native, full-screen mobile app with the emerald job radar icon.
2. **iPhone / iPad (Safari):**
   - Tap the **Share** button (box with arrow pointing up).
   - Scroll down and tap **"Add to Home Screen"**.
   - Tap **"Add"** at the top right.

---

## 4. Candidate Matching Filters

Every circular is categorized based on verified academic qualifications:
* **💻 Dudu (CSE):** Avishek Devnath (B.Sc. CSE, CGPA 3.40).
  - Matches: Assistant Programmer (Grade 9), Assistant Maintenance Engineer, Senior Officer (IT), Computer Operator (Grade 13).
* **🌾 Bubu (Agri):** Chandrima Devnath (B.Sc. Agriculture, CGPA 3.71, Golden A+ in SSC/HSC).
  - Matches: Scientific Officer (BINA, BRRI, BARI - Grade 9), Sub-Assistant Agriculture Officer (SAAO - Grade 10), BADC, Agriculture Extension.
* **🤝 Both (Joint):**
  - Matches: Bangladesh Bank AD (General), Combined 9 Banks Senior Officer, BCS General Cadres, Auditor (CAG - Grade 11), Computer Operator (Grade 13).

---

## 5. Daily Sync Engine & Native Windows `.exe`

A standalone native Windows executable is compiled and ready in the project directory:

### Running the Native `.exe`
Just double-click:
* **[`JobWatchdogSync.exe`](file:///s:/Bubu-Dudu%20Job%20Gallary/JobWatchdogSync.exe)**, or
* **[`Run_Daily_Sync.bat`](file:///s:/Bubu-Dudu%20Job%20Gallary/Run_Daily_Sync.bat)**

### What Happens During the Daily Run:
1. **Official Scrape:** Fetches live recruitment circulars from Bangladesh Bank eRecruitment and monitors official government job portals.
2. **Strict Deduplication:** Uses composite primary key hashing (`Clean(Org) + '_' + Clean(Title) + '_' + DeadlineDate`). Existing jobs are never duplicated or re-added.
3. **Auto-Archiving:** Any job whose deadline has passed is moved to `ARCHIVED`.
4. **WhatsApp Group Dispatch:** Formats a markdown alert featuring newly published circulars ("Just In 0-5 Days") and urgent deadlines ("≤ 3 Days Left"), and dispatches it directly to your private WhatsApp group (`120363342361266475@g.us`).
5. **Deduplicated Dispatches:** Records sent circular IDs in [`whatsapp_notified_history.json`](file:///s:/Bubu-Dudu%20Job%20Gallary/job-portal/data/whatsapp_notified_history.json) to guarantee you are never spammed twice for the same circular.

---

## 6. Project Architecture & Modular Code Structure

```text
s:\Bubu-Dudu Job Gallary\
├── JobWatchdogSync.exe          # Native Windows C# executable for 1-click sync
├── Run_Daily_Sync.bat           # Desktop batch launcher
├── job-portal/
│   ├── index.html               # Responsive HTML shell with PWA & bottom nav
│   ├── manifest.json            # PWA manifest
│   ├── sw.js                    # Service Worker with offline shell caching
│   ├── css/
│   │   └── app.css              # Modular CSS (animations, safe area insets)
│   ├── js/
│   │   ├── app.js               # Main application orchestrator
│   │   ├── timeline.js          # Classification engine for the 3 post types
│   │   ├── state.js             # Reactive state & localStorage application tracker
│   │   ├── components.js        # Card renderer, badge generator & KPI metrics
│   │   └── pwa.js               # Service worker & install prompt manager
│   ├── data/
│   │   ├── circulars.json       # Circular database
│   │   └── whatsapp_notified_history.json # Deduplicated WhatsApp log
│   ├── scripts/
│   │   ├── sync_engine.js       # Live scraper & deduplication sync
│   │   ├── notify_whatsapp.js   # Baileys WhatsApp group notifier
│   │   └── JobWatchdogSync.cs   # C# source code for native executable
│   └── icons/                   # High-resolution PWA icons (192, 512, maskable)
└── WAPP_Automata/               # Copied Baileys WhatsApp automation stack (.session)
```
