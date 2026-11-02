import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext'; // 👈 Added

export default function Donate() {
  const navigate = useNavigate();
  const { t } = useLanguage(); // 👈 Added

  const NTUMA_URL = 'https://ntuma.app/pay/8d83c658-d05e-4438-9d8d-7d3ec1d4f3d8';

  return (
    <div className="py-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-primary text-2xl font-bold">{t('supportRhema')}</h1>
        <button className="btn-secondary !w-auto !py-2 !px-4 text-sm" onClick={() => navigate(-1)}>
          {t('back')}
        </button>
      </div>

      <div className="bg-surface rounded-xl p-6 border border-[#2a2a2a] space-y-4 text-sm leading-relaxed text-muted">
        <p className="text-text text-base">{t('donateText1')}</p>

        <p>{t('donateSupportHelps')}</p>
        <ul className="list-disc list-inside pl-4 space-y-1">
          <li>{t('donateList1')}</li>
          <li>{t('donateList2')}</li>
          <li>{t('donateList3')}</li>
        </ul>

        <div className="bg-primary/10 border border-primary/30 rounded-xl p-5 text-center mt-4">
          <p className="text-text font-semibold mb-2">{t('donateSupportMission')}</p>
          <p className="text-sm">{t('donateEveryContribution')}</p>

          <a
            href={NTUMA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-black font-bold text-lg hover:bg-primary/80 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-primary/20 mt-4"
          >
            <Heart className="w-5 h-5 fill-current" />
            {t('donateWithNtuma')}
          </a>

          <p className="text-xs text-center text-muted mt-4">
            {t('donateRedirectNote')}
          </p>
        </div>
      </div>
    </div>
  );
}