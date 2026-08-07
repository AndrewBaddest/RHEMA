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

// Reverse abbreviation map
const ABBREV_MAP = {
  "Gen": "Genesis", "Exo": "Exodus", "Lev": "Leviticus", "Num": "Numbers", "Deu": "Deuteronomy",
  "Jos": "Joshua", "Jdg": "Judges", "Rut": "Ruth", "1Sa": "1 Samuel", "2Sa": "2 Samuel",
  "1Ki": "1 Kings", "2Ki": "2 Kings", "1Ch": "1 Chronicles", "2Ch": "2 Chronicles",
  "Ezr": "Ezra", "Neh": "Nehemiah", "Est": "Esther", "Job": "Job", "Psa": "Psalms",
  "Pro": "Proverbs", "Ecc": "Ecclesiastes", "Son": "Song of Solomon", "Isa": "Isaiah",
  "Jer": "Jeremiah", "Lam": "Lamentations", "Eze": "Ezekiel", "Dan": "Daniel",
  "Hos": "Hosea", "Joe": "Joel", "Amo": "Amos", "Oba": "Obadiah", "Jon": "Jonah",
  "Mic": "Micah", "Nah": "Nahum", "Hab": "Habakkuk", "Zep": "Zephaniah", "Hag": "Haggai",
  "Zec": "Zechariah", "Mal": "Malachi", "Mat": "Matthew", "Mar": "Mark", "Luk": "Luke",
  "Jhn": "John", "Act": "Acts", "Rom": "Romans", "1Co": "1 Corinthians", "2Co": "2 Corinthians",
  "Gal": "Galatians", "Eph": "Ephesians", "Phi": "Philippians", "Col": "Colossians",
  "1Th": "1 Thessalonians", "2Th": "2 Thessalonians", "1Ti": "1 Timothy", "2Ti": "2 Timothy",
  "Tit": "Titus", "Phm": "Philemon", "Heb": "Hebrews", "Jam": "James", "1Pe": "1 Peter",
  "2Pe": "2 Peter", "1Jo": "1 John", "2Jo": "2 John", "3Jo": "3 John", "Jud": "Jude",
  "Rev": "Revelation"
};

export function getFullName(name) {
  const trimmed = name.trim();
  if (ALL_BOOKS.includes(trimmed)) return trimmed;
  if (ABBREV_MAP[trimmed]) return ABBREV_MAP[trimmed];
  const found = ALL_BOOKS.find(b => b.toLowerCase() === trimmed.toLowerCase());
  return found || null;
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
    storedCode = Math.floor(1000 + Math.random() * 9000).toString();
    localStorage.setItem('rhema_device_code', storedCode);
  }
  return storedCode;
}