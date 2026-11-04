// src/lib/api.js
import { supabase } from './supabase';
import { shuffle } from './utils';

const API_BASE = '';

// ─── Bible data from Supabase (DB-based, multilingual) ──────────
const BOOK_NAME_ALIASES = {
  'Song of Solomon': ['Song of Solomon', 'Song Of Solomon'],
};

const bibleCache = new Map();

export async function fetchBibleData(book, language = 'en') {
  const cacheKey = `${book}::${language}`;
  if (bibleCache.has(cacheKey)) return bibleCache.get(cacheKey);

  const candidates = BOOK_NAME_ALIASES[book] || [book];
  let data = null;
  let lastError = null;

  for (const dbName of candidates) {
    // 👇 PAGINATE: fetch 1000 at a time until the whole book is loaded
    let allRows = [];
    const PAGE = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const to = from + PAGE - 1;
      const { data: rows, error } = await supabase
        .from('verses')
        .select(`
          number,
          text,
          chapters!inner (
            number,
            books!inner ( name )
          )
        `)
        .eq('chapters.books.name', dbName)
        .eq('language', language)
        .order('chapter_id')
        .order('number')
        .range(from, to);

      if (error) { lastError = error; break; }
      if (!rows || rows.length === 0) break;
      allRows = allRows.concat(rows);
      if (rows.length < PAGE) hasMore = false;
      else from += PAGE;
    }

    if (allRows.length > 0) { data = allRows; break; }
  }

  if (!data) {
    if (lastError) throw lastError;
    throw new Error(`No verses found for "${book}" in language "${language}"`);
  }

  const chapterMap = {};
  for (const v of data) {
    const ch = v.chapters.number;
    if (!chapterMap[ch]) chapterMap[ch] = [];
    chapterMap[ch].push(v.text);
  }

  const result = Object.entries(chapterMap)
    .map(([chapter, verses]) => ({ chapter: Number(chapter), verses }))
    .sort((a, b) => a.chapter - b.chapter);

  bibleCache.set(cacheKey, result);
  return result;
}

// ─── Fetch quiz questions from Supabase (Randomized & Multilingual) ──
export async function fetchQuizQuestionsFromDB(bookName, language = 'en', limit = 10) {
  try {
    // 1. Get the quiz ID
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id')
      .eq('book_name', bookName)
      .single();

    if (quizError || !quiz) return null;

    // 2. Fetch questions in the requested language
    let { data: questions, error: qError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .eq('language', language);

    if (qError) return null;

    // 3. Fallback: If Swahili questions don't exist yet, use English
    if ((!questions || questions.length === 0) && language !== 'en') {
      const fallback = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .eq('language', 'en');
      questions = fallback.data;
    }

    if (!questions || questions.length === 0) return null;

    // 4. Shuffle and slice
    const shuffled = shuffle(questions).slice(0, limit);

    return shuffled.map((q) => {
      const verseRef = pickVerseRef(q.question, q.verse_reference, `${bookName} 1:1`);
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
      const verseRef = pickVerseRef(q.question, q.verse_reference, `${bookName} 1:1`);
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
      const verseRef = pickVerseRef(q.question, q.verse_reference, `${bookName} 1:1`);
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
    const { data, error } = await supabase.rpc('get_or_create_global_event');
    if (error) return null;
    return data;
  } catch (err) {
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

// ─── Extract the best possible verse reference ───────────────────
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