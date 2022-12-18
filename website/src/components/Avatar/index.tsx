import React from 'react';

import styles from './styles.module.css';

type Props = {
  src: string;
  alt: string;
};

export default function Avatar({ src, alt }: Props) {
  return (
    <div className={styles.avatar}>
      <img src={src} alt={alt} width="1" height="1" />
    </div>
  );
}
