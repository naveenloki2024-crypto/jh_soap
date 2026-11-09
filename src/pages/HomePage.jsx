import Hero from '../components/Hero';
import Shop from '../components/Shop';
import InfoSections from '../components/InfoSections';

/** The storefront home. Sections keep their existing #ids for nav/scroll-spy. */
export default function HomePage() {
  return (
    <main className="page page--home">
      <Hero />
      <Shop />
      <InfoSections />
    </main>
  );
}
