import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Conformance checking',
    description: (
      <>
        The markup needs to written valid code. This is important to keep the promise of the standards that do not break
        webpages through each user agent more than your policy. markuplint can conformance checking given the specs that
        are HTML Living Standard.
      </>
    ),
  },
  {
    title: 'On Your House Rules',
    description: (
      <>
        You may have the house rules on your project or your organization. You can check based on your policy and/or
        your rules. For example, if you must give the alt attribute to the img element, You should set up that rule.
      </>
    ),
  },
  {
    title: 'For Designed Structures',
    description: (
      <>
        markuplint checks whether to correct the structure of elements made on the design system of your project. It can
        check the relation parent-child of the elements by class name and/or the custom element name.
      </>
    ),
  },
  {
    title: 'Set for each Selector',
    description: (
      <>
        Depending on the situation, You may want the part of structures only to apply some rule. Or want it is ignored
        from the rule. If that, markuplint can that. There are settings to apply in any scope by the selector in the
        spec W3C Selectors.
      </>
    ),
  },
  {
    title: 'Supporting Template Engine',
    description: (
      <>
        You can use it for other markup languages with plugins. Currently, There are plugins for Pug, JSX(React), Vue,
        Svelte, Astro, PHP, Smarty, eRuby, EJS, Mustache/Handlebars, Nunjucks, and Liquid. And it provides the API that
        creates the plugin for any markup language.
      </>
    ),
  },
];

function Feature({ title, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
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
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
