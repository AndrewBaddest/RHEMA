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
      const verseRef =
        q.verse_reference && String(q.verse_reference).trim()
          ? String(q.verse_reference).trim()
          : `${bookName} ${idx + 1}:1`;

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
    // 1. Fetch the questions WITHOUT the join
    const { data: questions, error: qError } = await supabase
      .from('quiz_questions')
      .select('id, quiz_id, question, options, correct_answer, verse_reference')
      .limit(count);

    if (qError) {
      console.error('⚠️ Failed to fetch global questions:', qError);
      return null;
    }
    if (!questions || questions.length === 0) {
      console.warn('⚠️ No questions found in DB for global challenge.');
      return null;
    }

    // 2. Fetch the quizzes to map book names
    const quizIds = [...new Set(questions.map((q) => q.quiz_id))];
    const { data: quizzes, error: quizError } = await supabase
      .from('quizzes')
      .select('id, book_name')
      .in('id', quizIds);

    if (quizError) {
      console.warn('⚠️ Failed to fetch quizzes for mapping:', quizError);
    }

    const quizMap = {};
    (quizzes || []).forEach((qz) => {
      quizMap[qz.id] = qz.book_name;
    });

    return questions.map((q, idx) => {
      const bookName = quizMap[q.quiz_id] || 'Bible';
      const verseRef =
        q.verse_reference && String(q.verse_reference).trim()
          ? String(q.verse_reference).trim()
          : `${bookName} ${idx + 1}:1`;

      return {
        id: q.id || idx,
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

// ─── Pick the most accurate verse reference we can ────────────────
export function pickVerseRef(questionText, dbRef, fallback) {
  const text = String(questionText || '');
  const parens = text.match(/\(([^)]+)\)/g) || [];
  for (const p of parens) {
    const inner = p.slice(1, -1).trim();
    if (/\b\d+\s*:\s*\d+\b/.test(inner)) return inner;
  }

  const db = String(dbRef || '').trim();
  if (/\b\d+\s*:\s*\d+\b/.test(db)) return db;
  if (/^.+?\s+\d+$/.test(db)) return `${db}:1`;

  return db || fallback;
}
