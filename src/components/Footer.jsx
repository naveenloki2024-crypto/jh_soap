import '../styles/Footer.css';
import logo from '../assets/logo.png';
import { useLanguage } from '../context/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();
  
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <img src={logo} alt="JH Soap Logo" />
          <p>{t('footer.desc')}</p>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <a href="#home">{t('nav.home')}</a>
          <a href="#shop">{t('nav.shop')}</a>
          <a href="#our-story">{t('nav.ourStory')}</a>
          <a href="#benefits">{t('nav.benefits')}</a>
          <a href="#reviews">{t('nav.reviews')}</a>
          <a href="#contact">{t('nav.contact')}</a>
        </nav>
        <p className="footer-copy">{t('footer.copyright')}</p>
      </div>
    </footer>
  );
};

export default Footer;
