import config from '../eslint.config.js';
import reactPlugin from 'eslint-plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// import reactHooks from 'eslint-plugin-react-hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @type {import('eslint').Linter.Config}
 */
const siteConfig = [
  ...config,
  reactPlugin.configs.flat.recommended,
  {
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        React: true,
        JSX: true,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react/display-name': 0,
      'react/prop-types': 0,
      'unicorn/filename-case': 0,
    },
    ignores: [`${__dirname}/build/**/*`, `${__dirname}/.docusaurus/**/*`],
  },
  {
    files: ['**/*.tsx'],
    rules: {
      '@typescript-eslint/prefer-readonly-parameter-types': 0,
      'unicorn/filename-case': [
        0,
        {
          pascalCase: true,
        },
      ],
    },
  },
  {
    files: ['*.js', '**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 0,
      '@typescript-eslint/no-var-requires': 0,
      'no-restricted-globals': 0,
      'unicorn/prefer-module': 0,
    },
  },
];

export default siteConfig;
