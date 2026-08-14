export const BOOKS_OT = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
  "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
  "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
  "Zephaniah", "Haggai", "Zechariah", "Malachi"
];

export const BOOKS_NT = [
  "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
  "1 Timothy", "2 Timothy", "Titus", "Philemon",
  "Hebrews", "James", "1 Peter", "2 Peter",
  "1 John", "2 John", "3 John", "Jude", "Revelation"
];

export const ALL_BOOKS = [...BOOKS_OT, ...BOOKS_NT];

// ─── Expanded abbreviation mapping ──────────────────────────────
export const BOOK_ABBREVIATIONS = {
  // Old Testament
  "Genesis": "Gen",
  "Exodus": "Exo",
  "Leviticus": "Lev",
  "Numbers": "Num",
  "Deuteronomy": "Deu",
  "Joshua": "Jos",
  "Judges": "Jdg",
  "Ruth": "Rut",
  "1 Samuel": "1Sa",
  "2 Samuel": "2Sa",
  "1 Kings": "1Ki",
  "2 Kings": "2Ki",
  "1 Chronicles": "1Ch",
  "2 Chronicles": "2Ch",
  "Ezra": "Ezr",
  "Nehemiah": "Neh",
  "Esther": "Est",
  "Job": "Job",
  "Psalms": "Psa",
  "Proverbs": "Pro",
  "Ecclesiastes": "Ecc",
  "Song of Solomon": "Son",
  "Isaiah": "Isa",
  "Jeremiah": "Jer",
  "Lamentations": "Lam",
  "Ezekiel": "Eze",
  "Daniel": "Dan",
  "Hosea": "Hos",
  "Joel": "Joe",
  "Amos": "Amo",
  "Obadiah": "Oba",
  "Jonah": "Jon",
  "Micah": "Mic",
  "Nahum": "Nah",
  "Habakkuk": "Hab",
  "Zephaniah": "Zep",
  "Haggai": "Hag",
  "Zechariah": "Zec",
  "Malachi": "Mal",
  // New Testament
  "Matthew": "Mat",
  "Mark": "Mar",
  "Luke": "Luk",
  "John": "Jhn",
  "Acts": "Act",
  "Romans": "Rom",
  "1 Corinthians": "1Co",
  "2 Corinthians": "2Co",
  "Galatians": "Gal",
  "Ephesians": "Eph",
  "Philippians": "Phi",
  "Colossians": "Col",
  "1 Thessalonians": "1Th",
  "2 Thessalonians": "2Th",
  "1 Timothy": "1Ti",
  "2 Timothy": "2Ti",
  "Titus": "Tit",
  "Philemon": "Phm",
  "Hebrews": "Heb",
  "James": "Jam",
  "1 Peter": "1Pe",
  "2 Peter": "2Pe",
  "1 John": "1Jo",
  "2 John": "2Jo",
  "3 John": "3Jo",
  "Jude": "Jud",
  "Revelation": "Rev",
};

// ─── Add common alternative abbreviations (not in official list) ──
const EXTRA_ABBREVIATIONS = {
  "Deut": "Deuteronomy",   // "Duet" is a misspelling, but we'll add it
  "Duet": "Deuteronomy",   // common typo
  "Gen": "Genesis",
  "Ex": "Exodus",
  "Lev": "Leviticus",
  "Num": "Numbers",
  "Josh": "Joshua",
  "Judg": "Judges",
  "Ruth": "Ruth",
  "1Sam": "1 Samuel",
  "2Sam": "2 Samuel",
  "1Kings": "1 Kings",
  "2Kings": "2 Kings",
  "1Chron": "1 Chronicles",
  "2Chron": "2 Chronicles",
  "Ezra": "Ezra",
  "Neh": "Nehemiah",
  "Est": "Esther",
  "Job": "Job",
  "Ps": "Psalms",
  "Psa": "Psalms",
  "Prov": "Proverbs",
  "Eccl": "Ecclesiastes",
  "Song": "Song of Solomon",
  "Isa": "Isaiah",
  "Jer": "Jeremiah",
  "Lam": "Lamentations",
  "Ezek": "Ezekiel",
  "Dan": "Daniel",
  "Hos": "Hosea",
  "Joel": "Joel",
  "Amos": "Amos",
  "Obad": "Obadiah",
  "Jonah": "Jonah",
  "Mic": "Micah",
  "Nah": "Nahum",
  "Hab": "Habakkuk",
  "Zeph": "Zephaniah",
  "Hag": "Haggai",
  "Zech": "Zechariah",
  "Mal": "Malachi",
  "Matt": "Matthew",
  "Mk": "Mark",          // common
  "Lk": "Luke",          // common
  "Jn": "John",
  "Acts": "Acts",
  "Rom": "Romans",
  "1Cor": "1 Corinthians",
  "2Cor": "2 Corinthians",
  "Gal": "Galatians",
  "Eph": "Ephesians",
  "Phil": "Philippians",
  "Col": "Colossians",
  "1Thess": "1 Thessalonians",
  "2Thess": "2 Thessalonians",
  "1Tim": "1 Timothy",
  "2Tim": "2 Timothy",
  "Titus": "Titus",
  "Philem": "Philemon",
  "Heb": "Hebrews",
  "James": "James",
  "1Pet": "1 Peter",
  "2Pet": "2 Peter",
  "1Jn": "1 John",
  "2Jn": "2 John",
  "3Jn": "3 John",
  "Jude": "Jude",
  "Rev": "Revelation",
  // Even more common ones
  "1Ki": "1 Kings",
  "2Ki": "2 Kings",
  "1Sa": "1 Samuel",
  "2Sa": "2 Samuel",
  "1Ch": "1 Chronicles",
  "2Ch": "2 Chronicles",
  "1Co": "1 Corinthians",
  "2Co": "2 Corinthians",
  "1Th": "1 Thessalonians",
  "2Th": "2 Thessalonians",
  "1Ti": "1 Timothy",
  "2Ti": "2 Timothy",
  "1Pe": "1 Peter",
  "2Pe": "2 Peter",
  "1Jo": "1 John",
  "2Jo": "2 John",
  "3Jo": "3 John",
  "Mat": "Matthew",
  "Mar": "Mark",
  "Luk": "Luke",
  "Jhn": "John",
  "Act": "Acts",
  "Rom": "Romans",
  "Phi": "Philippians",
  "Col": "Colossians",
  "Heb": "Hebrews",
  "Jam": "James",
  "Jud": "Jude",
  "Rev": "Revelation",
};

// Merge extra abbreviations into the reverse map
const REVERSE_ABBREV = {};
for (const [full, abbr] of Object.entries(BOOK_ABBREVIATIONS)) {
  REVERSE_ABBREV[abbr] = full;
}
// Add extra abbreviations (if not already present)
for (const [abbr, full] of Object.entries(EXTRA_ABBREVIATIONS)) {
  REVERSE_ABBREV[abbr] = full;
}

// ─── getFullName: robustly maps abbreviations to full names ──
export function getFullName(name) {
  const trimmed = name.trim();
  // If it's already a full name, return it
  if (ALL_BOOKS.includes(trimmed)) return trimmed;

  // Try the reverse map (case-insensitive)
  const lower = trimmed.toLowerCase();
  for (const [abbr, full] of Object.entries(REVERSE_ABBREV)) {
    if (abbr.toLowerCase() === lower) return full;
  }

  // Try case-insensitive full-name match
  const found = ALL_BOOKS.find(b => b.toLowerCase() === lower);
  if (found) return found;

  // Finally, try partial match (e.g., "Corinthians" -> "1 Corinthians")
  for (const book of ALL_BOOKS) {
    if (book.toLowerCase().includes(lower) || lower.includes(book.toLowerCase())) {
      return book;
    }
  }

  return null;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateDeviceCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function initDevice() {
  let storedCode = localStorage.getItem('rhema_device_code');
  if (!storedCode) {
    storedCode = generateDeviceCode();
    localStorage.setItem('rhema_device_code', storedCode);
  }
  return storedCode;
}

// ─── NEW: Clean book name (remove trailing punctuation) ──────────
export function cleanBookName(name) {
  return name.replace(/[.,;:!?]+$/, '').trim();
}