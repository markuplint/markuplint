// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

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
          editUrl: ({ docPath, locale }) => {
            const [maybeDir, maybeRule] = docPath.split('/');
            if (maybeDir === 'rules') {
              const ruleName = maybeRule.replace(/\.mdx?/, '');
              return `https://github.com/markuplint/markuplint/tree/dev/packages/@markuplint/rules/src/${ruleName}/README${
                locale !== 'en' ? `.${locale}` : ''
              }.md`;
            } else {
              if (locale === 'en') {
                return `https://github.com/markuplint/markuplint/tree/dev/website/docs/${docPath}`;
              } else {
                return `https://github.com/markuplint/markuplint/tree/dev/website/i18n/ja/docusaurus-plugin-content-docs/current/${docPath}`;
              }
            }
          },
          // editLocalizedFiles: true,
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
          srcDark: 'img/logo-horizontal-dark.svg',
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
    }),
};

module.exports = config;
