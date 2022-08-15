import Link from 'next/link';
import { memo } from 'react';

import { useTranslation } from '../lib/i18n';

import Logo from './Logo';

type Props = {
  isHome?: boolean;
};
export default memo(({ isHome = false }: Props) => {
  const { t } = useTranslation();

  return (
    <>
      <header>
        {isHome ? (
          <div>
            <Logo />
          </div>
        ) : (
          <div>
            <Link href="/" passHref>
              <a>
                <Logo />
              </a>
            </Link>
          </div>
        )}
        <nav aria-label="main menu">
          <ul>
            <li>
              <Link href="/getting-started" passHref>
                <a>{t('Getting Started')}</a>
              </Link>
            </li>
            <li>
              <Link href="/rules" passHref>
                <a>{t('Rules')}</a>
              </Link>
            </li>
            <li>
              <Link href="/configuration" passHref>
                <a>{t('Configuration')}</a>
              </Link>
            </li>
            <li>
              <Link href="/api-docs" passHref>
                <a>
                  <abbr title="Application Programming Interface">{t('API')}</abbr>
                </a>
              </Link>
            </li>
            <li>
              <a href="https://playground.markuplint.dev">{t('Playground')}</a>
            </li>
          </ul>
        </nav>
      </header>
      <style jsx>{`
        header {
          background: var(--base-color-front);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          padding: 1em;
          box-shadow: 0 0 5px 0 var(--shadow);
          position: relative;
          z-index: 10;
        }

        h1 {
          flex: 0 0 auto;
          margin: 0;
          padding: 0;
          font-size: inherit;
        }

        nav {
          flex: 1 1 auto;
        }

        nav ul {
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: flex-end;
          list-style: none;
        }

        nav li {
          margin: 0 0.5em;
          padding: 0;
          display: block;
        }

        a {
          display: block;
          color: inherit;
          text-decoration: none;
          white-space: nowrap;
        }

        abbr {
          text-decoration: none;
        }

        @media (max-width: calc(780 / 16 * 1em)) {
          header {
            padding: 0;
          }

          header > div,
          h1 {
            padding: 1em;
          }

          nav {
            overflow: auto;
          }

          nav ul {
            padding: 0 0.5em 1em;
            justify-content: flex-start;
          }

          nav ul::after {
            content: '';
            display: block;
            flex: 0 0 0.5em;
          }
        }
      `}</style>
    </>
  );
});
