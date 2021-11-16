module.exports = {
  plugins: {
    'postcss-gap-properties': true,
    'postcss-custom-media': true,
    'postcss-math': true,
    'postcss-calc': true,
    autoprefixer: {
      grid: true,
    },
    'postcss-base64': {
      pattern: /<svg.*<\/svg>/i,
      prepend: 'data:image/svg+xml;base64,',
    },
    cssnano: true,
  },
};
