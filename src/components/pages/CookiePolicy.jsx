import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CookiePolicy() {
  const navigate = useNavigate();

  // ── Scroll to top on mount ──
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="py-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-primary text-2xl font-bold">Cookie Policy</h1>
        <button className="btn-secondary !w-auto !py-2 !px-4 text-sm" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      <div className="bg-surface rounded-xl p-6 border border-[#2a2a2a] space-y-4 text-sm leading-relaxed text-muted">
        <p><strong className="text-text">Last updated:</strong> August 2026</p>

        <h2 className="text-primary text-lg font-semibold mt-4">1. What are Cookies?</h2>
        <p>
          Cookies are small text files stored on your device by websites. They are used to remember your preferences and improve your experience.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">2. How We Use Cookies</h2>
        <p>
          <strong>Rhema does not use cookies.</strong> Instead, we use <strong>localStorage</strong>, which is a similar browser storage mechanism. localStorage is used to:
        </p>
        <ul className="list-disc list-inside pl-4 space-y-1 mt-1">
          <li>Store your progress (quiz scores, reading history)</li>
          <li>Remember your settings (sound, timer preferences)</li>
          <li>Keep your player ID and username</li>
        </ul>
        <p className="mt-2">
          Unlike cookies, localStorage data is not sent to our servers – it stays only in your browser.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">3. Your Choices</h2>
        <p>
          You can clear all localStorage data at any time by using the "Clear all progress" option in the Settings page, or by clearing your browser's site data. This will reset your progress and preferences.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">4. Third‑Party Cookies</h2>
        <p>
          The App does not use any third‑party cookies. Advertisements (if any) may be served through third‑party networks that may place their own cookies. We do not control these and recommend you review their privacy policies.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">5. Changes to This Policy</h2>
        <p>
          We may update this Cookie Policy occasionally. Any changes will be posted on this page.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">6. Contact Us</h2>
        <p>
          If you have any questions, please contact us at <a href="mailto:rhemabiblequiz@gmail.com" className="text-primary hover:underline">info@rhema.org</a>.
        </p>
      </div>
    </div>
  );
}