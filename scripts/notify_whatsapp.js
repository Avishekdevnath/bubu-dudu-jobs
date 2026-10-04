/**
 * Bubu-Dudu Job Watchdog - Automated WhatsApp Group Notifier
 * Connects via existing Baileys Multi-Device session to send categorized circular alerts.
 * Target Group: 120363342361266475@g.us (Bubu & Dudu Joint Hub)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Resolve Baileys and Pino from WAPP_Automata
const automataDir = path.resolve(__dirname, '../../WAPP_Automata');
const baileysPath = path.join(automataDir, 'node_modules/@whiskeysockets/baileys');
const pinoPath = path.join(automataDir, 'node_modules/pino');

const { default: makeWASocket, useMultiFileAuthState } = require(baileysPath);
let pino;
try {
  pino = require(pinoPath);
} catch (e) {
  pino = () => ({ level: 'silent', info: () => {}, error: () => {}, warn: () => {}, debug: () => {} });
}

// Config
const SESSION_PATH = path.join(automataDir, '.session');
const CIRCULARS_FILE = path.resolve(__dirname, '../data/circulars.json');
const HISTORY_FILE = path.resolve(__dirname, '../data/whatsapp_notified_history.json');
const DEFAULT_GROUP_JID = '120363342361266475@g.us';

// Reference date matching current system context (2026-10-04)
const REF_DATE = new Date('2026-10-04T00:00:00');

function getDaysUntilDeadline(deadlineStr, refDate = REF_DATE) {
  const deadline = new Date(deadlineStr + 'T23:59:59');
  return Math.ceil((deadline - refDate) / (1000 * 60 * 60 * 24));
}

const NON_OFFICE_PATTERNS = [
  /driver|চালক|ড্রাইভার|টিলার|tractor|bulldozer|truck/i,
  /cook|বাবুর্চি/i,
  /attendant|এটেনডেন্ট|বেয়ারার|bearer|peon|পিয়ন|খালাসী|khalasi/i,
  /plumber|প্লাম্বার|পাইপ/i,
  /electrician|ইলেকট্রিশিয়ান|কারিগর|lineman|লাইনম্যান/i,
  /meson|ম্যাশন|মেসন|রাজমিস্ত্রি/i,
  /painter|পেইন্টার|রংমিস্ত্রি/i,
  /hammerman|হ্যামারম্যান|হাতুড়ে/i,
  /pump operator|পাম্প অপারেটর|বয়লার|boiler/i,
  /cleaner|পরিচ্ছন্নতাকর্মী|ঝাড়ুদার|সুইপার|sweeper|মালী|mali|gardener/i,
  /guard|প্রহরী|দারোয়ান|চৌকিদার|আনসার|ansar|security/i,
  /groundsman|গ্রাউন্ডসম্যান|ground service/i,
  /fire safety|ফায়ার সেফটি/i,
  /mate|মেট|লেবার|labour|কুলি|porter|হেলপার|helper/i,
  /representative|প্রতিনিধি|বিক্রয়|sales/i,
  /mechanic|মেকানিক|ফিটার|fitter|মিস্ত্রি|foreman|ফোরম্যান|workshop/i,
  /chainman|চেইনম্যান/i,
  /preparer|প্রিপেয়ারার|photocopy|ফটোকপি|printing assistant|প্রিন্টিং/i,
  /health assistant|স্বাস্থ্য সহকারী/i,
  /cold chain|কোল্ড চেইন/i,
  /statistic|পরিসংখ্যান|পরিসংখ্যানবিদ/i,
  /library|গ্রন্থাগার|লাইব্রেরি/i,
  /surveyor|সার্ভেয়ার/i,
  /draftsman|ড্রাফটসম্যান/i,
  /estimator|এস্টিমেটর/i,
  /avionics|এভিওনিক্স|aerospace|অ্যারোস্পেস|hangar|হ্যাঙ্গার/i,
  /store\s*keeper|ভান্ডার\s*রক্ষক|স্টোর\s*কিপার|storekeeper|স্টোরকিপার|store\s*assistant|স্টোর\s*সহকারী/i,
  /bench\s*assistant|বেঞ্চ\s*সহকারী/i,
  /cashier|ক্যাশিয়ার|নাজির\s*কাম-ক্যাশিয়ার|nazir\s*cum-cashier/i,
  /diploma|ডিপ্লোমা|scientific\s*assistant|বৈজ্ঞানিক\s*সহকারী|sub-?\s*assistant|উপ-?\s*সহকারী/i
];

const EXCLUDE_AREA_ORGS = [
  /rajshahi\s*development|rdarajshahi|\brda\b|রাজশাহী\s*উন্ন[য়য]ন/i,
  /khulna\s*development|\bkda\b|খুলনা\s*উন্ন[য়য]ন/i,
  /chittagong\s*development|\bcda\b|চট্টগ্রাম\s*উন্ন[য়য]ন/i,
  /cox'?s\s*bazar\s*development|কক্সবাজার\s*উন্ন[য়য]ন/i,
  /civil\s*surgeon|সিভিল\s*সার্জন|\bcs[a-z]+/i,
  /dc\s*office|জেলা\s*প্রশাসক|\bdc(?!dhaka\b)[a-z]+/i
];

function isAreaDeptOutsideDhaka(job) {
  const orgText = `${job.organization || ''} ${job.org_code || ''}`.toLowerCase();
  if (orgText.includes('dcdhaka') || (orgText.includes('dc office') && orgText.includes('dhaka') && !orgText.includes('outside'))) {
    return false;
  }
  for (const pat of EXCLUDE_AREA_ORGS) {
    if (pat.test(orgText)) return true;
  }
  return false;
}

function isPureOfficeJob(job) {
  if (isAreaDeptOutsideDhaka(job)) return false;
  const g = parseInt(String(job.grade || 99).replace(/\D+/g, ''), 10) || 99;
  if (g < 9) return false; // Exclude senior posts above Grade 9 in rank (Gr 1-8 require experience)
  const text = `${job.title || ''} ${job.min_education || ''}`.toLowerCase();
  for (const pat of NON_OFFICE_PATTERNS) {
    if (pat.test(text)) return false;
  }
  return true;
}

function getDaysSincePublish(publishStr, refDate = REF_DATE) {
  if (!publishStr) return 999;
  const published = new Date(publishStr + 'T00:00:00');
  return Math.floor((refDate - published) / (1000 * 60 * 60 * 24));
}



function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (err) {}
  return { notified_ids: {}, last_run: null };
}

function saveHistory(history) {
  try {
    history.last_run = new Date().toISOString();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save notification history:', err);
  }
}

function formatCandidateLabel(candidate) {
  if (candidate === 'DUDU') return '💻 *Dudu (CSE)*';
  if (candidate === 'BUBU') return '🌾 *Bubu (Agri)*';
  return '🤝 *Both (Joint)*';
}

function buildAlertMessage(newCirculars, urgentCirculars) {
  let lines = [];
  lines.push('🎯 *BUBU-DUDU JOB WATCHDOG ALERT* 🎯');
  lines.push(`📅 *Date:* ${REF_DATE.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`);
  lines.push('──────────────────────────────');

  if (newCirculars.length > 0) {
    lines.push('\n✨ *[JUST CAME IN (0–5 DAYS)]* ✨');
    newCirculars.forEach((job, idx) => {
      const daysOld = getDaysSincePublish(job.published_date || job.publish_date);
      const daysLeft = getDaysUntilDeadline(job.deadline_date);
      const oldTag = daysOld === 0 ? 'Fresh Today!' : `${daysOld}d ago`;
      const applyUrl = job.application_portal_url || job.apply_url;
      const pdfUrl = job.circular_url || job.pdf_url;
      const vac = job.vacancy_count || job.vacancies || 'N/A';

      lines.push(`\n${idx + 1}. *${job.title}*`);
      lines.push(`   🏛️ *Org:* ${job.organization}`);
      lines.push(`   🎖️ *Grade:* ${job.grade} | *Vacancies:* ${vac}`);
      lines.push(`   🎯 *For:* ${formatCandidateLabel(job.candidate_eligibility)}`);
      lines.push(`   ⏳ *Deadline:* ${job.deadline_date} (${daysLeft}d left) [${oldTag}]`);
      if (applyUrl) lines.push(`   📝 *Apply:* ${applyUrl}`);
      if (pdfUrl) lines.push(`   📄 *PDF:* ${pdfUrl}`);
    });
  }

  if (urgentCirculars.length > 0) {
    lines.push('\n\n🚨 *[URGENT: ≤ 3 DAYS REMAINING]* 🚨');
    urgentCirculars.forEach((job, idx) => {
      const daysLeft = getDaysUntilDeadline(job.deadline_date);
      let hurryTag = daysLeft === 0 ? '🔥 Closes Today!' : (daysLeft === 1 ? '⚡ Closes Tomorrow!' : `⚠️ ${daysLeft} Days Left!`);
      const applyUrl = job.application_portal_url || job.apply_url;

      lines.push(`\n${idx + 1}. *${job.title}*`);
      lines.push(`   🏛️ *Org:* ${job.organization} (Grade ${job.grade})`);
      lines.push(`   🎯 *For:* ${formatCandidateLabel(job.candidate_eligibility)}`);
      lines.push(`   ⏰ *Status:* ${hurryTag} (Deadline: ${job.deadline_date})`);
      if (applyUrl) lines.push(`   📝 *Apply Now:* ${applyUrl}`);
    });
  }

  lines.push('\n──────────────────────────────');
  lines.push('🌐 *Web Portal:* Open your local portal or PWA for details.');

  return lines.join('\n');
}

async function runNotifier() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const targetJid = args.find(a => a.startsWith('--jid='))?.split('=')[1] || DEFAULT_GROUP_JID;

  console.log(`📡 [JobWatchdogNotifier] Starting notification run (DryRun: ${isDryRun})...`);

  if (!fs.existsSync(CIRCULARS_FILE)) {
    console.error('❌ Circulars file not found at:', CIRCULARS_FILE);
    process.exit(1);
  }

  const circulars = JSON.parse(fs.readFileSync(CIRCULARS_FILE, 'utf8'));
  const history = loadHistory();

  // Find candidate circulars
  const justInJobs = [];
  const urgentJobs = [];

  circulars.forEach(job => {
    const daysLeft = getDaysUntilDeadline(job.deadline_date);
    const daysOld = getDaysSincePublish(job.published_date || job.publish_date);

    // Skip expired
    if (daysLeft < 0) return;

    // Skip non-office jobs
    if (!isPureOfficeJob(job)) return;


    // Check "Just Came In (0-5 days)"
    if (daysOld >= 0 && daysOld <= 5) {
      const notifyKey = `${job.id}_justin`;
      if (!history.notified_ids[notifyKey]) {
        justInJobs.push(job);
        history.notified_ids[notifyKey] = Date.now();
      }
    }

    // Check "≤ 3 Days Left (Urgent)"
    if (daysLeft <= 3 && daysLeft >= 0) {
      const notifyKey = `${job.id}_urgent_${daysLeft}d`;
      if (!history.notified_ids[notifyKey]) {
        urgentJobs.push(job);
        history.notified_ids[notifyKey] = Date.now();
      }
    }
  });

  if (justInJobs.length === 0 && urgentJobs.length === 0) {
    console.log('✅ No new "Just In (0-5d)" or "≤ 3d Left" circulars requiring dispatch. Up to date.');
    process.exit(0);
  }

  const messageText = buildAlertMessage(justInJobs, urgentJobs);
  console.log('\n--- COMPOSED ALERT MESSAGE ---');
  console.log(messageText);
  console.log('------------------------------\n');

  if (isDryRun) {
    console.log(`[DRY RUN] Would send to ${targetJid}. Exiting without modifying session or sending.`);
    process.exit(0);
  }

  // Connect to WhatsApp via Baileys Multi-Device session
  console.log(`🔑 Loading session credentials from: ${SESSION_PATH}`);
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);

  let hasSent = false;
  let attempts = 0;
  const maxAttempts = 3;

  function connect() {
    if (hasSent || attempts >= maxAttempts) return;
    attempts++;
    console.log(`🔌 Initializing WhatsApp connection (attempt ${attempts}/${maxAttempts})...`);

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        console.log(`✅ WhatsApp Socket connected as: ${sock.user?.id}`);
        try {
          console.log(`📤 Sending alert to group: ${targetJid}...`);
          await sock.sendMessage(targetJid, { text: messageText });
          console.log('🎉 Notification dispatched successfully!');
          hasSent = true;
          
          // Save history to prevent duplicate sends
          saveHistory(history);

          setTimeout(() => {
            try { sock.end(undefined); } catch (e) {}
            process.exit(0);
          }, 1500);
        } catch (sendErr) {
          console.error('❌ Failed to send WhatsApp message:', sendErr);
          try { sock.end(undefined); } catch (e) {}
          process.exit(1);
        }
      }

      if (connection === 'close') {
        const error = lastDisconnect?.error;
        const statusCode = error?.output?.statusCode;
        console.log(`⚠️ WhatsApp connection closed (statusCode: ${statusCode || 'unknown'}).`);

        if (!hasSent && attempts < maxAttempts && statusCode !== 401) {
          console.log('🔄 Reconnecting in 3 seconds...');
          setTimeout(connect, 3000);
        } else if (!hasSent) {
          console.log('ℹ️ Disconnected without sending. Session may need active phone connection.');
          process.exit(0);
        }
      }
    });

    // Timeout safety: if not connected in 20 seconds, terminate cleanly
    setTimeout(() => {
      if (!hasSent) {
        console.log('⏱️ Notifier timeout reached (20s). Safe exit.');
        try { sock.end(undefined); } catch (e) {}
        process.exit(0);
      }
    }, 20000);
  }

  connect();
}

runNotifier().catch(err => {
  console.error('Fatal notifier error:', err);
  process.exit(1);
});
