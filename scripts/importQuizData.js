const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://rmabikvmjwuypmitctbw.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtYWJpa3Ztand1eXBtaXRjdGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODE0MDIsImV4cCI6MjEwMjM1NzQwMn0.kUYIVudJKfbHuwK8aE0nnYVLQOvJR-E7sALx3l-srD4';

const QUIZ_DIR = path.join(__dirname, '../public/quiz_data');

// Helper: fetch with Supabase REST
async function supabaseFetch(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  // Check if response has content
  const contentLength = response.headers.get('content-length');
  if (contentLength === '0') {
    return null; // no body
  }

  try {
    return await response.json();
  } catch (e) {
    // Sometimes Supabase returns an empty body even when content-length > 0? (rare)
    // Fallback to null
    return null;
  }
}

async function importBook(bookName) {
  const filePath = path.join(QUIZ_DIR, `${bookName}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ No quiz file for ${bookName}, skipping.`);
    return;
  }

  const questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!Array.isArray(questions) || questions.length === 0) {
    console.log(`⚠️ No questions in ${bookName}.json, skipping.`);
    return;
  }

  console.log(`📖 Importing ${questions.length} questions for ${bookName}...`);

  // 1. Insert quiz metadata – check if already exists
  const existing = await supabaseFetch(`quizzes?book_name=eq.${encodeURIComponent(bookName)}`, {
    method: 'GET',
  });
  if (existing && existing.length > 0) {
    console.log(`   ℹ️ Quiz for ${bookName} already exists, skipping.`);
    return;
  }

  // Insert new quiz
  const quizData = { book_name: bookName, question_count: questions.length };
  const quizResult = await supabaseFetch('quizzes', {
    method: 'POST',
    body: JSON.stringify(quizData),
    headers: { 'Prefer': 'return=representation' },
  });

  const quizId = quizResult?.[0]?.id;
  if (!quizId) {
    console.error(`❌ Failed to create quiz for ${bookName}`);
    return;
  }

  // 2. Insert questions in batches
  const questionRows = questions.map((q) => ({
    quiz_id: quizId,
    question: q.question,
    options: q.options,
    correct_answer: q.answer,
    verse_reference: q.reference || null,
  }));

  const BATCH_SIZE = 100;
  for (let i = 0; i < questionRows.length; i += BATCH_SIZE) {
    const batch = questionRows.slice(i, i + BATCH_SIZE);
    await supabaseFetch('quiz_questions', {
      method: 'POST',
      body: JSON.stringify(batch),
      headers: { 'Prefer': 'return=minimal' },
    });
    console.log(`   ✅ Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}`);
  }

  console.log(`✅ Imported ${questionRows.length} questions for ${bookName}`);
}

async function importAll() {
  // Get all JSON files in quiz_data
  const files = fs.readdirSync(QUIZ_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const bookName = path.basename(file, '.json');
    await importBook(bookName);
  }
  console.log('🎉 All quiz data imported!');
}

importAll().catch(console.error);