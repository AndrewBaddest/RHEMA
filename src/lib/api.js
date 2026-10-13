// src/lib/api.js
import { supabase } from './supabase';

const API_BASE = ''; // relative to domain

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
    // 1. Get the quiz ID for the book
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id')
      .eq('book_name', bookName)
      .single();

    if (quizError || !quiz) {
      console.warn(`⚠️ No quiz found for ${bookName}, falling back to JSON.`);
      return null;
    }

    // 2. Fetch random questions for that quiz
    const { data: questions, error: qError } = await supabase
      .from('quiz_questions')
      .select('question, options, correct_answer, verse_reference')
      .eq('quiz_id', quiz.id)
      .limit(limit)
      // We don't use order('random()') because it's not supported
      // Instead, we'll shuffle on the client if needed.

    if (qError) {
      console.warn(`⚠️ Failed to fetch questions for ${bookName}:`, qError);
      return null;
    }

    // 3. Format them for the quiz engine
    return questions.map((q, idx) => ({
      ref: `${bookName}-${idx}`,
      question: q.question,
      options: q.options,
      answer: q.correct_answer,
      reference: q.verse_reference || null,
    }));
  } catch (err) {
    console.error('❌ Error fetching quiz questions from DB:', err);
    return null;
  }
}

// ─── Fetch global challenge questions (random from all books) ──
export async function fetchGlobalChallengeQuestionsFromDB(count = 30) {
  try {
    // Simply limit without order – Supabase may return arbitrary rows
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('question, options, correct_answer, quizzes(book_name)')
      .limit(count);

    if (error) {
      console.warn('⚠️ Failed to fetch global questions:', error);
      return null;
    }

    return data.map((q, idx) => ({
      id: idx,
      book: q.quizzes?.book_name || 'Bible',
      question: q.question,
      options: q.options,
      correct: q.correct_answer,
      reference: q.verse_reference || null,
    }));
  } catch (err) {
    console.error('❌ Error fetching global questions:', err);
    return null;
  }
}

// ─── Legacy JSON functions (kept for fallback) ──────────────────
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
      if (data && Array.isArray(data)) {
        allQuestions.push(...data);
      }
    } catch (e) {
      // skip
    }
  }
  cachedAllQuestions = allQuestions;
  return allQuestions;
}