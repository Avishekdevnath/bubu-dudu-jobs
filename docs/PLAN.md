# Implementation Plan: Bubu-Dudu Job Portal & Watchdog

## 1. Project Roadmap Overview

```
Phase 1: Project Setup & Seed Data Structure
   ├── Create `job-portal` workspace directory
   ├── Seed verified active & historical jobs into `data/circulars.json`
   └── Configure build scripts & local server

Phase 2: Modern Web Dashboard Interface (React / Vite + Tailwind)
   ├── Responsive Top Header & Hero Metrics (Active, ≤ 5 Days, Applied, Archived)
   ├── Dynamic Candidate Filters (Dudu, Bubu, Both)
   ├── Dynamic Urgency Filters (Closing ≤ 5 Days, Today, All Active, Archived)
   ├── Grade Multi-Select & Search Bar
   └── Rich Circular Cards with Countdown Badges & Quick Action Links

Phase 3: Auto-Archive & Lifecycle Engine
   ├── Automatic countdown timer calculation based on local machine date
   ├── Automatic separation into Active vs. Archived boards
   └── "Mark as Applied" interactive modal (stores Teletalk User ID & tracking status)

Phase 4: Local Circular Search & Ingestion Script
   ├── CLI crawler/scraper to fetch fresh AllJobs & BB circulars
   ├── Matching rules processor (tags DUDU / BUBU / BOTH automatically)
   └── Deduplication and database updater

Phase 5: WhatsApp Notification Integration
   ├── Script bridge calling `WAPP_Automata`
   ├── Fetches newly detected circulars
   └── Dispatches formatted markdown digest to the 2-person group
```

---

## 2. Detailed Milestone Deliverables

### Milestone 1: Local Dashboard Skeleton & Schema
- Set up lightweight frontend app with Vite + Tailwind CSS in `s:\Bubu-Dudu Job Gallary\job-portal`.
- Preload with verified actual circulars and recent postings from BKKB, BINA, BB, CGA, POCL, BEPZA, and DLRS.

### Milestone 2: Filter Matrix & Days-Left Calculator
- Implement reactive client-side state:
  - `selectedCandidate`: `'ALL' | 'DUDU' | 'BUBU' | 'BOTH'`
  - `urgencyFilter`: `'ALL' | 'URGENT_5_DAYS' | 'CLOSING_TODAY' | 'ARCHIVED'`
  - `gradeFilter`: `'ALL' | 9 | 10 | 11 | 13 | 16`
  - `searchTerm`: Text match across Title, Organization, and Requirements.
- Real-time countdown calculation:
  - $\le 0$ days: `Archived (Expired)`
  - $1$ day: `🔴 Closes Tomorrow!`
  - $\le 5$ days: `🔴 Urgent: X Days Left`
  - $> 5$ days: `🟢 X Days Left`

### Milestone 3: Auto-Archive Engine
- Active Board renders only items where `days_remaining >= 0`.
- Expired circulars are cleanly tucked into the **"📦 Past Archive"** tab so historical records, syllabus prep notes, and admit tracking remain accessible without cluttering today's actionable view.

### Milestone 4: WhatsApp Alert Bridge
- Use Node script inside `WAPP_Automata` to read newly added circulars from `job-portal/data/circulars.json` and send automated alerts to the private WhatsApp group.
