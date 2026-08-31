import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';

export default function Donate() {
  const navigate = useNavigate();

  const PAYPAL_URL = 'https://www.paypal.com/ncp/payment/KJY568KQ4Z2A2';

  return (
    <div className="py-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-primary text-2xl font-bold"> Rhema </h1>
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

          {/* ─── Themed PayPal Button ─── */}
          <a
            href={PAYPAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-black font-bold text-lg hover:bg-primary/80 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-primary/20 mt-4"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.29 2.73.79 4.56-.05.18-.11.37-.18.56l-.02.06c-.38 1.12-.96 2.07-1.72 2.83-.8.8-1.79 1.38-2.94 1.73-.66.2-1.37.31-2.11.31h-1.5c-.37 0-.68.27-.75.64l-.23 1.46-.01.06c-.06.34-.35.59-.7.59h-1.62c-.37 0-.68-.27-.75-.64l-.22-1.38z"/>
            </svg>
              Support Rhema
          </a>

          <p className="text-xs text-center text-muted mt-4">
            You will be redirected to PayPal to complete your support securely.
          </p>
        </div>
      </div>
    </div>
  );
}