import React from 'react';

import styles from './styles.module.css';

type Props = {
  colWidth?: number;
  vertical?: boolean;
};

export default function Grid({ colWidth, vertical, children }: React.PropsWithChildren<Props>) {
  return vertical ? (
    <div className={styles.vertical}>{children}</div>
  ) : colWidth ? (
    <div className={styles.grid} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${colWidth}, 1fr))` }}>
      {children}
    </div>
  ) : (
    <div className={styles.flex}>{children}</div>
  );
}
