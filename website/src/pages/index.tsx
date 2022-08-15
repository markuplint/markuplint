import Link from 'next/link';
import { useRouter } from 'next/router';

import Footer from '../components/Footer';
import Header from '../components/Header';
import BasicMeta from '../components/meta/BasicMeta';
import { useTranslation } from '../lib/i18n';

export default function Index() {
  const { locale } = useRouter();
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
        {locale === 'ja' && (
          <div className="notice">
            <p>
              日本語版サイトは作成途中です。
              <br />
              現在は個別のルールのページのみ日本語化されています。
            </p>
          </div>
        )}
        <div className="body">
          <section>
            <h2>Conformance checking</h2>
            <p>
              The markup needs to written valid code. This is important to keep the promise of the standards that do not
              break webpages through each user agent more than your policy. markuplint can conformance checking given
              the specs that are HTML Living Standard.
            </p>
          </section>
          <section>
            <h2>On Your House Rules</h2>
            <p>
              You may have the house rules on your project or your organization. You can check based on your policy
              and/or your rules. For example, if you must give the alt attribute to the img element, You should set up
              that rule.
            </p>
          </section>
          <section>
            <h2>For Designed Structures</h2>
            <p>
              markuplint checks whether to correct the structure of elements made on the design system of your project.
              It can check the relation parent-child of the elements by class name and/or the custom element name.
            </p>
          </section>
          <section>
            <h2>Set for each Selector</h2>
            <p>
              Depending on the situation, You may want the part of structures only to apply some rule. Or want it is
              ignored from the rule. If that, markuplint can that. There are settings to apply in any scope by the
              selector in the spec W3C Selectors.
            </p>
          </section>
          <section>
            <h2>Supporting Template Engine</h2>
            <p>
              You can use it for other markup languages with plugins. Currently, There are plugins for Pug, JSX(React),
              Vue, Svelte, Astro, PHP, eRuby, EJS, Mustache/Handlebars, Nunjucks, and Liquid. And it provides the API
              that creates the plugin for any markup language.
            </p>
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
