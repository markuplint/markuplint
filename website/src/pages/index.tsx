import Hero from '@site/src/components/Hero';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Layout from '@theme/Layout';
import React from 'react';

export default function Home(): JSX.Element {
  return (
    <Layout
      title="Markuplint - An HTML linter for all markup developers."
      description="Peace of mind in your markup. An HTML linter for all markup developers."
    >
      <Hero getStarted="Get Started" rules="See rules" faq="Check FAQ" />
      <main>
        <HomepageFeatures
          heading="Main features"
          features={[
            {
              title: 'Conformance checking',
              symbol: '🚨',
              description: (
                <>
                  The markup needs to written valid code. This is important to keep the promise of the standards that do
                  not break webpages through each user agent. Markuplint can conformance checking given the specs that
                  are HTML Standard, WAI-ARIA, and more.
                </>
              ),
            },
            {
              title: 'On Your House Rules',
              symbol: '🛡',
              description: (
                <>
                  You may have the house rules on your project or your organization. You can check based on your policy
                  or your management. Your application will get high quality because it will be more accessible, more
                  secure, and have higher performance depending on your configuration.
                </>
              ),
            },
            {
              title: 'For Designed Structures',
              symbol: '📐',
              description: (
                <>
                  Markuplint can check whether components made on the design system of your project are used correctly.
                  It checks attributes, properties, and the relationship that the parent-child of the elements. The
                  design system must be robust.
                </>
              ),
            },
            {
              title: 'Applying by selector',
              symbol: '🆔',
              description: (
                <>
                  Depending on the situation, you probably want to apply to some element. Or want to ignore some.
                  Markuplint has features that select some and apply by CSS Selector, Regular Expression Selector, and
                  more.
                </>
              ),
            },
            {
              title: 'Supporting Template Engines',
              symbol: '📝',
              description: (
                <>
                  Markuplint can evaluate it for syntaxes and template engines besides HTML through plugins. There are
                  plugins for Pug, JSX(React), Vue, Svelte, Astro, Alpine.js, HTMX, PHP, Smarty, eRuby, EJS,
                  Mustache/Handlebars, Nunjucks, and Liquid. And it also provides the API that creates the plugin for
                  the syntax you want.
                </>
              ),
            },
            {
              title: 'Source-code Editor Extension',
              symbol: '🧩',
              description: (
                <>
                  There is Markuplint Extension for Visual Studio Code. We think it is essential that it detects any
                  problems when on input. Because you can recognize problems more easily and quickly than CLI. And that
                  is helpful training to code HTML for beginners.
                </>
              ),
            },
          ]}
        />
      </main>
    </Layout>
  );
}
