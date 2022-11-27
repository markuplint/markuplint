import clsx from 'clsx';
import React from 'react';

import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  symbol: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Conformance checking',
    symbol: '🚨',
    description: (
      <>
        The markup needs to written valid code. This is important to keep the promise of the standards that do not break
        webpages through each user agent more than your policy. Markuplint can conformance checking given the specs that
        are HTML Standard, WAI-ARIA, and more.
      </>
    ),
  },
  {
    title: 'On Your House Rules',
    symbol: '🛡',
    description: (
      <>
        You may have the house rules on your project or your organization. You can check based on your policy or your
        management. Your application will get high quality because it will be more accessible, more secure, and have
        higher performance depending on your configuration.
      </>
    ),
  },
  {
    title: 'For Designed Structures',
    symbol: '📐',
    description: (
      <>
        Markuplint checks whether to correct the structure of elements made on the design system of your project. It can
        check the relation parent-child of the elements by class name and/or the custom element name.
      </>
    ),
  },
  {
    title: 'Set for each Selector',
    symbol: '🆔',
    description: (
      <>
        Depending on the situation, You may want the part of structures only to apply some rule. Or want it is ignored
        from the rule. If that, Markuplint can that. There are settings to apply in any scope by the selector in the
        spec W3C Selectors.
      </>
    ),
  },
  {
    title: 'Supporting Template Engines',
    symbol: '📝',
    description: (
      <>
        You can use it for other markup languages with plugins. Currently, There are plugins for Pug, JSX(React), Vue,
        Svelte, Astro, PHP, Smarty, eRuby, EJS, Mustache/Handlebars, Nunjucks, and Liquid. And it provides the API that
        creates the plugin for any markup language.
      </>
    ),
  },
  {
    title: 'Source-code Editor Extension',
    symbol: '🧩',
    description: (
      <>
        There is Markuplint extension for Visual Studio Code. We think it is essential that it detects any problems when
        on input. You can use it more easily and quickly than CLI. And it is helpful training in coding HTML for
        beginners.
      </>
    ),
  },
];

function Feature({ title, symbol, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4 margin-vert--md', styles.maxWidth)}>
      <div className="padding-horiz--md">
        <div className={styles.symbol} aria-hidden="true">
          {symbol}
        </div>
        <h3 className="text--center">{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <h2 className="text--center">Main features</h2>
        <div className={clsx('row', styles.center)}>
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
