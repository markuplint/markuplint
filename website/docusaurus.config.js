// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

/* eslint-disable @typescript-eslint/no-var-requires */
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
  trailingSlash: true,
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
          srcDark: 'img/logo-horizontal.svg#d',
          width: 171,
          height: 32,
        },
        items: [
          {
            type: 'doc',
            docId: 'getting-started',
            position: 'left',
            label: 'Getting Started',
          },
          {
            type: 'doc',
            docId: 'rules',
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
            docId: 'api-docs',
            position: 'left',
            label: 'API',
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
      algolia: {
        appId: 'SIO9QLVJBB', // cspell:disable-line
        apiKey: '9c005a1976113e7cb45e7dd417d8eb0f',
        indexName: 'markuplint',
        // See: https://discourse.algolia.com/t/algolia-searchbar-is-not-working-with-docusaurus-v2/14659
        contextualSearch: false,
      },
    }),
};

module.exports = config;
