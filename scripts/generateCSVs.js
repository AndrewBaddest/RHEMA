const fs = require('fs');
const bibleData = JSON.parse(fs.readFileSync('./bible-seed.json', 'utf8'));

// --- Books CSV ---
const booksHeaders = 'name,testament,abbrev';
const booksRows = bibleData.map(b => `${b.name},${b.testament},${b.abbrev}`);
fs.writeFileSync('./books.csv', booksHeaders + '\n' + booksRows.join('\n'));

// --- Chapters CSV (book_name, chapter_number) ---
const chaptersHeaders = 'book_name,chapter_number';
const chaptersRows = [];
for (const book of bibleData) {
  for (const ch of book.chapters) {
    chaptersRows.push(`${book.name},${ch.number}`);
  }
}
fs.writeFileSync('./chapters.csv', chaptersHeaders + '\n' + chaptersRows.join('\n'));

// --- Verses CSV (book_name, chapter_number, verse_number, text) ---
const versesHeaders = 'book_name,chapter_number,verse_number,text';
const versesRows = [];
for (const book of bibleData) {
  for (const ch of book.chapters) {
    for (const v of ch.verses) {
      // Escape double quotes in text for CSV
      const escapedText = v.text.replace(/"/g, '""');
      versesRows.push(`${book.name},${ch.number},${v.number},"${escapedText}"`);
    }
  }
}
fs.writeFileSync('./verses.csv', versesHeaders + '\n' + versesRows.join('\n'));

console.log('✅ CSV files created: books.csv, chapters.csv, verses.csv');
console.log(`📊 Books: ${booksRows.length}, Chapters: ${chaptersRows.length}, Verses: ${versesRows.length}`);
