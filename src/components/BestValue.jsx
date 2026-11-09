import '../styles/BestValue.css';
import { Sparkles, ArrowDown, BadgePercent } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const BestValue = () => {
  const { t } = useLanguage();
  const scrollToShop = () => {
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <article className="best-value-card" id="best-value">
      <span className="best-badge">
        <Sparkles size={12} strokeWidth={1.75} />
        {t('bestValue.badge')}
      </span>

      <div className="best-icon">
        <BadgePercent size={26} strokeWidth={1.5} />
      </div>

      <h3 className="best-title">{t('bestValue.title')}</h3>
      <p className="best-desc">
        {t('bestValue.desc')}
      </p>

      <div className="best-math">
        <span className="best-math-chip">{t('bestValue.perSoap')}</span>
        <span className="best-math-op">{t('bestValue.times3')}</span>
        <span className="best-math-chip best-math-yours">{t('bestValue.yours')}</span>
        <span className="best-math-op">{t('bestValue.save')}</span>
        <span className="best-math-chip best-math-save">{t('bestValue.saveAmount')}</span>
      </div>

      <button className="best-shop-btn" onClick={scrollToShop}>
        {t('bestValue.shopNow')}
        <ArrowDown size={16} strokeWidth={1.5} />
      </button>
    </article>
  );
};

export default BestValue;
