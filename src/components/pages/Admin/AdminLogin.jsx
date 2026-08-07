import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../../lib/store';

const ADMIN_USERNAME = 'Nathan Abi';
const ADMIN_PASSWORD = '202626';

export default function AdminLogin() {
  const [username, setUsername] = useState(ADMIN_USERNAME);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setToast = useUIStore((state) => state.setToast);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username !== ADMIN_USERNAME) {
      setError('Invalid username');
      return;
    }
    if (password !== ADMIN_PASSWORD) {
      setError('Invalid password');
      return;
    }
    sessionStorage.setItem('admin_logged_in', 'true');
    setToast('✅ Welcome to Admin Panel', 'success');
    navigate('/admin/dashboard');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-surface rounded-xl p-8 border border-[#2a2a2a] max-w-md w-full shadow-xl">
        <h2 className="text-primary text-3xl font-bold text-center mb-2">🔐 Admin Login</h2>
        <p className="text-muted text-center mb-6">Enter your credentials</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="text-sm text-muted block mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 rounded-lg border border-[#333] bg-surface-light text-text focus:outline-none focus:border-primary"
              readOnly
            />
          </div>
          <div className="mb-4">
            <label className="text-sm text-muted block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full p-3 rounded-lg border border-[#333] bg-surface-light text-text focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>
          {error && <p className="text-error text-sm mb-4">{error}</p>}
          <button type="submit" className="btn !w-auto px-8 py-3">🔓 Login</button>
        </form>
      </div>
    </div>
  );
}