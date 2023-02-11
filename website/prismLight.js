const lightTheme = require('prism-react-renderer/themes/vsLight');

module.exports = {
  ...lightTheme,

  // Plain text
  plain: {
    color: 'var(--ifm-color-content)',
    backgroundColor: 'rgb(200, 205, 210, 0.05)',
  },
  styles: [
    ...lightTheme.styles,

    // HTML
    {
      types: ['tag'],
      style: { color: 'var(--code-color-blue-dark)' },
    },
    {
      types: ['attr-name'],
      style: { color: 'var(--code-color-sky-dark)' },
    },
    {
      types: ['attr-value'],
      style: { color: 'var(--code-color-red-dark)' },
    },

    // CSS
    {
      types: ['atrule', 'rule', 'keyword'],
      style: { color: 'var(--code-color-purple-dark)' },
    },
    {
      types: ['color', 'unit', 'number'],
      style: { color: 'var(--ifm-color-content)' },
    },

    // General
    {
      types: ['comment'],
      style: { color: 'var(--code-color-lime-dark)' },
    },
    {
      types: ['punctuation', 'operator', 'combinator'],
      style: { color: 'var(--ifm-color-content)' },
    },
    {
      types: ['script', 'constant', 'property', 'key'],
      style: { color: 'var(--code-color-sky-dark)' },
    },
    {
      types: ['string'],
      style: { color: 'var(--code-color-red-dark)' },
    },
    {
      types: ['regex'],
      style: { color: 'var(--code-color-pink-dark)' },
    },
    {
      types: ['builtin', 'boolean'],
      style: { color: 'var(--code-color-blue-dark)' },
    },
    {
      types: ['class-name', 'maybe-class-name'],
      style: { color: 'var(--code-color-green-dark)' },
    },
    {
      types: ['function'],
      style: { color: 'var(--code-color-yellow-dark)' },
    },
  ],
};
