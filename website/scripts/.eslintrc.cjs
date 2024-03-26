module.exports = {
  rules: {
    'no-console': 0,
    'no-restricted-globals': 0,
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx', '**/*.mts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        sourceType: 'module',
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
    },
  ],
};
