#!/usr/bin/env node
import 'dotenv/config';
import WebSocket from 'ws';
globalThis.WebSocket = WebSocket;
import { readFileSync } from 'fs';
const { createClient } = await import('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  console.log('🚀 Starting import of Swahili quiz questions...');
  
  const englishData = JSON.parse(readFileSync('english-questions.json', 'utf8'));
  const swahiliData = JSON.parse(readFileSync('swahili-questions.json', 'utf8'));

  let fixedCount = 0;
  const rows = [];

  for (let i = 0; i < swahiliData.length; i++) {
    const swQ = swahiliData[i];
    const enQ = englishData[i];

    if (!enQ) continue;

    // 1. Determine the correct answer index (integer 0-3)
    let correctIndex = enQ.correct_answer; // Default to the English index

    // If the AI translated the answer into a string, find that string in the options array
    if (typeof swQ.correct_answer === 'string' && Array.isArray(swQ.options)) {
      const foundIndex = swQ.options.indexOf(swQ.correct_answer);
      if (foundIndex !== -1) {
        correctIndex = foundIndex;
      } else {
        // Fuzzy match (in case of slight typos in the AI output)
        const fuzzyIndex = swQ.options.findIndex(opt => opt.includes(swQ.correct_answer) || swQ.correct_answer.includes(opt));
        if (fuzzyIndex !== -1) correctIndex = fuzzyIndex;
      }
      fixedCount++;
    } else if (typeof swQ.correct_answer === 'number') {
      correctIndex = swQ.correct_answer;
    }

    rows.push({
      quiz_id: enQ.quiz_id, // UUID from English
      question: String(swQ.question || ''),
      options: Array.isArray(swQ.options) ? swQ.options : [],
      correct_answer: Number(correctIndex), // Force integer
      verse_reference: swQ.verse_reference || enQ.verse_reference || null,
      language: 'sw',
    });
  }

  console.log(`✅ Cleaned and prepared ${rows.length} questions. (Auto-fixed ${fixedCount} AI index hallucinations).`);

  const CHUNK = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from('quiz_questions').insert(chunk);
    
    if (error) {
      console.error(`❌ Error inserting chunk at ${i}:`, error.message);
      console.log('🚨 Failing Row:', JSON.stringify(chunk[0], null, 2));
      process.exit(1);
    } else {
      inserted += chunk.length;
      console.log(`   ✓ Inserted ${inserted}/${rows.length}`);
    }
  }
  
  console.log('🎉 Import complete! Swahili questions are now live in the DB.');
}

main().catch(console.error);
