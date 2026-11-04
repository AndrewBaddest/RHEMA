#!/usr/bin/env node
import 'dotenv/config';
import WebSocket from 'ws';
globalThis.WebSocket = WebSocket;
import { readFileSync, existsSync } from 'fs';
const { createClient } = await import('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  if (!existsSync('english-questions.json') || !existsSync('swahili-questions.json')) {
    console.error('❌ Missing JSON files. Cannot proceed.');
    process.exit(1);
  }

  console.log('🚀 Re-importing Swahili with source_id...');
  const enData = JSON.parse(readFileSync('english-questions.json', 'utf8'));
  const swData = JSON.parse(readFileSync('swahili-questions.json', 'utf8'));
  
  const rows = [];
  const len = Math.min(enData.length, swData.length);
  for (let i = 0; i < len; i++) {
    const en = enData[i];
    const sw = swData[i];
    if (!en || !sw || !en.id) continue;

    let correctIndex = en.correct_answer;
    if (typeof sw.correct_answer === 'string' && Array.isArray(sw.options)) {
      const idx = sw.options.indexOf(sw.correct_answer);
      if (idx !== -1) correctIndex = idx;
      else {
        const fuzzy = sw.options.findIndex(o =>
          typeof o === 'string' && (o.includes(sw.correct_answer) || sw.correct_answer.includes(o))
        );
        if (fuzzy !== -1) correctIndex = fuzzy;
      }
    }

    rows.push({
      quiz_id: en.quiz_id,
      question: String(sw.question || ''),
      options: Array.isArray(sw.options) ? sw.options : [],
      correct_answer: Number(correctIndex),
      verse_reference: String(sw.verse_reference || en.verse_reference || ''),
      language: 'sw',
      source_id: en.id, // 👈 THE LINK
    });
  }

  console.log('🗑️  Deleting existing Swahili...');
  const { error: delErr } = await supabase.from('quiz_questions').delete().eq('language', 'sw');
  if (delErr) { console.error('Delete failed:', delErr.message); process.exit(1); }

  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from('quiz_questions').insert(chunk);
    if (error) { console.error(`Insert failed at row ${i}:`, error.message); process.exit(1); }
    inserted += chunk.length;
    console.log(`   ✓ ${inserted}/${rows.length}`);
  }
  
  console.log('🎉 Re-import complete!');
}
main().catch(console.error);
