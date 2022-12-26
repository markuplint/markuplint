/* global ReturnType */

import type { useDocsSidebar as UseDocsSidebar } from '@docusaurus/theme-common/lib/internal';
import type { Props } from '@theme/DocItem';

// @ts-ignore
import { useDocsSidebar } from '@docusaurus/theme-common/internal';
import OgImg from '@site/src/components/OgImg';
import DocItem from '@theme-original/DocItem';
import React from 'react';

// For MDX docs
export default function DocItemWrapper(props: Props) {
  const sidebar: ReturnType<typeof UseDocsSidebar> = useDocsSidebar();
  const sidebarRoot = sidebar?.items[0];
  const category = sidebarRoot && 'label' in sidebarRoot ? sidebarRoot.label : undefined;

  return (
    <>
      <OgImg title={props.content.metadata.title} category={category} />
      <DocItem {...props} />
    </>
  );
}
