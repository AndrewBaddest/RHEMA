import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, useUIStore } from '../../lib/store';
import { generateDeviceCode } from '../../lib/utils';
import { useSound } from '../../hooks/useSound';

export default function Auth() {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();
  const setUsernameStore = useStore((state) => state.setUsername);
  const setPlayerId = useStore((state) => state.setPlayerId);
  const setToast = useUIStore((state) => state.setToast);
  const { startBackground } = useSound();

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = username.trim() || 'Player';
    const code = generateDeviceCode();
    const playerId = name + ' ' + code;
    setUsernameStore(name);
    setPlayerId(playerId);
    startBackground();
    setToast(`👋 Welcome back, ${name}!`, 'success');
    navigate('/home');
  };

  return (
    <div>
      <h2 className="text-center text-2xl font-bold mb-4">Welcome to Rhema</h2>
      <div className="mission-box">
        <div className="text-center text-sm text-muted mb-2">Our Mission</div>
        <p className="text-sm leading-relaxed text-center">
          We're passionate about helping people of all ages and backgrounds explore the Bible in a way that's <strong className="text-primary">engaging</strong>, <strong className="text-primary">interactive</strong>, and <strong className="text-primary">fun</strong>!
        </p>
        <div className="mt-3 pt-3 border-t border-primary/15 text-center text-sm text-muted italic">
          “Your word is a lamp to my feet and a light to my path.” — <span className="text-primary not-italic font-medium">Psalm 119:105</span>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your name (e.g., Noah)"
            className="w-full p-3 rounded-lg border border-[#333] bg-surface text-text text-base focus:outline-none focus:border-primary"
          />
        </div>
        <button type="submit" className="btn">▶ Play</button>
      </form>
      <div className="mt-3 text-center text-muted text-xs">
        Your progress will be saved locally. Create an account to save across devices.
      </div>
    </div>
  );
}