/* global ReturnType */

import type { PropSidebar } from '@docusaurus/plugin-content-docs';
import type { useDocRouteMetadata as UseDocRouteMetadata } from '@docusaurus/theme-common/lib/internal';
import type { Props } from '@theme/DocPage';

import { useLocation } from '@docusaurus/router';
import DocPageOrigin from '@docusaurus/theme-classic/lib/theme/DocPage';
import { PageMetadata } from '@docusaurus/theme-common';
// @ts-ignore
import { useDocRouteMetadata } from '@docusaurus/theme-common/internal';
import { getOgImgUrl } from '@site/src/utils/getOgImgUrl';
import NotFound from '@theme/NotFound';
import React from 'react';

export default function DocPage(props: Props): JSX.Element {
  const location = useLocation();
  const path = location.pathname;
  const paths = location.pathname.split('/').filter(_ => _);
  const currentDocRouteMetadata: ReturnType<typeof UseDocRouteMetadata> = useDocRouteMetadata(props);
  if (!currentDocRouteMetadata) {
    return <NotFound />;
  }

  const { sidebarItems } = currentDocRouteMetadata;
  const category = !paths[0] ? '' : paths[0] === 'api' ? 'API' : paths[0].replace(/^[a-z]/, $0 => $0.toUpperCase());

  const title = getCurrentPageTitle(path, sidebarItems);
  const image = category ? getOgImgUrl(category, title) : undefined;

  return (
    <>
      <DocPageOrigin {...props} />
      <PageMetadata image={image} />
    </>
  );
}

function getCurrentPageTitle(path: string, sidebarItems: PropSidebar) {
  for (const item of sidebarItems) {
    if ('href' in item) {
      if (t(item.href) === t(path)) {
        return item.label;
      }
    }
    if ('items' in item) {
      const title = getCurrentPageTitle(path, item.items);
      if (title) {
        return title;
      }
    }
  }
  return null;
}

function t(path: string) {
  return path.replace(/\/$/, '');
}
