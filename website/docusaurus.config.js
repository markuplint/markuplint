// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const npm2yarn = require('@docusaurus/remark-plugin-npm2yarn');

const { isNextVersion, url, editUrlBase, algoliaIndexName } = require('./config');
const darkCodeTheme = require('./prismDark');
const lightCodeTheme = require('./prismLight');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Markuplint',
  tagline: 'Peace of mind in your markup',
  url: url,
  baseUrl: '/',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',
  onBrokenAnchors: 'throw',
  favicon: 'img/favicon.svg',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ja'],
    localeConfigs: {
      ja: {
        label: '日本語',
      },
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
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
        { name: 'twitter:site', content: '@markuplint' },
      ],
      image: '/img/og-img-general.png',
      navbar: {
        logo: {
          alt: 'Markuplint',
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
            to: '/community',
            position: 'left',
            label: 'Community',
          },
          {
            href: 'https://playground.markuplint.dev/',
            label: 'Playground',
            position: 'left',
          },
          {
            type: 'localeDropdown',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            html: /* html */ `
              <a
                href="https://github.com/markuplint/markuplint"
                target="_blank"
                rel="noopener noreferrer"
                class="iconLink iconLink--github"
                >GitHub</a
              >
            `,
          },
          {
            html: /* html */ `
              <a
                href="https://twitter.com/markuplint"
                target="_blank"
                rel="noopener noreferrer"
                class="iconLink iconLink--twitter"
                >Twitter</a
              >
            `,
          },
        ],
        copyright: `© ${new Date().getFullYear()} Markuplint.`,
      },
      announcementBar: isNextVersion
        ? {
            id: 'announcement-bar--next-version',
            content:
              'THIS WEBSITE EXPOSES INFORMATION OF THE <strong>DEVELOPMENT VERSION</strong>. The current is <a href="https://markuplint.dev">https://markuplint.dev</a> if you want.',
            backgroundColor: 'var(--ifm-color-warning-contrast-background)',
            textColor: 'var(--ifm-color-warning-contrast-foreground)',
            isCloseable: false,
          }
        : undefined,
      prism: {
        additionalLanguages: ['json', 'bash'],
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
      algolia: {
        appId: 'SIO9QLVJBB', // cspell:disable-line
        apiKey: '9c005a1976113e7cb45e7dd417d8eb0f',
        indexName: algoliaIndexName,
      },
    }),

  plugins: [
    [
      'content-docs',
      /** @type {import('@docusaurus/plugin-content-docs').Options} */
      ({
        id: 'community',
        path: 'community',
        routeBasePath: 'community',
        editUrl: `${editUrlBase}/website`,
        sidebarPath: require.resolve('./sidebarsCommunity.js'),
      }),
    ],
    [
      '@docusaurus/plugin-client-redirects',
      /** @type {import('@docusaurus/plugin-client-redirects').Options} */
      ({
        redirects: [
          {
            from: '/getting-started',
            to: '/docs/guides',
          },
          {
            from: '/set-up-rules',
            to: '/docs/guides/applying-rules',
          },
          {
            from: '/setting-for-other-languages',
            to: '/docs/guides/besides-html',
          },
          {
            from: '/cli',
            to: '/docs/guides/cli',
          },
          {
            from: '/api-docs',
            to: '/docs/api',
          },
        ],
        createRedirects(existingPath) {
          const docsDirs = ['/docs/guides', '/docs/rules', '/docs/configuration', '/docs/api'];
          for (const dir of docsDirs) {
            if (existingPath.includes(dir)) {
              return [existingPath.replace('/docs', '')];
            }
          }
          return;
        },
      }),
    ],
  ],
};

module.exports = config;
