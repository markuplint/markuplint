import type { Props } from '@theme/Layout';

import { useLocation } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import OgImg from '@site/src/components/OgImg';
import Layout from '@theme-original/Layout';
import React from 'react';

export default function LayoutWrapper(props: Props) {
  const { i18n } = useDocusaurusContext();
  const location = useLocation();
  const isFrontPage =
    location.pathname === (i18n.currentLocale === i18n.defaultLocale ? '/' : `/${i18n.currentLocale}/`);
  return (
    <>
      {
        // For JSX pages
        !isFrontPage && props.title && <OgImg title={props.title} />
      }
      <Layout {...props} />
    </>
  );
}
