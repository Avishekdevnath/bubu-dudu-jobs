import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'circulars.json');

// Classification Rules
export function classifyCandidate(title, educationReq, organization) {
  const t = (title + ' ' + (educationReq || '') + ' ' + organization).toLowerCase();

  const isDudu = 
    t.includes('programmer') || 
    t.includes('software') || 
    t.includes('cse') || 
    t.includes('computer science') || 
    t.includes('information technology') ||
    t.includes('network engineer') ||
    t.includes('maintenance engineer') ||
    t.includes('আইসিটি') || 
    t.includes('কম্পিউটার') ||
    t.includes('সফটওয়্যার');

  const isBubu = 
    t.includes('scientific officer') || 
    t.includes('agriculture') || 
    t.includes('কৃষি') || 
    t.includes('agronomy') || 
    t.includes('plant breeding') || 
    t.includes('soil science') || 
    t.includes('bina') || 
    t.includes('brri') || 
    t.includes('bari') || 
    t.includes('badc') || 
    t.includes('saao') || 
    t.includes('crop') ||
    t.includes('botany');

  if (isDudu && !isBubu) return 'DUDU';
  if (isBubu && !isDudu) return 'BUBU';
  return 'BOTH'; // Defaults to Both for General AD, Senior Officer, Auditor, etc.
}

export function calculateDaysRemaining(deadlineStr, referenceDate = new Date()) {
  const deadline = new Date(deadlineStr + 'T23:59:59');
  const diffTime = deadline - referenceDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function autoArchiveAndSync(referenceDate = new Date()) {
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`Data file not found at: ${DATA_FILE}`);
    return;
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  let circulars = JSON.parse(raw);

  let activeCount = 0;
  let urgentCount = 0;
  let archivedCount = 0;

  circulars = circulars.map(job => {
    const days = calculateDaysRemaining(job.deadline_date, referenceDate);
    if (days < 0) {
      job.status = 'ARCHIVED';
      archivedCount++;
    } else if (days <= 5) {
      job.status = 'URGENT';
      urgentCount++;
      activeCount++;
    } else {
      job.status = 'ACTIVE';
      activeCount++;
    }
    return job;
  });

  fs.writeFileSync(DATA_FILE, JSON.stringify(circulars, null, 2), 'utf-8');
  console.log(`\n✅ Circulars Synchronized!`);
  console.log(`   • Active:   ${activeCount}`);
  console.log(`   • Urgent (≤ 5 Days): ${urgentCount}`);
  console.log(`   • Archived: ${archivedCount}`);
  console.log(`   • Total:    ${circulars.length}\n`);
}

// Run CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('Running Bubu-Dudu Job Watchdog Synchronizer...');
  // Reference date: current system time
  autoArchiveAndSync(new Date());
}
