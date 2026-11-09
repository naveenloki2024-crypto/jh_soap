import { useEffect, useState } from 'react';
import '../styles/Hero.css';
import { ShoppingCart, ArrowRight, Leaf, ShieldCheck, Sprout, Sparkles, RefreshCw } from 'lucide-react';
import heroImage from '../assets/hero.png';
import { waMessageLink } from '../config';
import { useLanguage } from '../context/LanguageContext';
import { fetchHero } from '../api/hero';
import { DEFAULT_HERO_CONTENT } from '../data/hero';
import { subscribeStorefrontUpdates } from '../utils/storefrontEvents';

const WhatsAppIcon = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const backgroundStyle = (url) =>
  url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined;

const isExternal = (link) => /^https?:\/\//i.test(link);

const HeroSkeleton = () => (
  <section className="hero-section hero-section--loading" aria-busy="true" aria-label="Loading hero">
    <div className="hero-container">
      <div className="hero-grid">
        <div className="hero-skeleton-copy">
          <span className="hero-skeleton-line hero-skeleton-line--short" />
          <span className="hero-skeleton-line hero-skeleton-line--title" />
          <span className="hero-skeleton-line" />
          <span className="hero-skeleton-line" />
          <span className="hero-skeleton-line hero-skeleton-line--button" />
        </div>
        <span className="hero-skeleton-image" />
      </div>
    </div>
  </section>
);

const Hero = () => {
  const { t } = useLanguage();
  const [hero, setHero] = useState(null);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchHero({ signal: controller.signal })
      .then((data) => {
        if (!active) return;
        setHero(data);
        setStatus('ready');
      })
      .catch((error) => {
        if (!active || error?.name === 'AbortError') return;
        setStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  useEffect(
    () => subscribeStorefrontUpdates(() => setAttempt((value) => value + 1)),
    [],
  );

  const retry = () => {
    setStatus('loading');
    setAttempt((value) => value + 1);
  };

  if (status === 'loading' && !hero) {
    return <HeroSkeleton />;
  }

  const config = hero || DEFAULT_HERO_CONTENT;
  if (config.isVisible === false) return null;

  const heading = config.heading?.trim() || t('hero.heading');
  const headingHighlight = config.headingHighlight?.trim() || t('hero.headingGreen');
  const subtitle = config.subtitle?.trim() || t('hero.eyebrow');
  const description = config.description?.trim() || t('hero.description');

  const productImage = config.productImage || heroImage;
  const desktopBackground = config.desktopBannerImage || config.backgroundImage || '';
  const mobileBackground = config.mobileBannerImage || desktopBackground;
  const hasBackground = Boolean(desktopBackground || mobileBackground);

  const primaryText = config.primaryButtonText?.trim() || t('hero.shopSoaps');
  const primaryLink = config.primaryButtonLink?.trim() || '#shop';
  const secondaryText = config.secondaryButtonText?.trim() || t('hero.orderOnWhatsapp');
  const secondaryLink =
    config.secondaryButtonLink?.trim() ||
    waMessageLink('Hi JH Soap! I would like to order your herbal soaps.');

  const handleLink = (event, link) => {
    if (!link.startsWith('#')) return;
    const target = document.querySelector(link);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
  };

  const linkAttributes = (link) =>
    isExternal(link) ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  const secondaryIsWhatsApp = /wa\.me|whatsapp/i.test(secondaryLink);

  return (
    <section
      className={`hero-section hero--align-${config.textAlign || 'left'}${
        hasBackground ? ' hero-section--has-bg' : ''
      }`}
      id="home"
    >
      {desktopBackground ? (
        <div className="hero-bg hero-bg--desktop" style={backgroundStyle(desktopBackground)} aria-hidden="true" />
      ) : null}
      {mobileBackground ? (
        <div className="hero-bg hero-bg--mobile" style={backgroundStyle(mobileBackground)} aria-hidden="true" />
      ) : null}

      <div className="hero-container">
        <div className="hero-grid">
          <div className="hero-left">
            <div className="hero-eyebrow">
              <span className="eyebrow-line" />
              <Leaf size={18} className="eyebrow-leaf" strokeWidth={1.5} />
              <span className="eyebrow-text">{subtitle}</span>
              <span className="eyebrow-line" />
            </div>

            <h1 className="hero-heading">
              {heading}
              {headingHighlight ? (
                <>
                  <br />
                  <span className="hero-heading-green">{headingHighlight}</span>
                </>
              ) : null}
            </h1>

            <p className="hero-description">{description}</p>

            <div className="benefits">
              <div className="benefit-item">
                <div className="benefit-circle">
                  <Leaf size={28} strokeWidth={1.75} />
                </div>
                <span className="benefit-label">{t('hero.pureHerbs')}</span>
              </div>
              <div className="benefit-item">
                <div className="benefit-circle">
                  <ShieldCheck size={28} strokeWidth={1.75} />
                </div>
                <span className="benefit-label">{t('hero.noHarshChemicals')}</span>
              </div>
              <div className="benefit-item">
                <div className="benefit-circle">
                  <Sprout size={28} strokeWidth={1.75} />
                </div>
                <span className="benefit-label">{t('hero.naturalCare')}</span>
              </div>
              <div className="benefit-item">
                <div className="benefit-circle">
                  <Sparkles size={28} strokeWidth={1.75} />
                </div>
                <span className="benefit-label">{t('hero.healthySkin')}</span>
              </div>
            </div>

            <div className="hero-cta">
              <a
                className="cta-primary"
                href={primaryLink}
                onClick={(event) => handleLink(event, primaryLink)}
                {...linkAttributes(primaryLink)}
              >
                <ShoppingCart size={18} strokeWidth={1.5} />
                <span>{primaryText}</span>
                <ArrowRight size={18} strokeWidth={1.5} />
              </a>
              <a
                className="cta-secondary"
                href={secondaryLink}
                onClick={(event) => handleLink(event, secondaryLink)}
                {...linkAttributes(secondaryLink)}
              >
                {secondaryIsWhatsApp ? <WhatsAppIcon size={18} /> : <ArrowRight size={18} strokeWidth={1.5} />}
                <span>{secondaryText}</span>
              </a>
            </div>

            {status === 'error' ? (
              <p className="hero-notice" role="status">
                Showing saved defaults — live content could not be loaded.
                <button type="button" className="hero-retry" onClick={retry}>
                  <RefreshCw size={12} strokeWidth={1.8} />
                  Retry
                </button>
              </p>
            ) : null}
          </div>

          <div className="hero-right">
            <div className="hero-visual">
              <img
                src={productImage}
                alt="JH Herbal Soaps collection"
                className="hero-combined-image"
              />

              <div className="pricing-banner">
                <div className="price-block">
                  <span className="price-label">{t('hero.singleSoap')}</span>
                  <span className="price-amount">₹110/-</span>
                </div>
                <span className="price-divider" />
                <div className="price-block">
                  <span className="price-label">{t('hero.packOfThree')}</span>
                  <span className="price-amount">₹285/-</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
