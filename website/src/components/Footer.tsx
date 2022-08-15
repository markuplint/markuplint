import type { FormEvent } from 'react';

import { useRouter } from 'next/router';
import { memo, useCallback } from 'react';

import IconGitHub from './IconGitHub';
import IconTwitter from './IconTwitter';

const languages = [
  ['en', '🇺🇸 English (US)'],
  ['ja', '🇯🇵 日本語'],
] as const;

export default memo(() => {
  const { locale, push, asPath } = useRouter();

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const setLocale = e.currentTarget['locale']?.value;
      if (setLocale === locale) {
        return;
      }
      push(asPath, null, { locale: setLocale });
    },
    [locale, asPath, push],
  );

  return (
    <>
      <footer>
        <div className="nav">
          <ul>
            <li>
              <a href="https://github.com/markuplint/markuplint" target="_blank" rel="noreferrer noopener">
                <IconGitHub />
              </a>
            </li>
            <li>
              <a href="https://twitter.com/markuplint" target="_blank" rel="noreferrer noopener">
                <IconTwitter />
              </a>
            </li>
          </ul>
          <form onSubmit={onSubmit}>
            <label>
              <span lang="en">Language</span>
              <select name="locale">
                {languages.map(([code, title]) => (
                  <option key={code} value={code} lang={code} selected={code === locale}>
                    {title}
                  </option>
                ))}
              </select>
            </label>
            <button lang="en">Change</button>
          </form>
        </div>
        <small>&copy; 2022 markuplint.</small>
      </footer>
      <style jsx>{`
        footer {
          background: var(--base-color-back);
          padding: 3em 5em;
        }

        .nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        ul {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        li {
          margin: 0 0.5em;
          padding: 0;
        }

        a {
          color: inherit;
          display: block;
          margin: 0;
          padding: 0;
        }

        form {
          font-size: 0.8em;
          display: flex;
          gap: 0.5em;
          justify-content: flex-end;
          align-items: center;
        }

        label {
          display: flex;
          gap: 0.5em;
          justify-content: flex-end;
          align-items: center;
          font-weight: 700;
        }

        select {
          background: inherit;
          color: inherit;
          padding: 0.5em;
          appearance: none;
          font-weight: 400;
        }

        button {
          color: #fff;
          background: var(--main-color-dark);
          text-decoration: none;
          padding: 0.5em 1em;
          font-weight: 700;
          border-radius: 3px;
          box-shadow: 0 1px 5px 0 var(--shadow);
          display: inline-block;
          position: relative;
          z-index: 1;
          border: 0;
        }

        small {
          font-size: 0.8em;
          display: block;
          padding: 1em 0 0;
          font-size: 1em;
          text-align: center;
        }

        @media (max-width: calc(780 / 16 * 1em)) {
          footer {
            padding: 2em;
          }
        }
      `}</style>
    </>
  );
});
