import '../styles/InfoSections.css';
import {
  Leaf,
  ShieldCheck,
  Sprout,
  Sparkles,
  Star,
  Quote,
  MapPin,
  Phone,
  PhoneCall,
  Navigation,
} from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import {
  CONTACT_PHONE_DISPLAY,
  PHONE_LINK,
  WHATSAPP_LINK,
  MAPS_URL,
  MAPS_EMBED_URL,
} from '../config';
import { useLanguage } from '../context/LanguageContext';
import { formatPrice, OFFER_GROUP_PRICE } from '../data/products';

const BODY_BENEFITS = [
  { icon: Leaf, label: 'Pure Herbs', text: 'Made with natural, plant-based ingredients.' },
  { icon: ShieldCheck, label: 'No Harsh Chemicals', text: 'Free from synthetic additives.' },
  { icon: Sprout, label: 'Natural Care', text: 'Gentle daily care for clean, healthy skin.' },
  { icon: Sparkles, label: 'Healthy Skin', text: 'Refreshing lather for a natural glow.' },
];

const REVIEWS = [
  {
    initials: 'PR',
    name: 'Priya R.',
    text: 'Lovely fragrance and a soft, gentle lather. The pack of three is great value.',
  },
  {
    initials: 'AK',
    name: 'Arun K.',
    text: 'Small-batch quality you can feel. The herbal soaps smell wonderfully natural.',
  },
  {
    initials: 'SN',
    name: 'Sneha N.',
    text: 'Beautifully handmade and kind to my skin. Ordering on WhatsApp was easy.',
  },
];

const InfoSections = () => {
  const { t } = useLanguage();

  return (
    <>
      <section className="info-section" id="our-story">
        <div className="info-container">
          <span className="info-eyebrow">Our Story</span>
          <h2 className="info-heading">Handmade, the way nature intended</h2>
          <p className="info-text">
            JH Soap crafts small batches of herbal soaps using pure herbs and simple,
            natural care. Every bar is made slowly, with attention to quality, so you can bring
            home the goodness of nature.
          </p>
        </div>
      </section>

      <section className="info-section info-section-beige" id="benefits">
        <div className="info-container">
          <span className="info-eyebrow">Why JH Soap</span>
          <h2 className="info-heading">Benefits</h2>
          <div className="info-benefits-grid">
            {BODY_BENEFITS.map(({ icon: Icon, label, text }) => (
              <div className="info-benefit-card" key={label}>
                <div className="info-benefit-icon">
                  <Icon size={26} strokeWidth={1.5} />
                </div>
                <h3 className="info-benefit-title">{label}</h3>
                <p className="info-benefit-text">{text}</p>
              </div>
            ))}
          </div>
          <p className="info-note">
            Pick any 3 soaps for {formatPrice(OFFER_GROUP_PRICE)} — see the special offer below.
          </p>
        </div>
      </section>

      <section className="info-section" id="reviews">
        <div className="info-container">
          <span className="info-eyebrow">Reviews</span>
          <h2 className="info-heading">What our customers say</h2>
          <div className="info-reviews-grid">
            {REVIEWS.map((review) => (
              <div className="info-review-card" key={review.name}>
                <Quote size={22} strokeWidth={1.25} className="info-quote" />
                <p className="info-review-text">“{review.text}”</p>
                <div className="info-review-author">
                  <span className="info-review-avatar">{review.initials}</span>
                  <div className="info-review-stars" aria-label="Rated 5 out of 5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} strokeWidth={1.5} fill="currentColor" />
                    ))}
                  </div>
                  <span className="info-review-name">{review.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="info-section info-section-beige" id="contact">
        <div className="info-container info-contact-grid">
          <div className="info-contact-left">
            <span className="info-eyebrow">{t('info.contact')}</span>
            <h2 className="info-heading">{t('info.getInTouch')}</h2>
            <p className="info-text">{t('info.contactIntro')}</p>

            <div className="info-contact-cards">
              <article className="info-contact-card">
                <div className="info-contact-head">
                  <div className="info-contact-icon">
                    <Phone size={22} strokeWidth={1.5} />
                  </div>
                  <div className="info-contact-copy">
                    <span className="info-contact-label">{t('info.contactNumber')}</span>
                    <a className="info-contact-value" href={PHONE_LINK}>
                      {CONTACT_PHONE_DISPLAY}
                    </a>
                  </div>
                </div>
                <div className="info-contact-actions">
                  <a className="info-contact-btn" href={PHONE_LINK}>
                    <PhoneCall size={16} strokeWidth={1.6} />
                    {t('info.callNow')}
                  </a>
                  <a
                    className="info-contact-btn info-contact-btn--whatsapp"
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WhatsAppIcon size={16} />
                    {t('info.chatWhatsApp')}
                  </a>
                </div>
              </article>

              <article className="info-contact-card">
                <div className="info-contact-head">
                  <div className="info-contact-icon">
                    <MapPin size={22} strokeWidth={1.5} />
                  </div>
                  <div className="info-contact-copy">
                    <span className="info-contact-label">{t('info.ourLocation')}</span>
                    <span className="info-contact-value info-contact-value--static">
                      JH Soap, Handmade Herbal Soaps
                    </span>
                  </div>
                </div>
                <div className="info-contact-actions">
                  <a
                    className="info-contact-btn"
                    href={MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation size={16} strokeWidth={1.6} />
                    {t('info.getDirections')}
                  </a>
                </div>
              </article>
            </div>
          </div>

          <div className="info-contact-map">
            <iframe
              title={t('info.mapTitle')}
              src={MAPS_EMBED_URL}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </>
  );
};

export default InfoSections;