/* global ReturnType */

import type { PropSidebar } from '@docusaurus/plugin-content-docs';
import type { useDocRouteMetadata as UseDocRouteMetadata } from '@docusaurus/theme-common/lib/internal';
import type { Props } from '@theme/DocPage';

import { useLocation } from '@docusaurus/router';
import DocPageOrigin from '@docusaurus/theme-classic/lib/theme/DocPage';
import { PageMetadata } from '@docusaurus/theme-common';
// @ts-ignore
import { useDocRouteMetadata } from '@docusaurus/theme-common/internal';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { getOgImgUrl } from '@site/src/utils/getOgImgUrl';
import NotFound from '@theme/NotFound';
import React from 'react';

export default function DocPage(props: Props): JSX.Element {
  const { i18n } = useDocusaurusContext();
  const location = useLocation();
  const path = location.pathname;
  const currentDocRouteMetadata: ReturnType<typeof UseDocRouteMetadata> = useDocRouteMetadata(props);
  if (!currentDocRouteMetadata) {
    return <NotFound />;
  }

  const { sidebarItems } = currentDocRouteMetadata;
  const category = getCategory(location.pathname, i18n.currentLocale);

  const title = getCurrentPageTitle(path, sidebarItems);
  const image = category ? getOgImgUrl(category, title, i18n.currentLocale) : undefined;

  return (
    <>
      <DocPageOrigin {...props} />
      <PageMetadata image={image} />
    </>
  );
}

function getCategory(pathname: string, lang = 'default') {
  const paths = pathname.split('/').filter(_ => _);
  const depth = lang === 'default' ? 0 : 1;
  const category = !paths[depth]
    ? ''
    : paths[depth] === 'api'
    ? 'API'
    : paths[depth]?.replace(/^[a-z]/, $0 => $0.toUpperCase());
  return category;
}

function getCurrentPageTitle(path: string, sidebarItems?: PropSidebar) {
  if (!sidebarItems) {
    return null;
  }
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
