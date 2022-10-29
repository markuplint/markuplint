/**
 * @type {import("next").NextConfig}
 */
module.exports = {
  pageExtensions: ['tsx'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  i18n: {
    locales: ['en', 'ja'],
    defaultLocale: 'en',
    localeDetection: false,
  },
};
