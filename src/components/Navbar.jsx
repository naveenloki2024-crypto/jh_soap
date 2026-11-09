import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';
import logo from '../assets/logo.png';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { useCart } from '../context/cart';
import AccountMenu from './AccountMenu';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';

const SECTION_IDS = ['home', 'shop', 'our-story', 'benefits', 'reviews', 'contact'];
const ACTIVE_OVERLAP = 150;

const getInitialSection = () => {
  if (typeof window === 'undefined') return '';
  const hash = window.location.hash.slice(1);
  return SECTION_IDS.includes(hash) ? hash : '';
};

const Navbar = () => {
  const { totals, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(getInitialSection);
  const activeSectionRef = useRef(activeSection);
  const navigate = useNavigate();
  const location = useLocation();
  const onHome = location.pathname === '/';
  const { t } = useLanguage();

  const NAV_LINKS = [
    { label: t('nav.home'), href: '#home' },
    { label: t('nav.shop'), href: '#shop' },
    { label: t('nav.ourStory'), href: '#our-story' },
    { label: t('nav.benefits'), href: '#benefits' },
    { label: t('nav.reviews'), href: '#reviews' },
    { label: t('nav.contact'), href: '#contact' },
  ];

  const setActive = (section) => {
    activeSectionRef.current = section;
    setActiveSection(section);
  };

  useEffect(() => {
    let rafId = 0;

    if (!onHome) {
      setActive('');
      return undefined;
    }

    const computeActive = () => {
      let current = '';
      for (const id of SECTION_IDS) {
        const element = document.getElementById(id);
        if (!element) continue;
        if (element.getBoundingClientRect().top <= ACTIVE_OVERLAP) {
          current = id;
        } else {
          break;
        }
      }
      setActive(current || 'home');
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          computeActive();
        });
      }
    };

    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (SECTION_IDS.includes(hash)) {
        setActive(hash);
      }
    };

    computeActive();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('resize', onScroll);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [onHome]);

  const closeMenu = () => setMenuOpen(false);

  const goToSection = (id) => {
    setActive(id);
    closeMenu();
    if (onHome) {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (typeof window !== 'undefined') {
          try {
            history.replaceState(null, '', `#${id}`);
          } catch {
            /* ignore */
          }
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      navigate(`/#${id}`);
    }
  };

  const handleLogoClick = (event) => {
    event.preventDefault();
    closeMenu();
    if (onHome) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActive('home');
      if (typeof window !== 'undefined') {
        try {
          history.replaceState(null, '', '#home');
        } catch {
          /* ignore */
        }
      }
    } else {
      navigate('/');
    }
  };

  return (
    <nav className="navbar-wrapper">
      <div className="navbar">
        <div className="navbar-logo">
          <Link to="/" onClick={handleLogoClick}>
            <img src={logo} alt="JH Soap Logo" />
          </Link>
        </div>

        <ul className={`navbar-links${menuOpen ? ' open' : ''}`}>
          {NAV_LINKS.map((link) => {
            const id = link.href.slice(1);
            const isActive = activeSection === id;
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={isActive ? 'active' : ''}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    goToSection(id);
                  }}
                >
                  {link.label}
                </a>
              </li>
            );
          })}
          <li className="navbar-mobile-lang">
            <LanguageSwitcher />
          </li>
        </ul>

        <div className="navbar-icons">
          <div className="navbar-desktop-lang">
            <LanguageSwitcher />
          </div>
          <AccountMenu />
          <button className="icon-btn cart-btn" onClick={openCart} aria-label={t('common.cart')}>
            <ShoppingCart size={20} strokeWidth={1.5} />
            {totals.unitCount > 0 && <span className="cart-badge">{totals.unitCount}</span>}
          </button>
          <button
            className="icon-btn menu-btn"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? t('common.close') : t('common.openMenu')}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
