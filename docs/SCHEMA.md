# Data Schema Specification: Job Circular & Application Tracker

## 1. Unified JSON Schema for Job Circulars

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "JobCircular",
  "type": "object",
  "required": [
    "id",
    "title",
    "organization",
    "grade",
    "candidate_eligibility",
    "publish_date",
    "deadline_date",
    "apply_url",
    "pdf_url",
    "status"
  ],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier, e.g., 'teletalk_bina_2026_so' or 'bb_ad_2026'"
    },
    "title": {
      "type": "string",
      "description": "Official post name in English or Bengali (e.g., 'Assistant Programmer')"
    },
    "organization": {
      "type": "string",
      "description": "Official name of the recruiting body (e.g., 'Bangladesh Bank')"
    },
    "category": {
      "type": "string",
      "enum": [
        "BANK_CENTRAL",
        "BANK_STATE",
        "BANK_PRIVATE",
        "MINISTRY",
        "RESEARCH_NARS",
        "DEFENCE_SECURITY",
        "LAND_SETTLEMENT",
        "JUDICIARY_COURT",
        "AUTONOMOUS_COMMISSION",
        "EDUCATION_BOARD",
        "LOCAL_GOVT"
      ]
    },
    "grade": {
      "type": "integer",
      "minimum": 9,
      "maximum": 20,
      "description": "National Pay Scale Grade (9 to 20)"
    },
    "vacancies": {
      "type": "integer",
      "description": "Number of open positions, -1 if unspecified"
    },
    "candidate_eligibility": {
      "type": "string",
      "enum": ["DUDU", "BUBU", "BOTH"],
      "description": "Target profile classification based on degree rules"
    },
    "education_requirements": {
      "type": "string",
      "description": "Raw or summarized qualification requirement text"
    },
    "publish_date": {
      "type": "string",
      "format": "date",
      "description": "YYYY-MM-DD"
    },
    "deadline_date": {
      "type": "string",
      "format": "date",
      "description": "YYYY-MM-DD"
    },
    "apply_url": {
      "type": "string",
      "format": "uri",
      "description": "Direct Teletalk or eRecruitment application URL"
    },
    "pdf_url": {
      "type": "string",
      "format": "uri",
      "description": "Direct download link to official scanned circular PDF"
    },
    "status": {
      "type": "string",
      "enum": ["ACTIVE", "URGENT", "ARCHIVED", "APPLIED", "IGNORED"],
      "description": "Computed or user-specified lifecycle status"
    },
    "application_record": {
      "type": "object",
      "properties": {
        "applied_by": { "type": "string", "enum": ["DUDU", "BUBU"] },
        "user_id": { "type": "string" },
        "payment_status": { "type": "string", "enum": ["PAID", "UNPAID"] },
        "admit_status": { "type": "string", "enum": ["NOT_RELEASED", "RELEASED", "DOWNLOADED"] },
        "admit_file_path": { "type": "string" }
      }
    }
  }
}
```

---

## 2. SQLite Database Schema (Durable Local Storage)

```sql
-- Core Circulars Table
CREATE TABLE IF NOT EXISTS circulars (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    organization TEXT NOT NULL,
    category TEXT NOT NULL,
    grade INTEGER NOT NULL,
    vacancies INTEGER DEFAULT -1,
    candidate_eligibility TEXT CHECK(candidate_eligibility IN ('DUDU', 'BUBU', 'BOTH')) NOT NULL,
    education_requirements TEXT,
    publish_date TEXT NOT NULL,
    deadline_date TEXT NOT NULL,
    apply_url TEXT NOT NULL,
    pdf_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Application Tracking Table (When either candidate submits an application)
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    circular_id TEXT NOT NULL,
    candidate TEXT CHECK(candidate IN ('DUDU', 'BUBU')) NOT NULL,
    teletalk_user_id TEXT,
    fee_paid BOOLEAN DEFAULT 0,
    applied_date TEXT,
    admit_status TEXT DEFAULT 'NOT_RELEASED',
    admit_pdf_path TEXT,
    notes TEXT,
    FOREIGN KEY(circular_id) REFERENCES circulars(id) ON DELETE CASCADE
);

-- WhatsApp Alert Dispatch Log (Zero Duplicates)
CREATE TABLE IF NOT EXISTS dispatch_log (
    circular_id TEXT PRIMARY KEY,
    dispatched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    whatsapp_message_id TEXT,
    recipient_group_jid TEXT NOT NULL
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_circulars_deadline ON circulars(deadline_date);
CREATE INDEX IF NOT EXISTS idx_circulars_candidate ON circulars(candidate_eligibility);
CREATE INDEX IF NOT EXISTS idx_circulars_grade ON circulars(grade);
```

---

## 3. Dynamic Status Calculation Rule

For any given `circular`:
```typescript
function computeLifecycleStatus(circular: JobCircular, todayDate: string): 'URGENT' | 'ACTIVE' | 'ARCHIVED' {
  const today = new Date(todayDate).getTime();
  const deadline = new Date(circular.deadline_date).getTime();
  const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'ARCHIVED';
  } else if (diffDays <= 5) {
    return 'URGENT';
  } else {
    return 'ACTIVE';
  }
}
```
