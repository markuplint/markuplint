import clsx from 'clsx';
import React from 'react';

import styles from './styles.module.css';

export default function FileTree({ children }: React.PropsWithChildren) {
  return <pre className={clsx('thin-scrollbar', styles.fileTree)}>{children}</pre>;
}
