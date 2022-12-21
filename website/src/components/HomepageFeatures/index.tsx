import clsx from 'clsx';
import React from 'react';

import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  symbol: string;
  description: JSX.Element;
};

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

type Props = {
  heading: string;
  features: FeatureItem[];
};

export default function HomepageFeatures(props: Props): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <h2 className="text--center">{props.heading}</h2>
        <div className={clsx('row', styles.center)}>
          {props.features.map((featrue, idx) => (
            <Feature key={idx} {...featrue} />
          ))}
        </div>
      </div>
    </section>
  );
}
