// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

/* eslint-disable @typescript-eslint/no-var-requires */
const npm2yarn = require('@docusaurus/remark-plugin-npm2yarn');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');
const lightCodeTheme = require('prism-react-renderer/themes/github');

const { editUrlBase } = require('./config');
/* eslint-enable @typescript-eslint/no-var-requires */

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'markuplint',
  tagline: 'Peace of mind in your markup',
  url: 'https://markuplint.dev',
  baseUrl: '/',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.svg',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ja'],
    localeConfigs: {
      ja: {
        label: '日本語（ベータ）',
      },
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          path: 'docs',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: `${editUrlBase}/website`,
          editLocalizedFiles: true,
          remarkPlugins: [[npm2yarn, { sync: true }]],
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      metadata: [
        { name: 'theme-color', content: '#fff' },
        { property: 'og:type', content: 'website' },
        {
          property: 'og:image',
          content: 'https://repository-images.githubusercontent.com/104835801/27437480-da03-11e9-8504-c8407b7d9a13',
        },
        { name: 'twitter:site', content: '@markuplint' },
      ],
      navbar: {
        logo: {
          alt: 'markuplint',
          src: 'img/logo-horizontal.svg',
          srcDark: 'img/logo-horizontal.svg#sd',
          width: 171,
          height: 32,
        },
        items: [
          {
            type: 'doc',
            docId: 'guides/index',
            position: 'left',
            label: 'Guides',
          },
          {
            type: 'doc',
            docId: 'rules/index',
            position: 'left',
            label: 'Rules',
          },
          {
            type: 'doc',
            docId: 'configuration/index',
            position: 'left',
            label: 'Configuration',
          },
          {
            type: 'doc',
            docId: 'api/index',
            position: 'left',
            label: 'API',
          },
          {
            type: 'doc',
            docId: 'community/index',
            position: 'left',
            label: 'Community',
          },
          {
            href: 'https://playground.markuplint.dev/',
            label: 'Playground',
            position: 'left',
          },
          {
            href: 'https://github.com/markuplint/markuplint',
            position: 'right',
            className: 'iconLink iconLink--github',
            'aria-label': 'GitHub',
          },
          {
            href: 'https://twitter.com/markuplint',
            position: 'right',
            className: 'iconLink iconLink--twitter',
            'aria-label': 'Twitter',
          },
          {
            type: 'localeDropdown',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `© ${new Date().getFullYear()} markuplint.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            to: '/guides/',
            from: '/getting-started',
          },
          {
            to: '/guides/applying-rules/',
            from: '/set-up-rules',
          },
          {
            to: '/guides/besides-html/',
            from: '/setting-for-other-languages',
          },
          {
            to: '/guides/cli/',
            from: '/cli',
          },
          {
            to: '/api/',
            from: '/api-docs',
          },
        ],
      },
    ],
  ],
};

module.exports = config;
