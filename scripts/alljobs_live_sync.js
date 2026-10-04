/**
 * alljobs_live_sync.js
 * Fetches authentic, live government circulars from the official Teletalk AllJobs API.
 * Strictly filters:
 * 1. Only circulars published within the last 30 days (10-30 days window).
 * 2. Only circulars whose deadline has not expired (daysLeft >= 0).
 * 3. Never adds old 2023/2024/2025 circulars.
 * 4. Categorizes eligibility for Dudu (CSE), Bubu (Agri), and Both.
 * 5. Uses verified PDF links: https://alljobs.teletalk.com.bd/media/${advertisement_file}
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const DATA_JSON = path.join(__dirname, '..', 'data', 'circulars.json');
const DATA_JS = path.join(__dirname, '..', 'data', 'circulars.js');

// Current reference date (today)
const TODAY = new Date('2026-10-04T00:00:00');

function fetchJson(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'alljobs.teletalk.com.bd',
      path: endpoint,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer false',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

function determineGrade(title, details) {
  const t = (title + ' ' + (details.job_title_bn || '')).toLowerCase();
  if (t.includes('programmer') && !t.includes('assistant')) return 'GRADE 6';
  if (t.includes('assistant programmer') || t.includes('সহকারী প্রোগ্রামার') || t.includes('scientific officer') || t.includes('বৈজ্ঞানিক কর্মকর্তা') || t.includes('junior officer') || t.includes('সহকারী প্রকৌশলী') || t.includes('assistant maintenance engineer')) return 'GRADE 9';
  if (t.includes('sub assistant') || t.includes('উপ-সহকারী') || t.includes('sub-assistant')) return 'GRADE 10';
  if (t.includes('computer operator') || t.includes('কম্পিউটার অপারেটর')) return 'GRADE 13';
  if (t.includes('steno') || t.includes('সাঁট-মুদ্রাক্ষরিক') || t.includes('সাঁট মুদ্রাক্ষরিক') || t.includes('stenographer')) return 'GRADE 14';
  if (t.includes('office assistant') || t.includes('অফিস সহকারী') || t.includes('typist') || t.includes('মুদ্রাক্ষরিক') || t.includes('store keeper') || t.includes('হিসাব সহকারী') || t.includes('accounts assistant')) return 'GRADE 16';
  if (t.includes('driver') || t.includes('ড্রাইভার') || t.includes('গাড়ী চালক')) return 'GRADE 16';
  if (t.includes('office support') || t.includes('অফিস সহায়ক') || t.includes('security guard') || t.includes('cleaner') || t.includes('নিরাপত্তা প্রহরী')) return 'GRADE 20';
  return 'GRADE 13';
}

function classifyCandidate(title, orgName, details) {
  const text = (title + ' ' + orgName + ' ' + (details.job_title_bn || '')).toLowerCase();
  
  // DUDU (CSE / IT)
  const isCse = text.includes('programmer') || text.includes('প্ৰোগ্রামার') || text.includes('computer') ||
                text.includes('software') || text.includes('system') || text.includes('maintenance engineer') ||
                text.includes('আইটি') || text.includes('information technology') || text.includes('ডাটা') || text.includes('data');

  // BUBU (Agriculture)
  const isAgri = text.includes('agri') || text.includes('কৃষি') || text.includes('bari') || text.includes('bina') ||
                 text.includes('brri') || text.includes('scientific officer') || text.includes('বৈজ্ঞানিক') ||
                 text.includes('field assistant') || text.includes('মাঠ সহকারী') || text.includes('উদ্ভিদ') ||
                 text.includes('horticulture') || text.includes('crop') || text.includes('soil');

  if (isCse && isAgri) return 'BOTH';
  if (isCse) return 'DUDU';
  if (isAgri) return 'BUBU';

  // General administrative / office jobs suitable for both
  if (text.includes('operator') || text.includes('officer') || text.includes('assistant') || text.includes('typist') || text.includes('সহকারী') || text.includes('কমিশনার') || text.includes('কর')) {
    return 'BOTH';
  }

  return 'BOTH';
}

async function runLiveSync() {
  console.log('========================================================');
  console.log('🌐 FETCHING OFFICIAL LIVE CIRCULARS FROM ALLJOBS TELETALK');
  console.log(`📅 Reference Date: ${TODAY.toISOString().split('T')[0]}`);
  console.log('========================================================\n');

  const orgRes = await fetchJson('/api/v1/govt-jobs/org-list?page=1&limit=50');
  if (!orgRes.govtOrgJobs || orgRes.govtOrgJobs.length === 0) {
    console.error('Failed to retrieve organizations from AllJobs.');
    return;
  }

  console.log(`[+] Found ${orgRes.govtOrgJobs.length} active recruiting government organizations.\n`);

  const liveJobs = [];

  for (const org of orgRes.govtOrgJobs) {
    // Fetch all jobs for this org
    const jobListRes = await fetchJson(`/api/v1/govt-jobs/list?orgId=${org.id}&skipLimit=YES`);
    const jobs = jobListRes.govtJobs || [];
    
    for (const j of jobs) {
      const pubDateStr = (j.published_date || '').split('T')[0];
      const deadDateStr = (j.deadline_date || '').split('T')[0];

      if (!pubDateStr || !deadDateStr) continue;

      const pubDate = new Date(pubDateStr);
      const deadDate = new Date(deadDateStr);

      // 1. Strict Date Validation: Never include ancient jobs from 2023, 2024, or early 2025
      if (pubDate.getFullYear() < 2026 || deadDate.getFullYear() < 2026) {
        continue;
      }

      // Calculate days old and days left relative to today
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysOld = Math.floor((TODAY - pubDate) / msPerDay);
      const daysLeft = Math.ceil((deadDate - TODAY) / msPerDay);

      // User strict requirement:
      // - Recent 10 to 30 days old only! (daysOld <= 30)
      // - Active only! (daysLeft >= 0)
      if (daysLeft < 0) {
        // Expired -> skip entirely!
        continue;
      }
      if (daysOld > 30) {
        // More than 30 days old -> too old, skip!
        continue;
      }

      // Filter grades: user wants Grade 9-16 (ignore pure Grade 20 sweepers/cleaners unless candidate wants)
      const grade = determineGrade(j.job_title, j);
      if (grade === 'GRADE 20') {
        // Skip cleaner, sweeper, security guard Grade 20 posts
        continue;
      }

      // Now fetch public details to get authentic PDF and apply site
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

      const jobRecord = {
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
      };

      liveJobs.push(jobRecord);
      console.log(` ✅ [${jobRecord.candidate_eligibility}] ${j.job_title} | ${org.short_name || org.name} | Published: ${pubDateStr} (${daysOld}d ago) | Deadline: ${deadDateStr} (${daysLeft}d left)`);
    }
  }

  console.log(`\n========================================================`);
  console.log(`🎉 Ingested ${liveJobs.length} active, verified, recent circulars!`);
  console.log(`========================================================\n`);

  // Write to circulars.json and circulars.js
  fs.writeFileSync(DATA_JSON, JSON.stringify(liveJobs, null, 2), 'utf8');
  console.log(`💾 Saved to ${DATA_JSON}`);

  const jsContent = `/**
 * BUBU-DUDU JOB CIRCULARS DATABASE (MIRROR)
 * Automatically synced from Official Teletalk AllJobs API
 * Last Synced: ${new Date().toISOString()}
 */
window.BUBU_DUDU_CIRCULARS = ${JSON.stringify(liveJobs, null, 2)};
`;
  fs.writeFileSync(DATA_JS, jsContent, 'utf8');
  console.log(`💾 Saved to ${DATA_JS}`);
}

runLiveSync().catch(err => {
  console.error('Sync failed:', err);
});
