import Hero from '@site/src/components/Hero';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Layout from '@theme/Layout';
import React from 'react';

export default function Home(): JSX.Element {
  return (
    <Layout
      title="Markuplint - A linter for all markup developers."
      description="Peace of mind in your markup. A linter for all markup developers."
    >
      <Hero tagLine="あなたのマークアップに安寧を" getStarted="はじめる" />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
