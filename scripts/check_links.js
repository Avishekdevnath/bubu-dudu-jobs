import http from 'node:http';
import https from 'node:https';

async function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { timeout: 8000 }, (res) => {
        let data = '';
        res.on('data', chunk => { if (data.length < 50000) data += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode, data });
        });
      });
      req.on('error', (err) => resolve({ status: null, error: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ status: null, error: 'TIMEOUT' }); });
    } catch (e) {
      resolve({ status: null, error: e.message });
    }
  });
}

async function test() {
  console.log('Fetching dgfood.teletalk.com.bd...');
  const res = await checkUrl('http://dgfood.teletalk.com.bd');
  console.log('Status:', res.status);
  if (res.data) {
    const lines = res.data.split('\n');
    const relevant = lines.filter(l => l.includes('.pdf') || l.includes('Advertisement') || l.includes('Deadline') || l.includes('href'));
    console.log('Relevant lines:\n', relevant.slice(0, 15).join('\n'));
  }
}

test();
