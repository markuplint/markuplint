import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  community: [
    {
      type: 'category',
      label: 'Community',
      link: {
        type: 'doc',
        id: 'index',
      },
      items: [
        'code-of-conduct',
        'contributing',
        'branding',
        {
          type: 'link',
          label: 'Store',
          href: 'https://suzuri.jp/markuplint',
        },
      ],
    },
  ],
};

export default sidebars;
