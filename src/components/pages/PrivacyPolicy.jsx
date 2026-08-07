import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  // ── Scroll to top on mount ──
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="py-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-primary text-2xl font-bold">Privacy Policy</h1>
        <button className="btn-secondary !w-auto !py-2 !px-4 text-sm" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      <div className="bg-surface rounded-xl p-6 border border-[#2a2a2a] space-y-4 text-sm leading-relaxed text-muted">
        <p><strong className="text-text">Last updated:</strong> August 2026</p>

        <h2 className="text-primary text-lg font-semibold mt-4">1. Introduction</h2>
        <p>
          Rhema Bible Quiz ("we", "our", "us") respects your privacy. This Privacy Policy explains how we handle your information when you use our App.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">2. Information We Collect</h2>
        <p>
          <strong>We do not collect any personal data on our servers.</strong> All progress, settings, and player information are stored locally in your browser using <strong>localStorage</strong>. We do not have access to this data.
        </p>
        <p className="mt-2">
          The only information you voluntarily provide is your chosen username, which is used solely to display your identity within the App. This is also stored locally.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">3. Cookies and Tracking</h2>
        <p>
          We do not use cookies or any tracking technologies. The only data stored are local storage items (like your progress and settings) that you can clear at any time.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">4. Third‑Party Services</h2>
        <p>
          The App may include links to external websites (e.g., advertisements). We are not responsible for the privacy practices of those sites. We encourage you to review their privacy policies.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">5. Data Security</h2>
        <p>
          Since we do not store any data on our servers, all data remains on your device. We recommend that you keep your device secure.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">6. Children's Privacy</h2>
        <p>
          Our App is suitable for all ages. We do not knowingly collect any personal information from children under 13. If you are a parent and believe your child has provided us with personal information, please contact us.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">7. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">8. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at <a href="mailto:rhemabiblequiz@gmail.com" className="text-primary hover:underline">info@rhema.org</a>.
        </p>
      </div>
    </div>
  );
}