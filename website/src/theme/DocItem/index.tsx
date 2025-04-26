import type { Props } from '@theme/DocItem';

import { useDocsSidebar } from '@docusaurus/plugin-content-docs/client';
import OgImg from '@site/src/components/OgImg';
import DocItem from '@theme-original/DocItem';
import React from 'react';

// For MDX docs
export default function DocItemWrapper(props: Props) {
  const sidebar = useDocsSidebar();
  const sidebarRoot = sidebar?.items[0];
  const category = sidebarRoot && 'label' in sidebarRoot ? sidebarRoot.label : undefined;

  return (
    <>
      <OgImg title={props.content.metadata.title} category={category} />
      <DocItem {...props} />
    </>
  );
}
