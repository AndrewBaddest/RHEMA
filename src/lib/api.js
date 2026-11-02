// src/lib/api.js
import { supabase } from './supabase';
import { shuffle } from './utils';

const API_BASE = '';

// ─── Static JSON (fallback) ──────────────────────────────────────
export async function fetchBibleData(book) {
  const safeName = encodeURIComponent(book);
  const response = await fetch(`${API_BASE}/Bible-niv/${safeName}.json`);
  if (!response.ok) throw new Error('Book not found');
  return response.json();
}

// ─── Fetch quiz questions from Supabase (Randomized) ─────────────
export async function fetchQuizQuestionsFromDB(bookName, limit = 10) {
  try {
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id')
      .eq('book_name', bookName)
      .single();

    if (quizError || !quiz) return null;

    const { data: questions, error: qError } = await supabase
      .rpc('get_random_quiz_questions', {
        quiz_id_param: quiz.id,
        limit_param: limit
      });

    if (qError) return null;

    return questions.map((q, idx) => {
      const verseRef = q.verse_reference?.trim() || `${bookName} ${idx + 1}:1`;
      return {
        ref: verseRef,
        question: q.question,
        options: q.options,
        answer: q.correct_answer,
        reference: verseRef,
      };
    });
  } catch (err) {
    return null;
  }
}

// ─── Fetch global challenge questions (Random from all books) ──
export async function fetchGlobalChallengeQuestionsFromDB(count = 30) {
  try {
    const { data: questions, error: qError } = await supabase
      .rpc('get_random_global_questions', { limit_param: count });

    if (qError || !questions || questions.length === 0) return null;

    const quizIds = [...new Set(questions.map((q) => q.quiz_id))];
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, book_name')
      .in('id', quizIds);

    const quizMap = {};
    (quizzes || []).forEach((qz) => { quizMap[qz.id] = qz.book_name; });

    return questions.map((q, idx) => {
      const bookName = quizMap[q.quiz_id] || 'Bible';
      const verseRef = q.verse_reference?.trim() || `${bookName} ${idx + 1}:1`;
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
    return null;
  }
}

// ─── Fetch the Autonomous Daily Quiz ─────────────────────────────
export async function fetchDailyChallengeQuestions() {
  try {
    await supabase.rpc('generate_daily_challenge');

    const { data: challenge, error: cError } = await supabase
      .from('daily_challenges')
      .select('question_ids')
      .eq('challenge_date', new Date().toISOString().split('T')[0])
      .single();

    if (cError || !challenge) return null;

    const { data: questions, error: qError } = await supabase
      .from('quiz_questions')
      .select('id, quiz_id, question, options, correct_answer, verse_reference, quizzes(book_name)')
      .in('id', challenge.question_ids);

    if (qError) throw qError;

    const orderedQuestions = challenge.question_ids.map(id => 
      questions.find(q => q.id === id)
    ).filter(Boolean);

    const shuffledQuestions = shuffle(orderedQuestions);

    return shuffledQuestions.map((q, idx) => {
      const bookName = q.quizzes?.book_name || 'Bible';
      const verseRef = q.verse_reference?.trim() || `${bookName} ${idx + 1}:1`;
      return {
        id: q.id,
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
    return null;
  }
}

// ─── Fetch the current Global Event (Self-Healing Engine) ────────
export async function fetchGlobalEvent() {
  try {
    // 👇 Call the new RPC that auto-generates a waiting event if none exists
    const { data, error } = await supabase.rpc('get_or_create_global_event');

    if (error) {
      console.error('❌ Error fetching global event:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('❌ Error fetching global event:', err);
    return null;
  }
}

// ─── Legacy JSON functions ──────────────────────────────────────
export async function fetchQuizData(book) {
  const safeName = encodeURIComponent(book);
  const response = await fetch(`${API_BASE}/quiz_data/${safeName}.json`);
  if (!response.ok) return null;
  return response.json();
}

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