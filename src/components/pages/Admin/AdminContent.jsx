import { useState, useEffect } from 'react';

export default function AdminContent() {
  const [aboutText, setAboutText] = useState('');
  const [contactEmail, setContactEmail] = useState('rhemabiblequiz@gmail.com');
  const [missionText, setMissionText] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('rhema_content_admin');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setAboutText(data.about || '');
        setContactEmail(data.contactEmail || 'rhemabiblequiz@gmail.com');
        setMissionText(data.mission || '');
      } catch (e) {}
    }
  }, []);

  const saveContent = () => {
    localStorage.setItem('rhema_content_admin', JSON.stringify({
      about: aboutText,
      contactEmail,
      mission: missionText,
    }));
    alert('✅ Content saved');
  };

  return (
    <div>
      <h2 className="text-primary text-2xl font-bold mb-6">📄 Content Management</h2>

      <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a] space-y-4">
        <div>
          <label className="text-sm text-muted block mb-1">Mission Statement</label>
          <textarea
            value={missionText}
            onChange={(e) => setMissionText(e.target.value)}
            className="w-full p-3 rounded-lg border border-[#333] bg-surface-light text-text focus:outline-none focus:border-primary"
            rows={3}
          />
        </div>
        <div>
          <label className="text-sm text-muted block mb-1">About Page Text</label>
          <textarea
            value={aboutText}
            onChange={(e) => setAboutText(e.target.value)}
            className="w-full p-3 rounded-lg border border-[#333] bg-surface-light text-text focus:outline-none focus:border-primary"
            rows={6}
          />
        </div>
        <div>
          <label className="text-sm text-muted block mb-1">Contact Email</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full p-3 rounded-lg border border-[#333] bg-surface-light text-text focus:outline-none focus:border-primary"
          />
        </div>
        <button className="btn !w-auto px-6 py-2" onClick={saveContent}>💾 Save Content</button>
      </div>
    </div>
  );
}