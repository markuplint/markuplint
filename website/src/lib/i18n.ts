import { useRouter } from 'next/router';

import en from '../locales/en';
import ja from '../locales/ja';

const translations = {
  en,
  ja,
};

export const useTranslation = () => {
  const { locale, defaultLocale } = useRouter();
  const t = (key: string) => {
    const translation = translations[locale] ?? translations[defaultLocale] ?? {};
    return translation[key] ?? key;
  };
  return { t };
};
