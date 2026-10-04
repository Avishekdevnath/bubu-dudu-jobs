import fs from 'node:fs';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const portals = [
  { name: 'bkkb', url: 'https://bkkb.teletalk.com.bd' },
  { name: 'bina', url: 'https://bina.teletalk.com.bd' },
  { name: 'dgfood', url: 'http://dgfood.teletalk.com.bd' },
  { name: 'most', url: 'http://most.teletalk.com.bd' },
  { name: 'brri', url: 'http://brri.teletalk.com.bd' },
  { name: 'cga', url: 'http://cga.teletalk.com.bd' }
];

async function checkAll() {
  for (const p of portals) {
    try {
      const res = await fetch(p.url);
      const text = await res.text();
      
      // Look for deadline in script or text
      const dateMatches = text.match(/\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}/g) || [];
      const pdfs = [...text.matchAll(/href=["']([^"']*\.pdf[^"']*)["']/gi)].map(m => m[1]);
      
      // Check head of first PDF
      let verifiedPdf = null;
      for (const pdf of pdfs) {
        const fullUrl = pdf.startsWith('http') ? pdf : `${p.url.replace(/\/$/, '')}/${pdf.replace(/^\//, '')}`;
        try {
          const r = await fetch(fullUrl, { method: 'HEAD' });
          if (r.status === 200) {
            verifiedPdf = fullUrl;
            break;
          }
        } catch (e) {}
      }

      console.log(`\n--- ${p.name.toUpperCase()} ---`);
      console.log('Landing URL:', p.url);
      console.log('Dates found in HTML:', [...new Set(dateMatches)]);
      console.log('Verified Working PDF (HTTP 200):', verifiedPdf || 'None');
    } catch (err) {
      console.log(`--- ${p.name.toUpperCase()} ERROR:`, err.message);
    }
  }
}

checkAll();
