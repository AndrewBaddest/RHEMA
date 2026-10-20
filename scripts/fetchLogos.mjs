import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'ads');

const LOGOS = [
  { id: 1, domain: 'biblicalelearning.org', file: 'logo-1.png' },
  { id: 10, domain: 'phaneroo.org', file: 'logo-10.png' },
  { id: 5, domain: 'quantumenterpriseug.vercel.app', file: 'logo-5.png' }
];

async function downloadLogo({ domain, file }) {
  const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
  console.log(`🔍 Fetching favicon for ${domain}...`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    await writeFile(join(OUT_DIR, file), Buffer.from(arrayBuffer));
    console.log(`  ✅ Saved ${file}`);
  } catch (err) {
    console.error(`  ❌ Failed ${domain}:`, err.message);
  }
}

async function main() {
  for (const logo of LOGOS) {
    await downloadLogo(logo);
  }
  console.log('\nDone! Now update the DB.');
}

main();
