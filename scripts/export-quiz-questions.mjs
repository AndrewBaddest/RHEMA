#!/usr/bin/env node
// scripts/export-quiz-questions.mjs
// Fetches all English quiz questions from Supabase and saves to a JSON file.

import 'dotenv/config';
import WebSocket from 'ws';
globalThis.WebSocket = WebSocket;
import { writeFileSync } from 'fs';
const { createClient } = await import('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const OUTPUT_FILE = 'english-questions.json';
const PAGE_SIZE = 1000; // Supabase max rows per request

async function main() {
  console.log('🚀 Starting export of English quiz questions...');

  let allQuestions = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    console.log(`📥 Fetching rows ${from} to ${to}...`);

    // Fetch a chunk. We join the 'quizzes' table to get the book_name.
    const { data, error } = await supabase
      .from('quiz_questions')
      .select(`
        id,
        quiz_id,
        question,
        options,
        correct_answer,
        verse_reference,
        quizzes ( book_name )
      `)
      .eq('language', 'en')
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      console.error('❌ Error fetching questions:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    // Clean up the data structure for translation
    const formattedChunk = data.map((q) => ({
      id: q.id,
      quiz_id: q.quiz_id,
      book: q.quizzes?.book_name || 'Unknown',
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      verse_reference: q.verse_reference,
    }));

    allQuestions = allQuestions.concat(formattedChunk);

    if (data.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      page++;
    }
  }

  console.log(`✅ Successfully fetched ${allQuestions.length} questions.`);

  // Save to disk
  writeFileSync(OUTPUT_FILE, JSON.stringify(allQuestions, null, 2), 'utf8');
  console.log(`💾 Saved to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});