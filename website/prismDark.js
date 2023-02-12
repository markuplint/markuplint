const darkTheme = require('prism-react-renderer/themes/vsDark');

module.exports = {
  ...darkTheme,

  // Plain text
  plain: {
    color: 'var(--ifm-color-content)',
    backgroundColor: '#202025',
  },
  styles: [
    ...darkTheme.styles,

    // HTML
    {
      types: ['tag'],
      style: { color: 'var(--code-color-blue-light)' },
    },
    {
      types: ['attr-name'],
      style: { color: 'var(--code-color-sky-light)' },
    },
    {
      types: ['attr-value'],
      style: { color: 'var(--code-color-red-light)' },
    },

    // CSS
    {
      types: ['atrule', 'rule', 'keyword'],
      style: { color: 'var(--code-color-purple-light)' },
    },
    {
      types: ['color', 'unit', 'number'],
      style: { color: 'var(--ifm-color-content)' },
    },

    // General
    {
      types: ['comment'],
      style: { color: 'var(--code-color-lime-light)' },
    },
    {
      types: ['punctuation', 'operator', 'combinator'],
      style: { color: 'var(--ifm-color-content)' },
    },
    {
      types: ['script', 'constant', 'property', 'key'],
      style: { color: 'var(--code-color-sky-light)' },
    },
    {
      types: ['string'],
      style: { color: 'var(--code-color-red-light)' },
    },
    {
      types: ['regex'],
      style: { color: 'var(--code-color-pink-light)' },
    },
    {
      types: ['builtin', 'boolean'],
      style: { color: 'var(--code-color-blue-light)' },
    },
    {
      types: ['class-name', 'maybe-class-name'],
      style: { color: 'var(--code-color-green-light)' },
    },
    {
      types: ['function'],
      style: { color: 'var(--code-color-yellow-light)' },
    },
  ],
};
