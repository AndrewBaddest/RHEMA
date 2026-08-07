const API_BASE = ''; // relative to domain

// Cache for all quiz questions
let cachedAllQuestions = null;

export async function fetchBibleData(book) {
  const safeName = encodeURIComponent(book);
  const response = await fetch(`${API_BASE}/Bible-niv/${safeName}.json`);
  if (!response.ok) throw new Error('Book not found');
  return response.json();
}

export async function fetchQuizData(book) {
  const safeName = encodeURIComponent(book);
  const url = `${API_BASE}/quiz_data/${safeName}.json`;
  const response = await fetch(url);
  if (!response.ok) {
    // Return null instead of throwing
    return null;
  }
  return response.json();
}

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
      // skip any other errors
    }
  }
  cachedAllQuestions = allQuestions;
  return allQuestions;
}