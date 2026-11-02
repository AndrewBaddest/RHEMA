import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

export default function TermsOfService() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="py-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-primary text-2xl font-bold">{t('termsOfService')}</h1>
        <button className="btn-secondary !w-auto !py-2 !px-4 text-sm" onClick={() => navigate(-1)}>
          {t('policyBack')}
        </button>
      </div>

      <div className="bg-surface rounded-xl p-6 border border-[#2a2a2a] space-y-4 text-sm leading-relaxed text-muted">
        <p><strong className="text-text">{t('lastUpdatedLabel')}</strong> {t('termsLastUpdated')}</p>

        <h2 className="text-primary text-lg font-semibold mt-4">{t('termsH1')}</h2>
        <p>{t('termsP1')}</p>

        <h2 className="text-primary text-lg font-semibold mt-4">{t('termsH2')}</h2>
        <p>{t('termsP2')}</p>

        <h2 className="text-primary text-lg font-semibold mt-4">{t('termsH3')}</h2>
        <p>{t('termsP3')}</p>

        <h2 className="text-primary text-lg font-semibold mt-4">{t('termsH4')}</h2>
        <p>{t('termsP4')}</p>

        <h2 className="text-primary text-lg font-semibold mt-4">{t('termsH5')}</h2>
        <p>{t('termsP5')}</p>

        <h2 className="text-primary text-lg font-semibold mt-4">{t('termsH6')}</h2>
        <p>{t('termsP6')}</p>

        <h2 className="text-primary text-lg font-semibold mt-4">{t('termsH7')}</h2>
        <p>{t('termsP7')}</p>

        <h2 className="text-primary text-lg font-semibold mt-4">{t('termsH8')}</h2>
        <p>{t('termsP8')}</p>

        <h2 className="text-primary text-lg font-semibold mt-4">{t('termsH9')}</h2>
        <p>{t('termsP9')}</p>
      </div>
    </div>
  );
}