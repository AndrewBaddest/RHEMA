import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
  const navigate = useNavigate();

  // ── Scroll to top on mount ──
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="py-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-primary text-2xl font-bold">Terms of Service</h1>
        <button className="btn-secondary !w-auto !py-2 !px-4 text-sm" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      <div className="bg-surface rounded-xl p-6 border border-[#2a2a2a] space-y-4 text-sm leading-relaxed text-muted">
        <p><strong className="text-text">Last updated:</strong> August 2026</p>

        <h2 className="text-primary text-lg font-semibold mt-4">1. Acceptance of Terms</h2>
        <p>
          By using the Rhema Bible Quiz app ("the App"), you agree to these Terms of Service. If you do not agree, please do not use the App.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">2. Description of Service</h2>
        <p>
          Rhema is a Bible quiz and reading app designed to help users explore Scripture through interactive quizzes and reading. The App is provided for educational and entertainment purposes only.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">3. User Accounts</h2>
        <p>
          Currently, the App does not require a registered account. You may choose a username and a device‑based player ID is generated. Your progress is stored locally on your device. We do not collect or store any personal data on our servers.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">4. User Content</h2>
        <p>
          You are responsible for the username you choose. You agree not to use offensive, unlawful, or inappropriate names. We reserve the right to block or remove any content that violates these terms.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">5. Intellectual Property</h2>
        <p>
          All content in the App, including but not limited to the Bible text, quiz questions, design, and code, is either owned by us or used with permission. You may not reproduce, distribute, or create derivative works without prior written consent.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">6. Disclaimer of Warranties</h2>
        <p>
          The App is provided "as is" without warranties of any kind. We do not guarantee that the App will be error‑free or uninterrupted. We are not responsible for any loss of data or damage resulting from use of the App.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">7. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, or consequential damages arising from your use of the App.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">8. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. We will notify you of any material changes by posting the new Terms on this page.
        </p>

        <h2 className="text-primary text-lg font-semibold mt-4">9. Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at <a href="mailto:rhemabiblequiz@gmail.com" className="text-primary hover:underline">info@rhema.org</a>.
        </p>
      </div>
    </div>
  );
}