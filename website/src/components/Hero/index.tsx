import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import React from 'react';

import styles from './styles.module.css';

type Props = {
  tagLine?: string;
  description?: string;
  getStarted: string;
  rules: string;
  faq: string;
};

export default function Hero(props: Props) {
  const { siteConfig } = useDocusaurusContext();
  return (
    <>
      <div className={styles.hero}>
        <div className={styles.heroBody}>
          <h1 className={styles.heroSubtitle}>
            <span className={styles.tagline}>{props.tagLine ?? siteConfig.tagline}</span>{' '}
            <span className={styles.description}>{props.description ?? 'A linter for all markup developers'}</span>
          </h1>
          <div className={styles.buttons}>
            <Link className="button button--primary button--lg" to="/docs/guides/">
              {props.getStarted}
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/rules/">
              {props.rules}
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/guides/faq/">
              {props.faq}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
