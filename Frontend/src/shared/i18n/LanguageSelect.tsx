import { useTranslation } from 'react-i18next';
import { changeLanguage, type Language } from './index';

export default function LanguageSelect() {
  const { t, i18n } = useTranslation();
  return (
    <label
      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
      style={{ color: 'var(--color-chrome-text)' }}
    >
      <span>{t('Language')}</span>
      <select
        aria-label={t('Language')}
        className="input-theme rounded-lg px-2 py-1 text-sm"
        value={i18n.resolvedLanguage === 'en' ? 'en' : 'pl'}
        onChange={(event) => void changeLanguage(event.target.value as Language)}
      >
        <option value="pl" lang="pl">
          Polski
        </option>
        <option value="en" lang="en">
          English
        </option>
      </select>
    </label>
  );
}
