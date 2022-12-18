import React from 'react';

import styles from './styles.module.css';

type Props = {
  src: string;
  caption: string;
  mode: 'light' | 'dark';
};

export default function LogoContainer({ src, caption, mode }: Props) {
  return (
    <figure className={styles.logoContainer}>
      <div className={styles.logo} data-mode={mode}>
        <img src={src} alt="" />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
