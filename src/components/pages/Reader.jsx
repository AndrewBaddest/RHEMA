import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { fetchBibleData } from '../../lib/api';
import { ALL_BOOKS } from '../../lib/utils';

export default function Reader() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};
  const initialBook = state.book || ALL_BOOKS[0];
  const initialChapter = state.chapter || 1;
  const initialVerse = state.verse || null;

  const [book, setBook] = useState(initialBook);
  const [chapter, setChapter] = useState(initialChapter);
  const [verses, setVerses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightVerse, setHighlightVerse] = useState(initialVerse);

  const updateScripture = useStore((s) => s.updateScripture);
  const contentRef = useRef(null);

  // Scroll to top when chapter changes
  useEffect(() => {
    if (!isLoading && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [chapter, isLoading]);

  useEffect(() => {
    const loadChapter = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const rawData = await fetchBibleData(book);
        console.log('📖 Loaded Bible data for', book, rawData);

        let chapterMap = {};
        let chapterList = [];

        // Detect data structure
        if (Array.isArray(rawData)) {
          rawData.forEach((item) => {
            if (item.chapter && Array.isArray(item.verses)) {
              const ch = Number(item.chapter);
              chapterMap[ch] = item.verses.map((v) => {
                return typeof v === 'string' ? v : (v.text || v.verse || String(v));
              });
            }
          });
          chapterList = Object.keys(chapterMap).map(Number).sort((a, b) => a - b);
        } else if (typeof rawData === 'object' && rawData !== null) {
          if (rawData.chapters && Array.isArray(rawData.chapters)) {
            rawData.chapters.forEach((item) => {
              const ch = Number(item.chapter);
              if (Array.isArray(item.verses)) {
                chapterMap[ch] = item.verses.map((v) => {
                  return typeof v === 'string' ? v : (v.text || v.verse || String(v));
                });
              }
            });
            chapterList = Object.keys(chapterMap).map(Number).sort((a, b) => a - b);
          } else {
            const keys = Object.keys(rawData);
            const isChapterMap = keys.some(k => !isNaN(Number(k)) && Array.isArray(rawData[k]));
            if (isChapterMap) {
              chapterMap = rawData;
              chapterList = keys.map(Number).sort((a, b) => a - b);
            } else {
              throw new Error('Unknown Bible data format');
            }
          }
        }

        setChapters(chapterList);

        let targetChapter = chapter;
        if (!chapterMap[targetChapter]) {
          targetChapter = chapterList[0] || 1;
          setChapter(targetChapter);
        }

        const verseList = chapterMap[targetChapter] || [];
        setVerses(verseList);

        if (verseList.length > 0) {
          updateScripture(book, targetChapter, verseList.length);
        }

        if (initialVerse) {
          setHighlightVerse(initialVerse);
          setTimeout(() => {
            const el = document.querySelector(`[data-verse="${initialVerse}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 200);
        }
      } catch (err) {
        console.error('❌ Failed to load Bible data:', err);
        setError(err.message);
        setVerses([]);
        setChapters([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadChapter();
  }, [book, chapter, initialVerse]);

  const handleBookChange = (e) => {
    const newBook = e.target.value;
    setBook(newBook);
    setChapter(1);
    setHighlightVerse(null);
  };

  const handleChapterChange = (e) => {
    setChapter(Number(e.target.value));
    setHighlightVerse(null);
  };

  const goToPrevChapter = () => {
    const idx = chapters.indexOf(chapter);
    if (idx > 0) {
      setChapter(chapters[idx - 1]);
      setHighlightVerse(null);
    }
  };

  const goToNextChapter = () => {
    const idx = chapters.indexOf(chapter);
    if (idx < chapters.length - 1) {
      setChapter(chapters[idx + 1]);
      setHighlightVerse(null);
    }
  };

  const goBack = () => navigate(-1);

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-error">⚠️ {error}</p>
        <button className="btn mt-4" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <h2 className="text-primary text-2xl font-bold">Bible Reader</h2>
        <button className="btn-secondary !w-auto !py-2 !px-4 text-sm" onClick={goBack}>
          ← Back
        </button>
      </div>

      <div className="reader-controls flex gap-2.5 flex-wrap mb-4">
        <select
          value={book}
          onChange={handleBookChange}
          className="flex-1 min-w-[100px] p-2.5 rounded-lg border border-[#333] bg-surface text-text text-base"
        >
          {ALL_BOOKS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select
          value={chapter}
          onChange={handleChapterChange}
          className="flex-1 min-w-[100px] p-2.5 rounded-lg border border-[#333] bg-surface text-text text-base"
          disabled={chapters.length === 0}
        >
          {chapters.map((ch) => (
            <option key={ch} value={ch}>Chapter {ch}</option>
          ))}
        </select>
      </div>

      <div
        ref={contentRef}
        className="reader-verse-box bg-surface rounded-xl p-5 min-h-[300px] border border-[#2a2a2a]"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="spinner"></div>
            <p className="text-muted ml-4">Loading...</p>
          </div>
        ) : verses.length === 0 ? (
          <p className="text-muted text-center py-10">No verses found for {book} {chapter}.</p>
        ) : (
          <>
            <h3 className="text-primary text-xl font-bold mb-3">{book} {chapter}</h3>
            {verses.map((text, idx) => {
              const v = idx + 1;
              const isHighlight = highlightVerse === v;
              return (
                <div
                  key={v}
                  data-verse={v}
                  className={`verse-line mb-1.5 leading-relaxed py-0.5 ${isHighlight ? 'bg-[#2a2205] rounded px-1.5' : ''}`}
                >
                  <span className="text-primary font-semibold mr-1.5">{v}.</span>
                  {text}
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="reader-actions flex gap-2.5 mt-4 flex-wrap">
        <button
          className="btn-secondary flex-1 min-w-[100px]"
          onClick={goToPrevChapter}
          disabled={chapters.indexOf(chapter) <= 0}
        >
          ◀ Prev
        </button>
        <button
          className="btn-secondary flex-1 min-w-[100px]"
          onClick={goToNextChapter}
          disabled={chapters.indexOf(chapter) >= chapters.length - 1}
        >
          Next ▶
        </button>
      </div>
    </div>
  );
}