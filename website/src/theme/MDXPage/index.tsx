import type { Props } from '@theme/MDXPage';

import OgImg from '@site/src/components/OgImg';
import MDXPage from '@theme-original/MDXPage';
import React from 'react';

// For MDX pages
export default function MDXPageWrapper(props: Props) {
  return (
    <>
      <OgImg title={props.content.metadata.title} />
      <MDXPage {...props} />
    </>
  );
}
