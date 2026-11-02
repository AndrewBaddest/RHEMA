import { useLanguage } from '../../context/LanguageContext'; // 👈 Added

export default function Contact() {
  const { t } = useLanguage(); // 👈 Added

  return (
    <div className="py-2">
      <h2 className="text-primary text-2xl font-bold mb-4">{t('contactUs')}</h2>
      <p className="text-muted leading-relaxed mb-4">
        {t('contactDesc')}
      </p>
      <p className="text-xl mb-4">
        <a href="mailto:rhemabiblequiz@gmail.com" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">
          rhema.org
        </a>
      </p>
      <p className="text-muted">{t('contactResponse')}</p>
    </div>
  );
}