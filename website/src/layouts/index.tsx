import type { PropsWithChildren } from 'react';

import Link from 'next/link';

import Layout from '../components/Layout';
import BasicMeta from '../components/meta/BasicMeta';

export type MetaData = {
  title: string;
  back?: {
    title: string;
    href: string;
  };
  next?: {
    title: string;
    href: string;
  };
};

export default function Index({ children, meta }: PropsWithChildren<{ meta: MetaData }>) {
  const { title, back, next } = meta;
  return (
    <Layout>
      <BasicMeta title={title} />
      <h1>{title}</h1>
      <div>{children}</div>
      {(back || next) && (
        <nav className="step-nav" aria-label="Step">
          <div className="step-nav-back">
            {back && (
              <Link href={`./${back.href}/`}>
                <a href={`./${back.href}/`}>
                  <span>Back:</span>
                  <span>{back.title}</span>
                </a>
              </Link>
            )}
          </div>
          <div className="step-nav-next">
            {next && (
              <Link href={`./${next.href}/`}>
                <a href={`./${next.href}/`}>
                  <span>Next:</span>
                  <span>{next.title}</span>
                </a>
              </Link>
            )}
          </div>
        </nav>
      )}
      <style jsx>
        {`
          .step-nav {
            display: flex;
            justify-content: space-between;
            margin: 2em 0 0;
          }

          .step-nav-back,
          .step-nav-next {
            display: flex;
            flex: 0 1 auto;
          }

          .step-nav-back {
            margin: 0 0.2em 0 0;
          }

          .step-nav-next {
            margin: 0 0 0 0.2em;
            justify-content: flex-end;
          }

          .step-nav a {
            display: block;
            padding: 0.5em 1em;
            background: var(--base-color-front);
            box-shadow: 0 1px 2px 0 var(--shadow);
            color: inherit;
            text-decoration: none;
            border-radius: 3px;
          }

          .step-nav a span {
            display: inline-block;
          }

          .step-nav a span:first-child {
            opacity: 0.8;
            margin: 0 0.3em 0 0;
          }

          .step-nav a span:last-child {
            font-weight: 700;
          }
        `}
      </style>
    </Layout>
  );
}
