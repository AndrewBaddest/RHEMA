import { useState, useEffect } from 'react';

export default function AdminLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = () => {
    const stored = localStorage.getItem('rhema_global_leaderboard');
    if (stored) {
      try {
        setLeaderboard(JSON.parse(stored));
      } catch (e) {}
    }
  };

  const saveLeaderboard = (data) => {
    setLeaderboard(data);
    localStorage.setItem('rhema_global_leaderboard', JSON.stringify(data));
  };

  const resetLeaderboard = () => {
    if (!confirm('Reset the entire global leaderboard?')) return;
    saveLeaderboard([]);
  };

  const deleteEntry = (index) => {
    const newData = [...leaderboard];
    newData.splice(index, 1);
    saveLeaderboard(newData);
  };

  const addEntry = () => {
    const name = prompt('Enter name:');
    if (!name) return;
    const score = parseInt(prompt('Enter score (percentage):'));
    if (isNaN(score)) return;
    const correct = parseInt(prompt('Enter correct answers:'));
    if (isNaN(correct)) return;
    const total = parseInt(prompt('Enter total questions:'));
    if (isNaN(total)) return;
    const newEntry = {
      name,
      score,
      correct,
      total,
      date: new Date().toISOString(),
    };
    saveLeaderboard([...leaderboard, newEntry]);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="text-primary text-2xl font-bold">🏆 Leaderboard Management</h2>
        <div className="flex gap-3">
          <button className="btn !w-auto px-4 py-2 text-sm" onClick={addEntry}>+ Add Entry</button>
          <button className="btn-danger !w-auto px-4 py-2 text-sm" onClick={resetLeaderboard}>🔄 Reset</button>
        </div>
      </div>

      <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a] overflow-x-auto">
        {leaderboard.length === 0 ? (
          <p className="text-muted text-center py-8">No leaderboard data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left py-2 text-muted">Rank</th>
                <th className="text-left py-2 text-muted">Name</th>
                <th className="text-center py-2 text-muted">Score</th>
                <th className="text-center py-2 text-muted">Correct/Total</th>
                <th className="text-center py-2 text-muted">Date</th>
                <th className="text-center py-2 text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map((entry, idx) => (
                  <tr key={idx} className="border-b border-[#1a1a1a]">
                    <td className="py-2 font-bold text-primary">#{idx + 1}</td>
                    <td className="py-2">{entry.name}</td>
                    <td className="py-2 text-center">{entry.score}%</td>
                    <td className="py-2 text-center">{entry.correct}/{entry.total}</td>
                    <td className="py-2 text-center text-muted text-xs">{entry.date ? new Date(entry.date).toLocaleDateString() : ''}</td>
                    <td className="py-2 text-center">
                      <button className="text-error hover:text-error/80 text-xs underline" onClick={() => deleteEntry(idx)}>Delete</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}