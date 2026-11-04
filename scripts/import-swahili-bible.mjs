#!/usr/bin/env node
// scripts/import-swahili-bible.mjs
// Imports the Swahili Bible into the verses table with language = 'sw'.
// Idempotent, alias-aware, and safe to re-run.

import 'dotenv/config';
import WebSocket from 'ws';
globalThis.WebSocket = WebSocket;
import { readFileSync, existsSync } from 'fs';
const { createClient } = await import('@supabase/supabase-js');

// ─── CONFIG ────────────────────────────────────────────────────────
const SWAHILI_JSON_PATH = process.env.SWAHILI_JSON_PATH
  || '/tmp/swahili-bible/swahili-bible-edition.json';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const DRY_RUN = process.argv.includes('--dry-run');

// ─── CANONICAL SWAHILI → ENGLISH MAP (66 books) ────────────────────
const SW_TO_EN_CANONICAL = {
  'Mwanzo': 'Genesis',
  'Kutoka': 'Exodus',
  'Walawi': 'Leviticus',
  'Hesabu': 'Numbers',
  'Kumbukumbu la Torati': 'Deuteronomy',
  'Yoshua': 'Joshua',
  'Waamuzi': 'Judges',
  'Ruthu': 'Ruth',
  '1 Samweli': '1 Samuel',
  '2 Samweli': '2 Samuel',
  '1 Wafalme': '1 Kings',
  '2 Wafalme': '2 Kings',
  '1 Mambo ya Nyakati': '1 Chronicles',
  '2 Mambo ya Nyakati': '2 Chronicles',
  'Ezra': 'Ezra',
  'Nehemia': 'Nehemiah',
  'Esta': 'Esther',
  'Ayubu': 'Job',
  'Zaburi': 'Psalms',
  'Mithali': 'Proverbs',
  'Mhubiri': 'Ecclesiastes',
  'Wimbo Ulio Bora': 'Song of Solomon',
  'Isaya': 'Isaiah',
  'Yeremia': 'Jeremiah',
  'Maombolezo': 'Lamentations',
  'Ezekieli': 'Ezekiel',
  'Danieli': 'Daniel',
  'Hosea': 'Hosea',
  'Yoeli': 'Joel',
  'Amosi': 'Amos',
  'Obadia': 'Obadiah',
  'Yona': 'Jonah',
  'Mika': 'Micah',
  'Nahumu': 'Nahum',
  'Habakuki': 'Habakkuk',
  'Sefania': 'Zephaniah',
  'Hagai': 'Haggai',
  'Zekaria': 'Zechariah',
  'Malaki': 'Malachi',
  'Mathayo': 'Matthew',
  'Marko': 'Mark',
  'Luka': 'Luke',
  'Yohana': 'John',
  'Matendo ya Mitume': 'Acts',
  'Warumi': 'Romans',
  '1 Wakorintho': '1 Corinthians',
  '2 Wakorintho': '2 Corinthians',
  'Wagalatia': 'Galatians',
  'Waefeso': 'Ephesians',
  'Wafilipi': 'Philippians',
  'Wakolosai': 'Colossians',
  '1 Wathesalonike': '1 Thessalonians',
  '2 Wathesalonike': '2 Thessalonians',
  '1 Timotheo': '1 Timothy',
  '2 Timotheo': '2 Timothy',
  'Tito': 'Titus',
  'Filemoni': 'Philemon',
  'Waebrania': 'Hebrews',
  'Yakobo': 'James',
  '1 Petro': '1 Peter',
  '2 Petro': '2 Peter',
  '1 Yohana': '1 John',
  '2 Yohana': '2 John',
  '3 Yohana': '3 John',
  'Yuda': 'Jude',
  'Ufunuo wa Yohana': 'Revelation',
};

// ─── ALTERNATE NAMES ──────────────────────────────────────────────
const SW_ALIASES = {
  'Wimbo wa Sulemani': 'Wimbo Ulio Bora',
  'Wimbo Bora': 'Wimbo Ulio Bora',
  'Song of Songs': 'Wimbo Ulio Bora',
  'Song Of Songs': 'Wimbo Ulio Bora',
  'Ufunuo': 'Ufunuo wa Yohana',
  'Ufunuo wa Yohana Mtakatifu': 'Ufunuo wa Yohana',
  'Matendo': 'Matendo ya Mitume',
  'Matendo ya Mitume Watakatifu': 'Matendo ya Mitume',
  'Zaburi za Daudi': 'Zaburi',
  'Zaburi ya Daudi': 'Zaburi',
  'Samweli 1': '1 Samweli',
  'Samweli 2': '2 Samweli',
  'Wafalme 1': '1 Wafalme',
  'Wafalme 2': '2 Wafalme',
  'Mambo ya Nyakati 1': '1 Mambo ya Nyakati',
  'Mambo ya Nyakati 2': '2 Mambo ya Nyakati',
  'Wakorintho 1': '1 Wakorintho',
  'Wakorintho 2': '2 Wakorintho',
  'Wathesalonike 1': '1 Wathesalonike',
  'Wathesalonike 2': '2 Wathesalonike',
  'Timotheo 1': '1 Timotheo',
  'Timotheo 2': '2 Timotheo',
  'Petro 1': '1 Petro',
  'Petro 2': '2 Petro',
  'Yohana 1': '1 Yohana',
  'Yohana 2': '2 Yohana',
  'Yohana 3': '3 Yohana',
  'Mambo ya Walawi': 'Walawi',
  '1 Samueli': '1 Samweli',
  '2 Samueli': '2 Samweli',
};

// ─── NORMALIZATION ────────────────────────────────────────────────
function normalizeName(name) {
  if (!name) return '';
  let n = String(name).trim();
  n = n.replace(/^(Kitabu cha|The Book of|Book of)\s+/i, '');
  n = n.replace(/^III\s+/, '3 ')
       .replace(/^II\s+/, '2 ')
       .replace(/^I\s+/, '1 ');
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

const SW_TO_EN = (() => {
  const map = {};
  for (const [sw, en] of Object.entries(SW_TO_EN_CANONICAL)) {
    map[normalizeName(sw)] = en;
  }
  for (const [alias, canonical] of Object.entries(SW_ALIASES)) {
    const en = SW_TO_EN_CANONICAL[canonical];
    if (en) map[normalizeName(alias)] = en;
  }
  return map;
})();

function swToEn(swBook) {
  return SW_TO_EN[normalizeName(swBook)] || null;
}

// ─── READ SWAHILI JSON FROM DISK ───────────────────────────────────
async function loadSwahiliJson() {
  if (!existsSync(SWAHILI_JSON_PATH)) {
    throw new Error(
      `JSON file not found at ${SWAHILI_JSON_PATH}\n` +
      `Download it first:\n` +
      `  mkdir -p /tmp/swahili-bible\n` +
      `  curl -L --fail -o ${SWAHILI_JSON_PATH} \\\n` +
      `    "https://raw.githubusercontent.com/shemmjunior/swahili-bible-edition/main/json/full_version/swahili-bible-edition.json"`
    );
  }
  console.log(`📂 Reading Swahili Bible JSON from ${SWAHILI_JSON_PATH} ...`);
  const raw = readFileSync(SWAHILI_JSON_PATH, 'utf8');
  const data = JSON.parse(raw);
  console.log('✅ JSON loaded from disk.');
  return data;
}

// ─── NORMALISE JSON STRUCTURE ──────────────────────────────────────
function normaliseSwahiliBible(json) {
  const entries = [];

  function extractBookName(bookObj) {
    return bookObj.book_name || bookObj.name || bookObj.book ||
           bookObj.BOOK || bookObj.title || bookObj.bookName || null;
  }
  function extractChapters(bookObj) {
    const raw = bookObj.CHAPTER || bookObj.chapters || bookObj.chapter;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  }
  function extractChapterNumber(chapterObj) {
    return chapterObj.chapter_number || chapterObj.chapter ||
           chapterObj.number || chapterObj.CHAPTER || chapterObj.NUMBER || null;
  }
  function extractVerses(chapterObj) {
    const raw = chapterObj.VERSES || chapterObj.verses || chapterObj.verse;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  }
  function extractVerseNumber(verseObj) {
    return verseObj.verse_number || verseObj.verse || verseObj.number ||
           verseObj.VERSE || verseObj.NUMBER || null;
  }
  function extractVerseText(verseObj) {
    if (typeof verseObj === 'string') return verseObj;
    return verseObj.verse_text || verseObj.text || verseObj.TEXT ||
           verseObj.content || null;
  }

  const books = Array.isArray(json)
    ? json
    : json.BIBLEBOOK || json.books || json.data
      || Object.values(json).find(v => Array.isArray(v))
      || [];

  if (!Array.isArray(books) || books.length === 0) {
    throw new Error(
      'Could not find a books array in JSON. Root keys: ' +
      Object.keys(json).join(', ')
    );
  }

  for (const book of books) {
    const swBook = extractBookName(book);
    if (!swBook) {
      console.warn('⚠️  Skipping a book with no name field:', Object.keys(book));
      continue;
    }
    for (const chapter of extractChapters(book)) {
      const chapterNum = extractChapterNumber(chapter);
      if (chapterNum == null) continue;
      for (const verse of extractVerses(chapter)) {
        const verseNum = extractVerseNumber(verse);
        const text = extractVerseText(verse);
        if (verseNum == null || text == null) continue;
        entries.push({
          swBook: String(swBook).trim(),
          chapter: Number(chapterNum),
          verse: Number(verseNum),
          text: String(text).trim(),
        });
      }
    }
  }
  return entries;
}

// ─── MAIN ──────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no writes will happen.' : '🚀 LIVE RUN — writing to DB.');

  const json = await loadSwahiliJson();
  const entries = normaliseSwahiliBible(json);
  console.log(`📖 Parsed ${entries.length} Swahili verses from JSON.`);

  const byBook = new Map();
  for (const e of entries) {
    if (!byBook.has(e.swBook)) byBook.set(e.swBook, []);
    byBook.get(e.swBook).push(e);
  }

  let inserted = 0, skipped = 0, errors = 0;

  const { data: dbBooks, error: bookErr } = await supabase
    .from('books').select('id, name');
  if (bookErr) throw bookErr;

  const bookNameToId = {};
  for (const b of dbBooks) {
    bookNameToId[normalizeName(b.name).toLowerCase()] = b.id;
  }

  if (!bookNameToId['song of solomon']) {
    const alt = Object.keys(bookNameToId).find(k => k.replace(/\s+/g, '') === 'songofsolomon');
    if (alt) bookNameToId['song of solomon'] = bookNameToId[alt];
  }

  for (const [swBook, bookEntries] of byBook.entries()) {
    const enBook = swToEn(swBook);
    if (!enBook) {
      console.warn(`⚠️  No English mapping for Swahili book "${swBook}" — skipping ${bookEntries.length} verses.`);
      skipped += bookEntries.length;
      continue;
    }
    const enKey = normalizeName(enBook).toLowerCase();
    const bookId = bookNameToId[enKey];
    if (!bookId) {
      console.warn(`⚠️  English book "${enBook}" not found in public.books — skipping.`);
      skipped += bookEntries.length;
      continue;
    }

    const { data: dbChapters, error: chErr } = await supabase
      .from('chapters').select('id, number').eq('book_id', bookId);
    if (chErr) {
      console.error(`❌ Chapter lookup failed for ${enBook}:`, chErr.message);
      errors += bookEntries.length;
      continue;
    }
    const chapterNumToId = {};
    for (const c of dbChapters) chapterNumToId[c.number] = c.id;

    const chapterIds = Object.values(chapterNumToId);
    if (chapterIds.length === 0) {
      console.warn(`⚠️  No chapters found for ${enBook} — skipping.`);
      skipped += bookEntries.length;
      continue;
    }

    const { data: existing, error: exErr } = await supabase
      .from('verses').select('chapter_id, number')
      .eq('language', 'sw').in('chapter_id', chapterIds);
    if (exErr) {
      console.error(`❌ Existing-verse lookup failed for ${enBook}:`, exErr.message);
      errors += bookEntries.length;
      continue;
    }
    const existingSet = new Set((existing || []).map(v => `${v.chapter_id}:${v.number}`));

    const rows = [];
    for (const e of bookEntries) {
      const chapterId = chapterNumToId[e.chapter];
      if (!chapterId) {
        console.warn(`⚠️  ${enBook} chapter ${e.chapter} not in DB — skipping verse ${e.verse}.`);
        skipped++;
        continue;
      }
      if (existingSet.has(`${chapterId}:${e.verse}`)) { skipped++; continue; }
      rows.push({ chapter_id: chapterId, number: e.verse, text: e.text, language: 'sw' });
    }

    if (rows.length === 0) {
      console.log(`⏭️  ${enBook}: all verses already present.`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`🔍 DRY: would insert ${rows.length} verses for ${enBook} (${swBook}).`);
      inserted += rows.length;
      continue;
    }

    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error: insErr } = await supabase.from('verses').insert(chunk);
      if (insErr) {
        console.error(`❌ Insert failed for ${enBook} chunk ${i / CHUNK + 1}:`, insErr.message);
        errors += chunk.length;
      } else {
        inserted += chunk.length;
        console.log(`   ✓ ${enBook}: ${i + chunk.length}/${rows.length} inserted.`);
      }
    }
  }

  console.log('\n─── SUMMARY ─────────────────────────────');
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Skipped (already exist / unmatched): ${skipped}`);
  console.log(`   Errors:   ${errors}`);
  if (DRY_RUN) console.log('   (DRY RUN — no rows actually written.)');
}

main().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});