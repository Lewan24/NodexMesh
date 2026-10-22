import { useTranslation } from 'react-i18next';

export default function LoadingScreen() {
  const { t } = useTranslation();
  return <div role="status">{t('Loading…')}</div>;
}
