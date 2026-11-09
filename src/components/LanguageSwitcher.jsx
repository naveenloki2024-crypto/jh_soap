import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/LanguageSwitcher.css';

const LanguageSwitcher = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      className="lang-switcher"
      onClick={toggleLanguage}
      aria-label={language === 'en' ? 'Switch to Tamil' : 'Switch to English'}
      title={language === 'en' ? 'Switch to Tamil' : 'Switch to English'}
    >
      <Globe size={18} strokeWidth={1.5} />
      <span className="lang-text">{language === 'en' ? 'EN | தமிழ்' : 'தமிழ் | EN'}</span>
    </button>
  );
};

export default LanguageSwitcher;
