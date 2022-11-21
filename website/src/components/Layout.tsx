import type { PropsWithChildren } from 'react';

import Footer from './Footer';
import Header from './Header';

type Props = {};
export default function Layout({ children }: PropsWithChildren<Props>) {
  return (
    <div className="container">
      <Header />
      <main>{children}</main>
      <Footer />
      <style jsx>
        {`
          .container {
            height: 100%;
            display: grid;
            grid-template-rows: auto 1fr auto;
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
