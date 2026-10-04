import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'circulars.json');

async function inspectPortal(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return { url, status: res.status, error: `HTTP ${res.status}` };
    const html = await res.text();

    // Find PDF links
    const pdfMatches = [...html.matchAll(/href=["']([^"']*\.pdf[^"']*)["']/gi)].map(m => m[1]);
    const docMatches = [...html.matchAll(/href=["']([^"']*(?:docs?|download|circular)[^"']*)["']/gi)].map(m => m[1]);

    // Find Deadline
    const deadlineMatch = html.match(/deadline[:\s]*([^\n<]+)/i) || 
                          html.match(/Application\s*Deadline[:\s]*([^\n<]+)/i) ||
                          html.match(/শেষ\s*সময়[:\s]*([^\n<]+)/i);

    return {
      url,
      status: 200,
      pdfs: [...new Set([...pdfMatches, ...docMatches])],
      deadlineText: deadlineMatch ? deadlineMatch[1].trim() : null
    };
  } catch (err) {
    return { url, status: null, error: err.message };
  }
}

async function run() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  console.log(`Analyzing ${data.length} circulars...`);

  for (const job of data) {
    console.log(`\n-----------------------------------------`);
    console.log(`🔍 [${job.id}] ${job.organization}`);
    console.log(`   Configured Apply: ${job.apply_url}`);
    console.log(`   Configured PDF:   ${job.pdf_url}`);
    console.log(`   Configured DL:    ${job.deadline_date}`);

    if (job.apply_url && job.apply_url.startsWith('http')) {
      const info = await inspectPortal(job.apply_url);
      if (info.error) {
        console.log(`   ❌ Portal fetch error: ${info.error}`);
      } else {
        console.log(`   ✅ Portal Status 200`);
        console.log(`   📅 Real Deadline text on page: ${info.deadlineText || 'Not found'}`);
        console.log(`   📄 Real PDF links found:`, info.pdfs);
      }
    }
  }
}

run();
