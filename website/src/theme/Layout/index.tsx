import type { Props } from '@theme/Layout';

import { useLocation } from '@docusaurus/router';
import OgImg from '@site/src/components/OgImg';
import Layout from '@theme-original/Layout';
import React from 'react';

export default function LayoutWrapper(props: Props) {
  const location = useLocation();

  return (
    <>
      {
        // For JSX pages
        location.pathname !== '/' && props.title && <OgImg title={props.title} />
      }
      <Layout {...props} />
    </>
  );
}
