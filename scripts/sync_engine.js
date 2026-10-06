import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'circulars.json');
const DATA_JS = path.join(__dirname, '..', 'data', 'circulars.js');

// --- DEDUPLICATION KEY GENERATOR ---
function getDedupeKey(job) {
  const cleanOrg = (job.organization || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanTitle = (job.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanDeadline = (job.deadline_date || '').trim();
  return `${cleanOrg}_${cleanTitle}_${cleanDeadline}`;
}

// --- CLASSIFICATION ENGINE ---
function classifyCandidate(title, orgName, details = {}) {
  const t = (title || '').toLowerCase();
  const req = `${details.min_education || ''} ${details.job_title_bn || ''}`.toLowerCase();

  // DUDU (CSE / IT)
  const isCse = 
    t.includes('programmer') || t.includes('প্রোগ্রামার') ||
    t.includes('software') || t.includes('সফটওয়্যার') ||
    t.includes('computer') || t.includes('কম্পিউটার') ||
    t.includes('maintenance engineer') || t.includes('রক্ষণাবেক্ষণ প্রকৌশলী') ||
    t.includes('information technology') || t.includes('আইটি') ||
    t.includes('systems') || t.includes('data entry') || t.includes('ডাটা এন্ট্রি');

  // BUBU (Agriculture)
  const isAgri = 
    t.includes('scientific officer') || t.includes('বৈজ্ঞানিক কর্মকর্তা') ||
    t.includes('agriculture') || t.includes('কৃষি') ||
    t.includes('agronomy') || t.includes('plant breeding') ||
    t.includes('soil') || t.includes('crop') || t.includes('botany');

  if (isCse && !isAgri) return 'DUDU';
  if (isAgri && !isCse) return 'BUBU';

  // Both eligible for general administration, desk, and executive posts (e.g. Assistant Director Non-Technical)
  return 'BOTH';
}

function determineGrade(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('programmer') && !t.includes('assistant')) return 'GRADE 6';
  if (t.includes('maintenance engineer') && !t.includes('assistant')) return 'GRADE 6';
  if ((t.includes('director') || t.includes('পরিচালক')) && !t.includes('assistant') && !t.includes('সহকারী')) return 'GRADE 5';

  if (
    t.includes('assistant programmer') || t.includes('সহকারী প্রোগ্রামার') ||
    t.includes('assistant director') || t.includes('সহকারী পরিচালক') ||
    t.includes('scientific officer') || t.includes('বৈজ্ঞানিক কর্মকর্তা') ||
    t.includes('junior officer') || t.includes('কনিষ্ঠ কর্মকর্তা') ||
    t.includes('assistant maintenance engineer') || t.includes('সহকারী রক্ষণাবেক্ষণ প্রকৌশলী') ||
    t.includes('assistant engineer') || t.includes('সহকারী প্রকৌশলী')
  ) return 'GRADE 9';

  if (
    t.includes('deputy assistant director') || t.includes('উপ সহকারী পরিচালক') || t.includes('উপ-সহকারী পরিচালক') ||
    t.includes('sub-assistant') || t.includes('sub assistant') || t.includes('উপ-সহকারী')
  ) return 'GRADE 10';

  if (t.includes('computer operator') || t.includes('কম্পিউটার অপারেটর')) return 'GRADE 13';

  if (
    t.includes('steno') || t.includes('সাঁট-মুদ্রাক্ষরিক') || t.includes('সাঁট লিপিকার') || t.includes('stenographer') ||
    t.includes('upper division assistant') || t.includes('উচ্চমান সহকারী') ||
    t.includes('head assistant') || t.includes('প্রধান সহকারী')
  ) return 'GRADE 14';

  if (
    t.includes('office assistant') || t.includes('অফিস সহকারী') ||
    t.includes('typist') || t.includes('মুদ্রাক্ষরিক') ||
    t.includes('data entry') || t.includes('ডাটা এন্ট্রি') ||
    t.includes('store keeper') || t.includes('হিসাব সহকারী')
  ) return 'GRADE 16';

  if (t.includes('driver') || t.includes('ড্রাইভার')) return 'GRADE 16';

  if (
    t.includes('cleaner') || t.includes('security guard') ||
    t.includes('office support') || t.includes('সহায়ক') || t.includes('সহায়ক') ||
    t.includes('sohayok') || t.includes('shohayok')
  ) return 'GRADE 20';

  return 'GRADE 13';
}

// STRICT EXCLUSION: Only pure official/desk/executive jobs (No drivers, cooks, attendants, laborers, cleaners, trades, or field reps)
const NON_OFFICE_PATTERNS = [
  // Drivers & Transport
  /driver|(?<!পরি)চালক|ড্রাইভার|টিলার|tractor|bulldozer|truck/iu,
  // Trades & Manual Labor
  /cook|বাবুর্চি|পাচক/i,
  /attendant|এটেনডেন্ট|বেয়ারার|bearer|peon|পিয়ন|খালাসী|khalasi|orderly|আর্দালী/i,
  /plumber|প্লাম্বার|পাইপ/i,
  /electrician|ইলেকট্রিশিয়ান|কারিগর|lineman|লাইনম্যান|লিফটম্যান|liftman/i,
  /meson|ম্যাশন|মেসন|রাজমিস্ত্রি|রাজ_মিস্ত্রি/i,
  /painter|পেইন্টার|রংমিস্ত্রি/i,
  /hammerman|হ্যামারম্যান|হাতুড়ে/i,
  /pump operator|পাম্প অপারেটর|বয়লার|boiler/i,
  /cleaner|পরিচ্ছন্নতাকর্মী|ঝাড়ুদার|সুইপার|sweeper|মালী|mali|gardener/i,
  /guard|প্রহরী|দারোয়ান|চৌকিদার|আনসার|ansar|security|গেটের\s*প্রহরী|gate\s*inspector|গেইট\s*ইন্সপেক্টর/i,
  /groundsman|গ্রাউন্ডসম্যান|ground service/i,
  /fire safety|ফায়ার সেফটি|fireman|ফায়ারম্যান/i,
  /mate|মেট|লেবার|labour|কুলি|porter|হেলপার|helper|semen\s*carrier|সিমেন\s*ক্যারিয়ার/i,
  /representative|প্রতিনিধি|বিক্রয়|sales/i,
  /mechanic|মেকানিক|ফিটার|fitter|মিস্ত্রি|foreman|ফোরম্যান|workshop|technician|টেকনিশিয়ান/i,
  /chainman|চেইনম্যান/i,
  /preparer|প্রিপেয়ারার|photocopy|ফটোকপি|printing assistant|প্রিন্টিং/i,
  /health assistant|স্বাস্থ্য সহকারী/i,
  /cold chain|কোল্ড চেইন/i,
  // Medical & Pharmacy
  /medical\s*technologist|মেডিকেল\s*টেকনোলজিস্ট|pharmacist|ফার্মাসিস্ট|compounder|কম্পাউন্ডার|মেডিকেল\s*অফিসার|medical\s*officer/i,
  // Non-Office / Non-Target Specialties
  /statistic|পরিসংখ্যান|পরিসংখ্যানবিদ/i,
  /library|গ্রন্থাগার|লাইব্রেরি/i,
  /surveyor|সার্ভেয়ার|সার্ভেয়ার/i,
  /draftsman|ড্রাফটসম্যান/i,
  /estimator|এস্টিমেটর/i,
  /avionics|এভিওনিক্স|aerospace|অ্যারোস্পেস|hangar|হ্যাঙ্গার/i,
  // Blacklisted Roles
  /store\s*keeper|ভান্ডার\s*রক্ষক|স্টোর\s*কিপার|storekeeper|স্টোরকিপার|store\s*assistant|স্টোর\s*সহকারী|store\s*officer|স্টোর\s*অফিসার|godown\s*keeper|গোডাউন\s*কিপার/i,
  /bench\s*assistant|বেঞ্চ\s*সহকারী/i,
  /cashier|ক্যাশিয়ার|নাজির\s*কাম-ক্যাশিয়ার|nazir\s*cum-cashier/i,
  // Diploma Posts (Excluding Deputy Assistant Director)
  /diploma|ডিপ্লোমা|scientific\s*assistant|বৈজ্ঞানিক\s*সহকারী|(?:sub-?\s*assistant|উপ-?\s*সহকারী)(?!\s*(?:director|পরিচালক))/i,
  // Commerce / Accounting Background
  /accountant|হিসাবরক্ষক|হিসাব\s*রক্ষক|হিসাব\s*সহকারী|accounts\s*assistant|account\s*assistant|office\s*assistant-cum-accountant|বাণিজ্য/i,
  // Non-CSE Engineering Disciplines
  /\b(?:civil|mechanical|electrical|chemical|petroleum)\b|সিভিল|মেকানিক্যাল|ইলেকট্রিক্যাল|কেমিক্যাল|পেট্রোলিয়াম|junior\s*officer\s*\(operations\)|কনিষ্ঠ\s*কর্মকর্তা\s*\(পরিচালন\)/i
];

export const EXCLUDE_AREA_ORGS = [
  /rajshahi\s*development|rdarajshahi|\brda\b|রাজশাহী\s*উন্ন[য়য]ন/i,
  /khulna\s*development|\bkda\b|খুলনা\s*উন্ন[য়য]ন/i,
  /chittagong\s*development|\bcda\b|চট্টগ্রাম\s*উন্ন[য়য]ন/i,
  /cox'?s\s*bazar\s*development|কক্সবাজার\s*উন্ন[য়য]ন/i,
  /eastern\s*lubricants|elbl|ইস্টার্ন\s*লুব্রিকেন্টস/i,
  /civil\s*surgeon|সিভিল\s*সার্জন|\bcs[a-z]+/i,
  /dc\s*office|জেলা\s*প্রশাসক|\bdc(?!dhaka\b)[a-z]+/i,
  /divisional\s*commissioner|বিভাগীয়\s*কমিশনার|mymensinghdiv/i,
  /cevmym|pmasp/i,
  /taxran|tax.*(?:rangpur|chittagong|rajshahi|sylhet|khulna|barisal|comilla|mymensingh|bogura)|কর\s*অঞ্চল.*(?:রংপুর|চট্টগ্রাম|রাজশাহী|সিলেট|খুলনা|বরিশাল|কুমিল্লা|ময়মনসিংহ|বগুড়া)/i
];

export function isAreaDeptOutsideDhaka(orgText = '') {
  const text = (orgText || '').toLowerCase();
  if (text.includes('dcdhaka') || (text.includes('dc office') && text.includes('dhaka') && !text.includes('outside'))) {
    return false;
  }
  for (const pat of EXCLUDE_AREA_ORGS) {
    if (pat.test(text)) return true;
  }
  return false;
}

export function isPureOfficeJob(title, details = {}, org = '') {
  const orgStr = `${org || ''} ${details.organization || ''} ${details.org_code || ''} ${details.name || ''}`;
  if (isAreaDeptOutsideDhaka(orgStr)) return false;

  const gradeStr = details.grade || determineGrade(title);
  const g = parseInt(String(gradeStr || 99).replace(/\D+/g, ''), 10) || 99;
  if (g < 9) return false; // Exclude senior posts above Grade 9 in rank (Gr 1-8 require experience)

  const text = `${title || ''} ${details.job_title_bn || ''} ${details.title_en || ''} ${details.min_education || ''}`.toLowerCase();
  for (const pat of NON_OFFICE_PATTERNS) {
    if (pat.test(text)) return false;
  }
  return true;
}

function fetchJson(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'alljobs.teletalk.com.bd',
      path: endpoint,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer false',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: e.message, raw: data.slice(0, 200) });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// --- FETCH ALLJOBS TELETALK OFFICIAL API LIVE CIRCULARS ---
async function fetchAllJobsGovtFeeds(referenceDate) {
  const jobs = [];
  try {
    const allGovtOrgs = [];
    let page = 1;
    while (true) {
      const orgRes = await fetchJson(`/api/v1/govt-jobs/org-list?page=${page}&limit=50`);
      if (!orgRes || !orgRes.govtOrgJobs || orgRes.govtOrgJobs.length === 0) break;
      allGovtOrgs.push(...orgRes.govtOrgJobs);
      if (orgRes.govtOrgJobs.length < 20) break;
      page++;
    }

    const seenOrgIds = new Set();
    const uniqueOrgs = [];
    for (const org of allGovtOrgs) {
      if (!seenOrgIds.has(org.id)) {
        seenOrgIds.add(org.id);
        uniqueOrgs.push(org);
      }
    }

    const msPerDay = 1000 * 60 * 60 * 24;

    for (const org of uniqueOrgs) {
      const jobListRes = await fetchJson(`/api/v1/govt-jobs/list?orgId=${org.id}&skipLimit=YES`);
      const orgJobs = jobListRes.govtJobs || [];

      for (const j of orgJobs) {
        const pubDateStr = (j.published_date || '').split('T')[0];
        const deadDateStr = (j.deadline_date || '').split('T')[0];
        if (!pubDateStr || !deadDateStr) continue;

        const pubDate = new Date(pubDateStr);
        const deadDate = new Date(deadDateStr);

        // Strict Year check: MUST BE CURRENT YEAR (2026), NOT 2023/2024/2025
        if (pubDate.getFullYear() < 2026 || deadDate.getFullYear() < 2026) continue;

        const daysOld = Math.floor((referenceDate - pubDate) / msPerDay);
        const daysLeft = Math.ceil((deadDate - referenceDate) / msPerDay);

        // STRICT USER RULES:
        // 1. Only active (daysLeft >= 0)
        // 2. Only recent 10-30 days old max (daysOld <= 30)
        if (daysLeft < 0 || daysOld > 30) continue;

        // 3. STRICT RULE: OFFICE/DESK JOBS ONLY (No drivers, cooks, attendants, cleaners, trades, reps, or area depts outside Dhaka)
        if (!isPureOfficeJob(j.job_title, j, org.name + ' ' + (org.short_name || ''))) continue;

        const grade = determineGrade(j.job_title);

        // Fetch details for authentic PDF and portal link
        const detailsRes = await fetchJson(`/api/v1/govt-jobs/public-details?id=${j.id}`);
        const details = detailsRes.details || {};

        let pdfUrl = '';
        if (details.advertisement_file) {
          pdfUrl = `https://alljobs.teletalk.com.bd/media/${details.advertisement_file}`;
        } else if (j.application_site) {
          pdfUrl = j.application_site;
        }

        const applyUrl = details.application_site || j.application_site || `https://alljobs.teletalk.com.bd/jobs/government/${org.id}?jobId=${j.id}`;
        const eligibility = classifyCandidate(j.job_title, org.name, j);

        jobs.push({
          id: `AJ-${j.id}`,
          title: j.job_title_bn ? `${j.job_title_bn} (${j.job_title})` : j.job_title,
          organization: org.name_bn ? `${org.name_bn} (${org.name})` : org.name,
          grade: grade,
          candidate_eligibility: eligibility,
          published_date: pubDateStr,
          deadline_date: deadDateStr,
          vacancy_count: parseInt(j.vacancy, 10) || 1,
          min_education: details.job_title_bn ? `সংশ্লিষ্ট বিষয়ে স্নাতক/সমমান অথবা এইচএসসি` : 'Graduate or HSC as required',
          circular_url: pdfUrl,
          application_portal_url: applyUrl,
          is_verified: true,
          source: 'AllJobs Teletalk Official Live API',
          last_updated: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.error('⚠️ Notice: AllJobs live fetch error:', err.message);
  }
  return jobs;
}

// --- FETCH BANGLADESH BANK LIVE CIRCULARS ---
async function fetchBangladeshBankJobs(referenceDate) {
  const url = 'https://erecruitment.bb.org.bd/onlineapp/joblist.php';
  const jobs = [];

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return jobs;
    const html = await res.text();

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const rowContent = match[1];
      if (!rowContent.includes('[View Circular]') && !rowContent.includes('jobdetails.php')) continue;

      const cells = [];
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
      }

      if (cells.length >= 6) {
        const jobId = cells[0].trim();
        const rawPosition = cells[1].replace(/\[View Circular\].*$/i, '').trim();
        const vacancies = parseInt(cells[2].trim(), 10) || 1;
        const reqs = cells[5].trim();
        const deadlineRaw = cells[cells.length - 2] || '';

        let deadline = '';
        const dMatch = deadlineRaw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dMatch) {
          deadline = `${dMatch[3]}-${dMatch[2]}-${dMatch[1]}`;
        }

        if (!deadline) continue;
        const deadDate = new Date(deadline);
        const daysLeft = Math.ceil((deadDate - referenceDate) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0 || deadDate.getFullYear() < 2026) continue;

        // STRICT RULE: Office jobs only
        if (!isPureOfficeJob(rawPosition, { min_education: reqs })) continue;

        const pdfMatch = rowContent.match(/href=['"]([^'"]*print_doc[^'"]*)['"]/i) || 
                         rowContent.match(/href=['"]([^'"]*jobdetails\.php[^'"]*)['"]/i);
        let pdfUrl = 'https://erecruitment.bb.org.bd';
        if (pdfMatch) {
          pdfUrl = pdfMatch[1].startsWith('http') ? pdfMatch[1] : `https://erecruitment.bb.org.bd/onlineapp/${pdfMatch[1]}`;
        }

        const applyUrl = `https://erecruitment.bb.org.bd/onlineapp/jobapply.php?job_id=${jobId}`;

        jobs.push({
          id: `BB-${jobId}`,
          title: rawPosition,
          organization: 'Bankers’ Selection Committee Secretariat (BB)',
          grade: determineGrade(rawPosition),
          candidate_eligibility: classifyCandidate(rawPosition, reqs, 'Bangladesh Bank'),
          published_date: referenceDate.toISOString().split('T')[0],
          deadline_date: deadline,
          vacancy_count: vacancies,
          min_education: reqs,
          circular_url: pdfUrl,
          application_portal_url: applyUrl,
          is_verified: true,
          source: 'Bangladesh Bank eRecruitment Portal',
          last_updated: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.error('⚠️ Notice: Bangladesh Bank live fetch error:', err.message);
  }

  return jobs;
}

// --- MAIN RUNNER WITH STRICT RECENCY & ZERO EXPIRED/OLD JOBS ---
export async function runDailySync(referenceDate = new Date('2026-10-04T00:00:00')) {
  console.log(`\n======================================================`);
  console.log(` 🎯 BUBU-DUDU JOB WATCHDOG & CIRCULAR SYNCHRONIZER`);
  console.log(` Reference Date: ${referenceDate.toISOString().split('T')[0]}`);
  console.log(` Strict Policy: Recent 10-30 Days Only | Zero Expired Jobs`);
  console.log(`======================================================\n`);

  // 1. Fetch Live Official Feeds
  console.log(`🌐 Querying official live recruitment feeds...`);
  const [allJobsFeeds, bbFeeds] = await Promise.all([
    fetchAllJobsGovtFeeds(referenceDate),
    fetchBangladeshBankJobs(referenceDate)
  ]);

  console.log(`   • Fetched ${allJobsFeeds.length} recent circulars from AllJobs Teletalk API.`);
  console.log(`   • Fetched ${bbFeeds.length} recent circulars from Bangladesh Bank BSC.`);

  const incomingFeeds = [...allJobsFeeds, ...bbFeeds];

  // 2. Load Existing and Purge any old/stale entries
  let existingCirculars = [];
  if (fs.existsSync(DATA_FILE)) {
    try {
      existingCirculars = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (e) {
      existingCirculars = [];
    }
  }

  // Filter existing circulars to purge any that violate the rules (e.g. from 2023/2024/2025 or >30 days old or expired or non-office jobs)
  const msPerDay = 1000 * 60 * 60 * 24;
  existingCirculars = existingCirculars.filter(j => {
    const pub = new Date(j.published_date || j.publish_date);
    const dead = new Date(j.deadline_date);
    if (pub.getFullYear() < 2026 || dead.getFullYear() < 2026) return false;
    const daysOld = Math.floor((referenceDate - pub) / msPerDay);
    const daysLeft = Math.ceil((dead - referenceDate) / msPerDay);
    return daysLeft >= 0 && daysOld <= 30 && isPureOfficeJob(j.title, j);
  });


  const existingIdSet = new Set(existingCirculars.map(j => j.id.toLowerCase().trim()));
  const existingKeySet = new Set(existingCirculars.map(j => getDedupeKey(j)));

  let newAddedCount = 0;
  let alreadyPresentCount = 0;

  for (const job of incomingFeeds) {
    const key = getDedupeKey(job);
    const id = job.id.toLowerCase().trim();

    if (existingIdSet.has(id) || existingKeySet.has(key)) {
      alreadyPresentCount++;
      continue;
    }

    existingCirculars.push(job);
    existingIdSet.add(id);
    existingKeySet.add(key);
    newAddedCount++;
  }

  // Calculate metrics
  let duduCount = 0;
  let bubuCount = 0;
  let bothCount = 0;
  let urgent3Count = 0;
  let justIn5Count = 0;

  existingCirculars.forEach(job => {
    const pub = new Date(job.published_date || job.publish_date);
    const dead = new Date(job.deadline_date);
    const daysOld = Math.floor((referenceDate - pub) / msPerDay);
    const daysLeft = Math.ceil((dead - referenceDate) / msPerDay);

    if (daysLeft <= 3) urgent3Count++;
    if (daysOld <= 5) justIn5Count++;

    if (job.candidate_eligibility === 'DUDU') duduCount++;
    else if (job.candidate_eligibility === 'BUBU') bubuCount++;
    else bothCount++;
  });

  // Sort by deadline ascending (most urgent first)
  existingCirculars.sort((a, b) => new Date(a.deadline_date) - new Date(b.deadline_date));

  // Persist Clean Database
  fs.writeFileSync(DATA_FILE, JSON.stringify(existingCirculars, null, 2), 'utf-8');
  fs.writeFileSync(DATA_JS, `window.BUBU_DUDU_CIRCULARS = ${JSON.stringify(existingCirculars, null, 2)};`, 'utf-8');

  console.log(`\n------------------------------------------------------`);
  console.log(`✅ SYNCHRONIZATION COMPLETE`);
  console.log(`------------------------------------------------------`);
  console.log(`   • Newly Added:           ${newAddedCount}`);
  console.log(`   • Already Present:       ${alreadyPresentCount}`);
  console.log(`   • Active Open Jobs:      ${existingCirculars.length}`);
  console.log(`   • ✨ Just In (0–5 Days):  ${justIn5Count}`);
  console.log(`   • 🚨 Urgent (≤ 3 Days):   ${urgent3Count}`);
  console.log(`   • 💻 Dudu (CSE):          ${duduCount}`);
  console.log(`   • 🌾 Bubu (Agri):         ${bubuCount}`);
  console.log(`   • 🤝 Both (Joint):        ${bothCount}`);
  console.log(`------------------------------------------------------\n`);

  return {
    newAdded: newAddedCount,
    totalActive: existingCirculars.length,
    justIn5: justIn5Count,
    urgent3: urgent3Count,
    dudu: duduCount,
    bubu: bubuCount,
    both: bothCount
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runDailySync(new Date('2026-10-04T00:00:00'));
}
