import { useEffect, useState } from 'react';
import { useStore } from '../../../lib/store';
import { ALL_BOOKS } from '../../../lib/utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const quizzes = useStore((state) => state.quizzes);
  const scripture = useStore((state) => state.scripture);
  const globalChallenges = useStore((state) => state.globalChallenges);
  const allQuizQuestions = useStore((state) => state.allQuizQuestions);
  const [users, setUsers] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);

  useEffect(() => {
    // Count users from localStorage
    const keys = Object.keys(localStorage);
    const progressKeys = keys.filter(k => k.startsWith('rhema_progress_'));
    setUsers(progressKeys);

    // Load quiz questions
    const stored = localStorage.getItem('rhema_quiz_admin');
    if (stored) {
      try {
        setQuizQuestions(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  const totalCorrect = quizzes.reduce((acc, q) => acc + (q.score || 0), 0);
  const totalQuestions = quizzes.reduce((acc, q) => acc + (q.total || 0), 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const booksRead = (scripture.booksRead || []).length;

  return (
    <div>
      <h2 className="text-primary text-2xl font-bold mb-6">📊 Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a]">
          <div className="text-muted text-sm">Total Users</div>
          <div className="text-3xl font-bold text-primary">{users.length}</div>
        </div>
        <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a]">
          <div className="text-muted text-sm">Quiz Questions</div>
          <div className="text-3xl font-bold text-primary">{allQuizQuestions.length || quizQuestions.length}</div>
        </div>
        <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a]">
          <div className="text-muted text-sm">Quiz Accuracy</div>
          <div className="text-3xl font-bold text-primary">{accuracy}%</div>
        </div>
        <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a]">
          <div className="text-muted text-sm">Books Read</div>
          <div className="text-3xl font-bold text-primary">{booksRead} / {ALL_BOOKS.length}</div>
        </div>
        <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a]">
          <div className="text-muted text-sm">Global Challenges</div>
          <div className="text-3xl font-bold text-primary">{globalChallenges.length}</div>
        </div>
        <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a]">
          <div className="text-muted text-sm">Total Quizzes Taken</div>
          <div className="text-3xl font-bold text-primary">{quizzes.length}</div>
        </div>
      </div>
    </div>
  );
}