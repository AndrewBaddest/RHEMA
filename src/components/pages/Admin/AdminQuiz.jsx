import { useState, useEffect } from 'react';

export default function AdminQuiz() {
  const [questions, setQuestions] = useState([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    const stored = localStorage.getItem('rhema_quiz_admin');
    if (stored) {
      try {
        setQuestions(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  const saveQuestions = (newQuestions) => {
    setQuestions(newQuestions);
    localStorage.setItem('rhema_quiz_admin', JSON.stringify(newQuestions));
  };

  const addQuestion = () => {
    const newQ = {
      book: 'Genesis',
      question: 'New question?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: 0,
      ref: 'Gen 1:1',
    };
    saveQuestions([...questions, newQ]);
  };

  const deleteQuestion = (index) => {
    if (!confirm('Delete this question?')) return;
    const newQuestions = [...questions];
    newQuestions.splice(index, 1);
    saveQuestions(newQuestions);
  };

  const startEdit = (index) => {
    setEditing(index);
    setEditData({ ...questions[index] });
  };

  const saveEdit = (index) => {
    const newQuestions = [...questions];
    newQuestions[index] = editData;
    saveQuestions(newQuestions);
    setEditing(null);
  };

  const exportJSON = () => {
    const dataStr = JSON.stringify(questions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz_data.json';
    a.click();
  };

  const importJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) throw new Error('Not an array');
        setQuestions(data);
        localStorage.setItem('rhema_quiz_admin', JSON.stringify(data));
        alert('✅ Quiz data imported');
      } catch (err) {
        alert('❌ Invalid quiz JSON');
      }
    };
    reader.readAsText(file);
  };

  const filteredQuestions = questions.filter(q =>
    q.book?.toLowerCase().includes(filter.toLowerCase()) ||
    q.question?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="text-primary text-2xl font-bold">📝 Quiz Management</h2>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search questions..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="p-2 rounded-lg border border-[#333] bg-surface-light text-text focus:outline-none focus:border-primary w-48"
          />
          <button className="btn !w-auto px-4 py-2 text-sm" onClick={addQuestion}>+ Add Question</button>
          <button className="btn-secondary !w-auto px-4 py-2 text-sm" onClick={exportJSON}>📤 Export</button>
          <label className="btn-secondary !w-auto px-4 py-2 text-sm cursor-pointer">
            📥 Import
            <input type="file" accept=".json" className="hidden" onChange={importJSON} />
          </label>
        </div>
      </div>

      <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a] max-h-[600px] overflow-y-auto">
        {filteredQuestions.length === 0 ? (
          <p className="text-muted text-center py-8">No questions found.</p>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((q, idx) => {
              const originalIndex = questions.indexOf(q);
              return (
                <div key={idx} className="p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                  {editing === originalIndex ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editData.book || ''}
                        onChange={(e) => setEditData({...editData, book: e.target.value})}
                        placeholder="Book"
                        className="w-full p-2 rounded-lg border border-[#333] bg-surface text-text"
                      />
                      <input
                        type="text"
                        value={editData.ref || ''}
                        onChange={(e) => setEditData({...editData, ref: e.target.value})}
                        placeholder="Reference (e.g., Gen 1:1)"
                        className="w-full p-2 rounded-lg border border-[#333] bg-surface text-text"
                      />
                      <textarea
                        value={editData.question || ''}
                        onChange={(e) => setEditData({...editData, question: e.target.value})}
                        placeholder="Question"
                        className="w-full p-2 rounded-lg border border-[#333] bg-surface text-text"
                        rows={2}
                      />
                      {[0,1,2,3].map((i) => (
                        <input
                          key={i}
                          type="text"
                          value={editData.options?.[i] || ''}
                          onChange={(e) => {
                            const newOpts = [...(editData.options || ['','','',''])];
                            newOpts[i] = e.target.value;
                            setEditData({...editData, options: newOpts});
                          }}
                          placeholder={`Option ${String.fromCharCode(65+i)}`}
                          className="w-full p-2 rounded-lg border border-[#333] bg-surface text-text"
                        />
                      ))}
                      <select
                        value={editData.answer || 0}
                        onChange={(e) => setEditData({...editData, answer: parseInt(e.target.value)})}
                        className="w-full p-2 rounded-lg border border-[#333] bg-surface text-text"
                      >
                        <option value="0">A</option>
                        <option value="1">B</option>
                        <option value="2">C</option>
                        <option value="3">D</option>
                      </select>
                      <div className="flex gap-2">
                        <button className="btn !w-auto px-3 py-1 text-sm" onClick={() => saveEdit(originalIndex)}>Save</button>
                        <button className="btn-secondary !w-auto px-3 py-1 text-sm" onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-primary font-semibold">{q.book}</span>
                          <span className="text-muted text-sm ml-2">({q.ref})</span>
                          <p className="text-text mt-1">{q.question}</p>
                          <div className="flex gap-3 mt-1 text-sm text-muted">
                            <span>A. {q.options?.[0]}</span>
                            <span>B. {q.options?.[1]}</span>
                            <span>C. {q.options?.[2]}</span>
                            <span>D. {q.options?.[3]}</span>
                          </div>
                          <span className="text-xs text-primary">Answer: {['A','B','C','D'][q.answer]}</span>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button className="text-primary hover:text-primary/80 text-xs underline" onClick={() => startEdit(originalIndex)}>Edit</button>
                          <button className="text-error hover:text-error/80 text-xs underline" onClick={() => deleteQuestion(originalIndex)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}