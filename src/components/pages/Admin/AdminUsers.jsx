import { useState, useEffect } from 'react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    const keys = Object.keys(localStorage);
    const progressKeys = keys.filter(k => k.startsWith('rhema_progress_'));
    const userList = progressKeys.map(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        return {
          key,
          username: data.username || 'Unknown',
          playerId: data.playerId || key.replace('rhema_progress_', ''),
          quizzes: data.quizzes?.length || 0,
          booksRead: data.scripture?.booksRead?.length || 0,
          totalCorrect: (data.quizzes || []).reduce((acc, q) => acc + (q.score || 0), 0),
          totalQuestions: (data.quizzes || []).reduce((acc, q) => acc + (q.total || 0), 0),
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    setUsers(userList);
  };

  const deleteUser = (key) => {
    if (!confirm(`Delete user ${key}? This will remove all their progress.`)) return;
    localStorage.removeItem(key);
    loadUsers();
  };

  const clearAllUsers = () => {
    if (!confirm('Delete ALL user progress data? This cannot be undone.')) return;
    const keys = Object.keys(localStorage);
    const progressKeys = keys.filter(k => k.startsWith('rhema_progress_'));
    progressKeys.forEach(k => localStorage.removeItem(k));
    loadUsers();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="text-primary text-2xl font-bold">👥 User Management</h2>
        <button className="btn-danger !w-auto px-4 py-2 text-sm" onClick={clearAllUsers}>🗑️ Clear All Users</button>
      </div>

      <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a] overflow-x-auto">
        {users.length === 0 ? (
          <p className="text-muted text-center py-8">No users found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left py-2 text-muted">Username</th>
                <th className="text-left py-2 text-muted">Player ID</th>
                <th className="text-center py-2 text-muted">Quizzes</th>
                <th className="text-center py-2 text-muted">Books Read</th>
                <th className="text-center py-2 text-muted">Accuracy</th>
                <th className="text-center py-2 text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const accuracy = user.totalQuestions > 0 ? Math.round((user.totalCorrect / user.totalQuestions) * 100) : 0;
                return (
                  <tr key={user.key} className="border-b border-[#1a1a1a]">
                    <td className="py-2">{user.username}</td>
                    <td className="py-2 text-muted text-xs">{user.playerId}</td>
                    <td className="py-2 text-center">{user.quizzes}</td>
                    <td className="py-2 text-center">{user.booksRead}</td>
                    <td className="py-2 text-center">{accuracy}%</td>
                    <td className="py-2 text-center">
                      <button className="text-error hover:text-error/80 text-xs underline" onClick={() => deleteUser(user.key)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}