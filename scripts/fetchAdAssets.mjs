#!/usr/bin/env node
import { writeFile, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'ads');

const ASSETS = [
  { file: 'ad-1-bg-1.jpg', url: 'https://biblicalelearning.org/wp-content/uploads/2021/10/Ted_Hildebrandt_Photo_Lake_Louis_Hotel-200x200.jpg' },
  { file: 'ad-1-bg-2.jpg', url: 'https://biblicalelearning.org/wp-content/uploads/2025/06/MayYoung_Picture_600x600-200x200.jpg' },
  { file: 'ad-1-bg-3.jpg', url: 'https://biblicalelearning.org/wp-content/uploads/2026/05/Steve400Staff-300x300.jpg' },
  { file: 'ad-2.png', url: 'https://static.wixstatic.com/media/a6a89f_648afa660f96433e8a740f5b16d87573~mv2.png/v1/fill/w_600,h_600,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Integer%20Network%20Logo.png' },
  { file: 'ad-3.png', url: 'https://aaeauthenticafricanexperience.co.za/wp-content/uploads/2024/05/AAE-LOGO.png' },
  { file: 'ad-4.svg', url: 'https://www.fletcherseminary.org/wp-content/uploads/2025/06/Group-20.svg' },
  { file: 'ad-5.png', url: 'https://www.google.com/s2/favicons?domain=quantumenterpriseug.vercel.app&sz=256' },
  { file: 'ad-6.svg', url: 'https://globalchallenge.org/wp-content/uploads/2026/06/GC_Logo_Vector.svg' },
  { file: 'ad-8.png', url: 'https://cdn-icons-png.flaticon.com/512/2948/2948037.png' },
  { file: 'ad-9.jpg', url: 'https://d1yei2z3i6k35z.cloudfront.net/11609387/69ade4b997ca6_intimitelogo.jpg' },
];

async function exists(p) {
  try { await access(p, constants.F_OK); return true; } catch { return false; }
}

async function fetchOne({ file, url }) {
  const dest = join(OUT_DIR, file);
  if (await exists(dest)) { console.log(`  ⏭️  ${file} — already exists`); return { ok: true, skipped: true }; }
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) { console.log(`  ❌ ${file} — HTTP ${res.status}`); return { ok: false }; }
    const buf = await res.arrayBuffer();
    await writeFile(dest, Buffer.from(buf));
    console.log(`  ✅ ${file} — ${(buf.byteLength / 1024).toFixed(1)} KB`);
    return { ok: true };
  } catch (err) {
    console.log(`  ❌ ${file} — ${err.message}`);
    return { ok: false };
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Downloading ${ASSETS.length} ad assets to ${OUT_DIR}\n`);
  const results = [];
  for (const a of ASSETS) results.push(await fetchOne(a));
  const failed = results.filter(r => !r.ok);
  console.log(`\n── Summary ───────────────`);
  console.log(`  Downloaded: ${results.filter(r => r.ok && !r.skipped).length}`);
  console.log(`  Skipped:    ${results.filter(r => r.skipped).length}`);
  console.log(`  Failed:     ${failed.length}`);
  if (failed.length) {
    console.log(`\n  Failed files (download manually in browser):`);
    for (const r of failed) {
      const asset = ASSETS[results.indexOf(r)];
      console.log(`    ${asset.file}  ←  ${asset.url}`);
    }
    process.exitCode = 1;
  }
}

main();
