import { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { ALL_BOOKS } from '../../../lib/utils';

export default function AdminBible() {
  const [bibleData, setBibleData] = useState({});
  const [selectedBook, setSelectedBook] = useState(ALL_BOOKS[0] || 'Genesis');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verses, setVerses] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState('');
  const [editVerseIndex, setEditVerseIndex] = useState(null);

  const updateScripture = useStore((state) => state.updateScripture);

  useEffect(() => {
    // Load Bible data from localStorage or fallback
    const adminBible = localStorage.getItem('rhema_bible_admin');
    if (adminBible) {
      try {
        const data = JSON.parse(adminBible);
        setBibleData(data);
        loadChapter(data, selectedBook, selectedChapter);
        return;
      } catch (e) {}
    }
    // Fallback: try to load from Bible-niv? For now, use empty.
    setBibleData({});
    setVerses([]);
  }, []);

  const loadChapter = (data, book, chapter) => {
    if (data[book] && data[book][chapter]) {
      setVerses(data[book][chapter]);
    } else {
      setVerses([]);
    }
  };

  const handleBookChange = (e) => {
    const book = e.target.value;
    setSelectedBook(book);
    setSelectedChapter(1);
    loadChapter(bibleData, book, 1);
    setEditMode(false);
  };

  const handleChapterChange = (e) => {
    const ch = parseInt(e.target.value);
    setSelectedChapter(ch);
    loadChapter(bibleData, selectedBook, ch);
    setEditMode(false);
  };

  const saveVerse = (index) => {
    if (!bibleData[selectedBook]) bibleData[selectedBook] = {};
    if (!bibleData[selectedBook][selectedChapter]) bibleData[selectedBook][selectedChapter] = [];
    bibleData[selectedBook][selectedChapter][index] = editText;
    setVerses([...bibleData[selectedBook][selectedChapter]]);
    localStorage.setItem('rhema_bible_admin', JSON.stringify(bibleData));
    setEditMode(false);
    setEditVerseIndex(null);
    alert('✅ Verse updated');
  };

  const addVerse = () => {
    if (!bibleData[selectedBook]) bibleData[selectedBook] = {};
    if (!bibleData[selectedBook][selectedChapter]) bibleData[selectedBook][selectedChapter] = [];
    bibleData[selectedBook][selectedChapter].push('New verse text');
    setVerses([...bibleData[selectedBook][selectedChapter]]);
    localStorage.setItem('rhema_bible_admin', JSON.stringify(bibleData));
  };

  const deleteVerse = (index) => {
    if (!confirm('Delete this verse?')) return;
    bibleData[selectedBook][selectedChapter].splice(index, 1);
    setVerses([...bibleData[selectedBook][selectedChapter]]);
    localStorage.setItem('rhema_bible_admin', JSON.stringify(bibleData));
  };

  const exportJSON = () => {
    const dataStr = JSON.stringify(bibleData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bible_data.json';
    a.click();
  };

  const importJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        setBibleData(data);
        localStorage.setItem('rhema_bible_admin', JSON.stringify(data));
        loadChapter(data, selectedBook, selectedChapter);
        alert('✅ Bible data imported');
      } catch (err) {
        alert('❌ Invalid JSON');
      }
    };
    reader.readAsText(file);
  };

  const chapters = bibleData[selectedBook] ? Object.keys(bibleData[selectedBook]).map(Number).sort((a,b) => a-b) : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-primary text-2xl font-bold">📖 Bible Management</h2>
        <div className="flex gap-3">
          <button className="btn-secondary !w-auto px-4 py-2 text-sm" onClick={exportJSON}>📤 Export</button>
          <label className="btn-secondary !w-auto px-4 py-2 text-sm cursor-pointer">
            📥 Import
            <input type="file" accept=".json" className="hidden" onChange={importJSON} />
          </label>
        </div>
      </div>

      <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a] mb-4">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-muted block mb-1">Book</label>
            <select
              value={selectedBook}
              onChange={handleBookChange}
              className="w-full p-2 rounded-lg border border-[#333] bg-surface-light text-text focus:outline-none focus:border-primary"
            >
              {ALL_BOOKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="text-sm text-muted block mb-1">Chapter</label>
            <select
              value={selectedChapter}
              onChange={handleChapterChange}
              className="w-full p-2 rounded-lg border border-[#333] bg-surface-light text-text focus:outline-none focus:border-primary"
              disabled={chapters.length === 0}
            >
              {chapters.map((ch) => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn !w-auto px-4 py-2 text-sm" onClick={addVerse}>+ Add Verse</button>
          </div>
        </div>

        {verses.length === 0 ? (
          <p className="text-muted text-center py-8">No verses found for this chapter.</p>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {verses.map((verse, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] hover:border-primary/30 transition-colors">
                <span className="text-primary font-semibold min-w-[30px]">{idx + 1}.</span>
                {editMode && editVerseIndex === idx ? (
                  <div className="flex-1">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-2 rounded-lg border border-[#333] bg-surface text-text"
                      rows={2}
                    />
                    <div className="flex gap-2 mt-2">
                      <button className="btn !w-auto px-3 py-1 text-sm" onClick={() => saveVerse(idx)}>Save</button>
                      <button className="btn-secondary !w-auto px-3 py-1 text-sm" onClick={() => { setEditMode(false); setEditVerseIndex(null); }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{verse}</span>
                    <button
                      className="text-primary hover:text-primary/80 text-xs underline"
                      onClick={() => { setEditText(verse); setEditMode(true); setEditVerseIndex(idx); }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-error hover:text-error/80 text-xs underline"
                      onClick={() => deleteVerse(idx)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}