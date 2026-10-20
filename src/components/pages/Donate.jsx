import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';

export default function Donate() {
  const navigate = useNavigate();

  const NTUMA_URL = 'https://ntuma.app/pay/48a185fd-2ff7-43e4-86d9-51ee9cd3a753';

  return (
    <div className="py-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-primary text-2xl font-bold"> Support Rhema </h1>
        <button className="btn-secondary !w-auto !py-2 !px-4 text-sm" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      <div className="bg-surface rounded-xl p-6 border border-[#2a2a2a] space-y-4 text-sm leading-relaxed text-muted">
        <p className="text-text text-base">
          Rhema is a labour of love – built by a small team passionate about making Scripture accessible, engaging, and fun.
        </p>

        <p>Your support helps us:</p>
        <ul className="list-disc list-inside pl-4 space-y-1">
          <li>Keep the app free for everyone</li>
          <li>Add more quiz questions and Bible versions</li>
          <li>Cover hosting and future development costs</li>
        </ul>

        <div className="bg-primary/10 border border-primary/30 rounded-xl p-5 text-center mt-4">
          <p className="text-text font-semibold mb-2">  Support the Mission</p>
          <p className="text-sm">Every contribution Supports Our Mission.</p>

          {/* ─── Ntuma Payment Button ─── */}
          <a
            href={NTUMA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-black font-bold text-lg hover:bg-primary/80 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-primary/20 mt-4"
          >
            <Heart className="w-5 h-5 fill-current" />
            Donate with Ntuma
          </a>

          <p className="text-xs text-center text-muted mt-4">
            You will be redirected to Ntuma to complete your Donation securely.
          </p>
        </div>
      </div>
    </div>
  );
}