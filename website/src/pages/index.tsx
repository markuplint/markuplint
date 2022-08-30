import Link from 'next/link';

import Footer from '../components/Footer';
import Header from '../components/Header';
import BasicMeta from '../components/meta/BasicMeta';
import { useTranslation } from '../lib/i18n';

export default function Index() {
  const { t } = useTranslation();

  return (
    <>
      <BasicMeta
        title="markuplint - A Linter for All Markup Languages."
        description="Peace of mind in your markup. A Linter for All Markup Languages."
      />
      <Header />
      <main>
        <div className="hero">
          <h1>markuplint</h1>
          <h2>{t('Peace of mind in your markup')}</h2>
          <Link href="/getting-started" passHref>
            <a>{t('Get Started')}</a>
          </Link>
        </div>
        <div className="body">
          <section>
            <h2>{t('Conformance checking')}</h2>
            <p>{t('[Conformance checking]__body')}</p>
          </section>
          <section>
            <h2>{t('On Your House Rules')}</h2>
            <p>{t('[On Your House Rules]__body')}</p>
          </section>
          <section>
            <h2>{t('For Designed Structures')}</h2>
            <p>{t('[For Designed Structures]__body')}</p>
          </section>
          <section>
            <h2>{t('Set for each Selector')}</h2>
            <p>{t('[Set for each Selector]__body')}</p>
          </section>
          <section>
            <h2>{t('Supporting Template Engine')}</h2>
            <p>{t('[Supporting Template Engine]__body')} </p>
          </section>
        </div>
      </main>
      <Footer />
      <style jsx>
        {`
          .hero {
            position: relative;
            z-index: 0;
            color: #fff;
            background: var(--main-color) url('/img/hero.jpg');
            background-position: right top;
            background-size: cover;
            padding: 10px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 300px;
          }

          @media (min-resolution: 2dppx) {
            .hero {
              background-image: url('/img/hero@2x.jpg');
            }
          }

          .hero::before {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            background: #000;
            opacity: 0.1;
          }

          @media (prefers-color-scheme: dark) {
            .hero::before {
              opacity: 0.7;
            }
          }

          .hero h1 {
            margin: 0.5em;
            padding: 0;
            position: relative;
            z-index: 1;
          }

          .hero h2 {
            margin: 0.5em;
            padding: 0;
            font-weight: 300;
            position: relative;
            z-index: 1;
          }

          .hero a {
            color: #fff;
            background: var(--main-color-dark);
            text-decoration: none;
            padding: 0.5em 1em;
            margin: 1em;
            font-weight: 700;
            border-radius: 3px;
            box-shadow: 0 1px 5px 0 var(--shadow);
            display: inline-block;
            position: relative;
            z-index: 1;
          }

          .notice {
            padding: 8px 16px;
            background-color: var(--base-color-back);
            font-size: 1.2rem;
            font-weight: 700;
          }

          .body {
            max-width: 680px;
            padding: 20px;
            margin: 0 auto;
          }
        `}
      </style>
    </>
  );
}
