import { useEffect, useState } from 'react';

export default function Celebration({ message, emoji, duration = 3000 }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShow(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);
  if (!show) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="bg-surface border border-primary rounded-xl p-6 max-w-sm mx-4 text-center animate-bounce-in shadow-xl pointer-events-auto">
        <div className="text-6xl mb-2">{emoji}</div>
        <p className="text-lg font-bold text-primary">{message}</p>
      </div>
    </div>
  );
}