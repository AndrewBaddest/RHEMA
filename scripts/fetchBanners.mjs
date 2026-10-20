import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'ads');

// The sites that used to have beautiful OG backgrounds
const ADS = [
  { id: 2, url: 'https://www.integernetwork.com/' },
  { id: 3, url: 'https://aaeauthenticafricanexperience.co.za/experiences/' },
  { id: 4, url: 'https://www.fletcherseminary.org/' },
  { id: 9, url: 'https://www.intimite777.com/' },
  { id: 10, url: 'https://phaneroo.org/' },
  { id: 6, url: 'https://globalchallenge.org/' },
  { id: 7, url: 'https://allnations.international/' },
  { id: 11, url: 'https://www.ntuma.app/' }, // Assuming Ntuma is ID 11

];

async function fetchBanner({ id, url }) {
  console.log(`🔍 Fetching background for ad ${id}...`);
  try {
    // Ask Microlink for the OG image
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&meta`);
    const json = await res.json();
    const imageUrl = json?.data?.image?.url;

    if (!imageUrl) {
      console.log(`  ⚠️ No OG image found for ad ${id}`);
      return;
    }

    // Download the actual image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
    
    const arrayBuffer = await imgRes.arrayBuffer();
    const filename = `bg-${id}.jpg`;
    await writeFile(join(OUT_DIR, filename), Buffer.from(arrayBuffer));
    
    console.log(`  ✅ Saved ${filename}`);
  } catch (err) {
    console.error(`  ❌ Failed ad ${id}:`, err.message);
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const ad of ADS) {
    await fetchBanner(ad);
    // Wait 2 seconds between requests to be polite
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log('\nDone! Now update the DB.');
}

main();