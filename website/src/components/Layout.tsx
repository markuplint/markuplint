import type { PropsWithChildren } from 'react';

import { useRouter } from 'next/router';

import Footer from './Footer';
import Header from './Header';

type Props = {};
export default function Layout({ children }: PropsWithChildren<Props>) {
  const { locale } = useRouter();

  return (
    <div className="container">
      <Header />
      {locale === 'ja' && (
        <div className="notice">
          <p>日本語版サイトは作成途中です。現在は個別のルールのページのみ日本語化されています。</p>
        </div>
      )}

      <main>{children}</main>
      <Footer />
      <style jsx>
        {`
          .container {
            height: 100%;
            display: grid;
            grid-template-rows: auto 1fr auto;
          }
          .notice {
            padding: 0 16px;
            background-color: var(--base-color-back);
            font-size: 1rem;
            font-weight: 700;
          }
          main {
            max-width: 680px;
            margin: 3em auto 5em;
            padding: 0 20px;
            position: relative;
            z-index: 0;
          }
        `}
      </style>
    </div>
  );
}
