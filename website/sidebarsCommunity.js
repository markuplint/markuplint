// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  community: [
    {
      type: 'category',
      label: 'Community',
      link: {
        type: 'doc',
        id: 'index',
      },
      items: [
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

module.exports = sidebars;
