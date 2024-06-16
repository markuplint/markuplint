import React from 'react';

import styles from './styles.module.css';

type Props = {
  src: string;
  caption: string;
  mode: 'light' | 'dark';
  aspectRatio?: `${number}:${number}`;
};

export default function LogoContainer({ src, caption, mode, aspectRatio = '4:3' }: Props) {
  const [width, height] = aspectRatio.split(':').map(Number);
  return (
    <figure className={styles.logoContainer}>
      <div className={styles.logo} data-mode={mode}>
        <img src={src} alt="" width={width} height={height} />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
