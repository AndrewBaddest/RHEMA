// src/lib/api.js
import { supabase } from './supabase';

const API_BASE = '';

// ─── Pick the most accurate verse reference we can ────────────────
// Priority:
//   1. A "(Book C:V)" pattern embedded in the question text
//   2. A verse_reference from the DB that already has C:V
//   3. A verse_reference from the DB with only chapter → append :1
//   4. Fallback string
function pickVerseRef(questionText, dbRef, fallback) {
  // 1. Any parenthetical in the question that contains C:V
  const text = String(questionText || '');
  const parens = text.match(/\(([^)]+)\)/g) || [];
  for (const p of parens) {
    const inner = p.slice(1, -1).trim();
    if (/\b\d+\s*:\s*\d+\b/.test(inner)) return inner;
  }

  // 2/3. DB value
  const db = String(dbRef || '').trim();
  if (/\b\d+\s*:\s*\d+\b/.test(db)) return db;
  if (/^.+?\s+\d+$/.test(db)) return `${db}:1`;

  // 4. Fallback
  return db || fallback;
}

// ─── Static JSON (fallback) ──────────────────────────────────────
export async function fetchBibleData(book) {
  const safeName = encodeURIComponent(book);
  const response = await fetch(`${API_BASE}/Bible-niv/${safeName}.json`);
  if (!response.ok) throw new Error('Book not found');
  return response.json();
}

// ─── Fetch quiz questions from Supabase ──────────────────────────
export async function fetchQuizQuestionsFromDB(bookName, limit = 10) {
  try {
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id')
      .eq('book_name', bookName)
      .single();

    if (quizError || !quiz) {
      console.warn(`⚠️ No quiz found for ${bookName}, falling back to JSON.`);
      return null;
    }

    const { data: questions, error: qError } = await supabase
      .from('quiz_questions')
      .select('question, options, correct_answer, verse_reference')
      .eq('quiz_id', quiz.id)
      .limit(limit);

    if (qError) {
      console.warn(`⚠️ Failed to fetch questions for ${bookName}:`, qError);
      return null;
    }

    return questions.map((q, idx) => {
      const verseRef = pickVerseRef(q.question, q.verse_reference, `${bookName} ${idx + 1}:1`);
      return {
        ref: verseRef,
        question: q.question,
        options: q.options,
        answer: q.correct_answer,
        reference: verseRef,
      };
    });
  } catch (err) {
    console.error('❌ Error fetching quiz questions from DB:', err);
    return null;
  }
}

// ─── Fetch global challenge questions (random from all books) ──
export async function fetchGlobalChallengeQuestionsFromDB(count = 30) {
  try {
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('question, options, correct_answer, verse_reference, quizzes(book_name)')
      .limit(count);

    if (error) {
      console.warn('⚠️ Failed to fetch global questions:', error);
      return null;
    }

    return data.map((q, idx) => {
      const bookName = q.quizzes?.book_name || 'Bible';
      const verseRef = pickVerseRef(q.question, q.verse_reference, `${bookName} ${idx + 1}:1`);
      return {
        id: idx,
        book: bookName,
        question: q.question,
        options: q.options,
        answer: q.correct_answer,
        correct: q.correct_answer,
        ref: verseRef,
        reference: verseRef,
      };
    });
  } catch (err) {
    console.error('❌ Error fetching global questions:', err);
    return null;
  }
}

// ─── Legacy JSON functions (fallback) ───────────────────────────
export async function fetchQuizData(book) {
  const safeName = encodeURIComponent(book);
  const url = `${API_BASE}/quiz_data/${safeName}.json`;
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json();
}

// ─── Cache for all quiz questions ──────────────────────────────
let cachedAllQuestions = null;

export async function fetchAllQuizQuestions() {
  if (cachedAllQuestions) return cachedAllQuestions;
  const allQuestions = [];
  const { ALL_BOOKS } = await import('./utils');
  for (const book of ALL_BOOKS) {
    try {
      const data = await fetchQuizData(book);
      if (data && Array.isArray(data)) allQuestions.push(...data);
    } catch (e) {}
  }
  cachedAllQuestions = allQuestions;
  return allQuestions;
}