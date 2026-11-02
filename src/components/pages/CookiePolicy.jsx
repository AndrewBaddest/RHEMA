import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

export default function CookiePolicy() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="py-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-primary text-2xl font-bold">{t('cookiePolicy')}</h1>
        <button className="btn-secondary !w-auto !py-2 !px-4 text-sm" onClick={() => navigate(-1)}>
          {t('policyBack')}
        </button>
      </div>

      <div className="bg-surface rounded-xl p-6 border border-[#2a2a2a] space-y-4 text-sm leading-relaxed text-muted">
        <p><strong className="text-text">{t('lastUpdatedLabel')}</strong> {t('cookieLastUpdated')}</p>

        <h2 className="text-primary text-lg font-semibold mt-4">{t('cookieH1')}</h2>
        <p>{t('cookieP1')}</p>

        <h2 className="text-primary text-lg font-semibold mt-4">{t('cookieH2')}</h2>
        <p>{t('cookieP2')}</p>
        <ul className="list-disc list-inside pl-4 space-y-1 mt-1">
          <li>{t('cookieList1')}</li>
          <li>{t('cookieList2')}</li>
          <li>{t('cookieList3')}</li>
        </ul>
        <p className="mt-2">{t('cookieP3')}</p>

        <h2 className="text-primary text-lg font-semibold mt-4">{t('cookieH3')}</h2>
        <p>{t('cookieP4')}</p>

        <h2 className="text-primary text-lg font-semibold mt-4">{t('cookieH4')}</h2>
        <p>{t('cookieP5')}</p>

        <h2 className="text-primary text-lg font-semibold mt-4">{t('cookieH5')}</h2>
        <p>{t('cookieP6')}</p>

        <h2 className="text-primary text-lg font-semibold mt-4">{t('cookieH6')}</h2>
        <p>{t('cookieP7')}</p>
      </div>
    </div>
  );
}