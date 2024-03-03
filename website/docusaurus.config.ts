import type { Options as ClientRedirectsOptions } from '@docusaurus/plugin-client-redirects';
import type { Options as DocsOptions } from '@docusaurus/plugin-content-docs';
import type { Options as PresetOptions, ThemeConfig as PresetThemeConfig } from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';

import npm2yarn from '@docusaurus/remark-plugin-npm2yarn';

import { isNextVersion, url, editUrlBase, algoliaIndexName } from './config';
import { prismDark } from './prismDark';
import { prismLight } from './prismLight';
import { codeBlockClassName } from './src/remark/code-block';

const config: Config = {
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
      {
        docs: {
          path: 'docs',
          sidebarPath: './sidebars.ts',
          editUrl: `${editUrlBase}/website`,
          editLocalizedFiles: true,
          remarkPlugins: [[npm2yarn, { sync: true }], codeBlockClassName],
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies PresetOptions,
    ],
  ],

  themeConfig: {
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
        {
          html: /* html */ `
            <a
              href="https://app.netlify.com/sites/markuplint/deploys"
              target="_blank"
              rel="noopener noreferrer"
            ><img src="https://api.netlify.com/api/v1/badges/035f6ffa-ca8d-4071-abe9-ae3a67094302/deploy-status" alt="Netlify Status"></a>
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
      theme: prismLight,
      darkTheme: prismDark,
    },
    algolia: {
      appId: 'SIO9QLVJBB', // cspell:disable-line
      apiKey: '9c005a1976113e7cb45e7dd417d8eb0f',
      indexName: algoliaIndexName,
    },
  } satisfies PresetThemeConfig,

  plugins: [
    [
      'content-docs',
      {
        id: 'community',
        path: 'community',
        routeBasePath: 'community',
        editUrl: `${editUrlBase}/website`,
        sidebarPath: './sidebarsCommunity.ts',
      } satisfies DocsOptions,
    ],
    [
      '@docusaurus/plugin-client-redirects',
      {
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
      } satisfies ClientRedirectsOptions,
    ],
  ],
};

export default config;
