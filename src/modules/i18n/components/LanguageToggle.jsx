import { useLanguage } from '../hooks/useLanguage.js';

export default function LanguageToggle() {
  const { lang, toggle, t } = useLanguage();
  const next = lang === 'pt' ? 'EN' : 'PT';

  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-toggle lang-toggle"
      aria-label={t('lang.switchTo')}
      title={t('lang.switchTo')}
      style={{
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.05em',
        minWidth: '36px',
      }}
    >
      {next}
    </button>
  );
}
