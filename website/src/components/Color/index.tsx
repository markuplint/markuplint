import React from 'react';

import styles from './styles.module.css';

type Props = {
  name: string;
  r: number;
  g: number;
  b: number;
};

export default function Color({ name, r, g, b }: Props) {
  const hex = `#${r.toString(16).toUpperCase()}${g.toString(16).toUpperCase()}${b.toString(16).toUpperCase()}`;
  return (
    <div className={styles.color}>
      <p>{name}</p>
      <figure>
        <div role="img" aria-label={'Colored palette'} className={styles.pallet} style={{ backgroundColor: hex }}></div>
        <figcaption>
          <dl>
            <div>
              <dt>Hex</dt>
              <dd>{hex}</dd>
            </div>
            <div>
              <dt>R</dt>
              <dd>{r}</dd>
              <dt>G</dt>
              <dd>{g}</dd>
              <dt>B</dt>
              <dd>{b}</dd>
            </div>
          </dl>
        </figcaption>
      </figure>
    </div>
  );
}
