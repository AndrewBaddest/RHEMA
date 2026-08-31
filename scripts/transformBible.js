const fs = require('fs');
const path = require('path');

const BIBLE_DIR = path.join(__dirname, '../public/Bible-niv');
const OUTPUT_FILE = path.join(__dirname, '../bible-seed.json');

const files = fs.readdirSync(BIBLE_DIR).filter(f => 
  f.endsWith('.json') && f !== 'Books.json'
);

const abbrevMap = {
  'Genesis': 'Gen', 'Exodus': 'Exo', 'Leviticus': 'Lev', 'Numbers': 'Num',
  'Deuteronomy': 'Deu', 'Joshua': 'Jos', 'Judges': 'Jdg', 'Ruth': 'Rut',
  '1 Samuel': '1Sa', '2 Samuel': '2Sa', '1 Kings': '1Ki', '2 Kings': '2Ki',
  '1 Chronicles': '1Ch', '2 Chronicles': '2Ch', 'Ezra': 'Ezr', 'Nehemiah': 'Neh',
  'Esther': 'Est', 'Job': 'Job', 'Psalms': 'Psa', 'Proverbs': 'Pro',
  'Ecclesiastes': 'Ecc', 'Song of Solomon': 'Son', 'Isaiah': 'Isa', 'Jeremiah': 'Jer',
  'Lamentations': 'Lam', 'Ezekiel': 'Eze', 'Daniel': 'Dan', 'Hosea': 'Hos',
  'Joel': 'Joe', 'Amos': 'Amo', 'Obadiah': 'Oba', 'Jonah': 'Jon',
  'Micah': 'Mic', 'Nahum': 'Nah', 'Habakkuk': 'Hab', 'Zephaniah': 'Zep',
  'Haggai': 'Hag', 'Zechariah': 'Zec', 'Malachi': 'Mal',
  'Matthew': 'Mat', 'Mark': 'Mar', 'Luke': 'Luk', 'John': 'Jhn',
  'Acts': 'Act', 'Romans': 'Rom', '1 Corinthians': '1Co', '2 Corinthians': '2Co',
  'Galatians': 'Gal', 'Ephesians': 'Eph', 'Philippians': 'Php', 'Colossians': 'Col',
  '1 Thessalonians': '1Th', '2 Thessalonians': '2Th', '1 Timothy': '1Ti',
  '2 Timothy': '2Ti', 'Titus': 'Tit', 'Philemon': 'Phm', 'Hebrews': 'Heb',
  'James': 'Jam', '1 Peter': '1Pe', '2 Peter': '2Pe', '1 John': '1Jn',
  '2 John': '2Jn', '3 John': '3Jn', 'Jude': 'Jud', 'Revelation': 'Rev'
};

const oldTestament = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi'];

const output = [];

for (const file of files) {
  const bookName = path.basename(file, '.json');
  const data = JSON.parse(fs.readFileSync(path.join(BIBLE_DIR, file), 'utf8'));
  
  // Use the book name from the JSON, but fallback to filename
  const name = data.book || bookName;
  const testament = oldTestament.includes(name) ? 'OT' : 'NT';
  const abbrev = abbrevMap[name] || name.slice(0, 3).toUpperCase();

  // Extract chapters and verses
  const chapters = data.chapters.map(ch => ({
    number: parseInt(ch.chapter),
    verses: ch.verses.map(v => ({
      number: parseInt(v.verse),
      text: v.text
    }))
  }));

  output.push({ name, testament, abbrev, chapters });
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
console.log(`✅ Transformed ${files.length} books. Output: ${OUTPUT_FILE}`);
