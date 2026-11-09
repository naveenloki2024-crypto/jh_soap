import en from './en.json';
import ta from './ta.json';

const translations = { en, ta };

export function getTranslations(lang = 'en') {
  return translations[lang] || translations.en;
}

export function getNestedTranslation(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}
