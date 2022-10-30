import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useAllPluginInstancesData, usePluginData } from '@docusaurus/useGlobalData';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
        <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/getting-started">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const all = useDocusaurusContext();
  const test = useAllPluginInstancesData('plugin-content-docs');
  const test2 = usePluginData('plugin-content-docs');
  // console.log("usePluginData");
  console.log(all);
  // console.log(test2);
  return (
    <Layout
      title="markuplint - A Linter for All Markup Languages."
      description="Peace of mind in your markup. A Linter for All Markup Languages."
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
