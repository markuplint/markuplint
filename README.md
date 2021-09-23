# ![markuplint](https://cdn.rawgit.com/YusukeHirao/markuplint/HEAD/media/logo-v.svg)

[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)
[![Test](https://github.com/markuplint/markuplint/workflows/Test/badge.svg?branch=main)](https://github.com/markuplint/markuplint/actions?query=workflow%3ATest)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fmarkuplint%2Fmarkuplint.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fmarkuplint%2Fmarkuplint?ref=badge_shield)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=main)](https://coveralls.io/github/markuplint/markuplint?branch=main)
[![Gitter](https://badges.gitter.im/markuplint/community.svg)](https://gitter.im/markuplint/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

Peace of mind in your markup - A Linter for All Markup Languages.

## Usage

-   [Getting Started](https://markuplint.dev/getting-started)
-   [Rules](https://markuplint.dev/rules)
-   [Configuration](https://markuplint.dev/configuration)
-   [API](https://markuplint.dev/api-docs)
-   [Playground](https://playground.markuplint.dev/)

## Packages

| Package                                                             | NPM                                                                                                                                   | Platform  |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| [`markuplint`](./packages/markuplint)                               | [![npm version](https://badge.fury.io/js/markuplint.svg)](https://badge.fury.io/js/markuplint)                                        | Node.js   |
| [`@markuplint/file-resolver`](./packages/@markuplint/file-resolver) | [![npm version](https://badge.fury.io/js/%40markuplint%2Ffile-resolver.svg)](https://www.npmjs.com/package/@markuplint/file-resolver) | Node.js   |
| [`@markuplint/html-spec`](./packages/@markuplint/html-spec)         | [![npm version](https://badge.fury.io/js/%40markuplint%2Fhtml-spec.svg)](https://badge.fury.io/js/%40markuplint%2Fhtml-spec)          | Universal |
| [`@markuplint/html-parser`](./packages/@markuplint/html-parser)     | [![npm version](https://badge.fury.io/js/%40markuplint%2Fhtml-parser.svg)](https://badge.fury.io/js/%40markuplint%2Fhtml-parser)      | Universal |
| [`@markuplint/i18n`](./packages/@markuplint/i18n)                   | [![npm version](https://badge.fury.io/js/%40markuplint%2Fi18n.svg)](https://badge.fury.io/js/%40markuplint%2Fi18n)                    | Universal |
| [`@markuplint/ml-ast`](./packages/@markuplint/ml-ast)               | [![npm version](https://badge.fury.io/js/%40markuplint%2Fml-ast.svg)](https://badge.fury.io/js/%40markuplint%2Fml-ast)                | Universal |
| [`@markuplint/parser-utils`](./packages/@markuplint/parser-utils)   | [![npm version](https://badge.fury.io/js/%40markuplint%2Fparser-utils.svg)](https://badge.fury.io/js/%40markuplint%2Fparser-utils)    | Universal |
| [`@markuplint/ml-config`](./packages/@markuplint/ml-config)         | [![npm version](https://badge.fury.io/js/%40markuplint%2Fml-config.svg)](https://badge.fury.io/js/%40markuplint%2Fml-config)          | Universal |
| [`@markuplint/ml-core`](./packages/@markuplint/ml-core)             | [![npm version](https://badge.fury.io/js/%40markuplint%2Fml-core.svg)](https://badge.fury.io/js/%40markuplint%2Fml-core)              | Universal |
| [`@markuplint/ml-spec`](./packages/@markuplint/ml-spec)             | [![npm version](https://badge.fury.io/js/%40markuplint%2Fml-spec.svg)](https://badge.fury.io/js/%40markuplint%2Fml-spec)              | Universal |
| [`@markuplint/rules`](./packages/@markuplint/rules)                 | [![npm version](https://badge.fury.io/js/%40markuplint%2Frules.svg)](https://badge.fury.io/js/%40markuplint%2Frules)                  | Universal |

### Plugins

#### Rule plugins

| Package                                                             | NPM                                                                                                                                   | Platform  |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| [`@markuplint/rule-textlint`](./packages/@markuplint/rule-textlint) | [![npm version](https://badge.fury.io/js/%40markuplint%2Frule-textlint.svg)](https://www.npmjs.com/package/@markuplint/rule-textlint) | Universal |

#### Language plugins

| Package                                                                 | NPM                                                                                                                                       | Platform  |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| [`@markuplint/pug-parser`](./packages/@markuplint/pug-parser)           | [![npm version](https://badge.fury.io/js/%40markuplint%2Fpug-parser.svg)](https://www.npmjs.com/package/@markuplint/pug-parser)           | Universal |
| [`@markuplint/jsx-parser`](./packages/@markuplint/jsx-parser)           | [![npm version](https://badge.fury.io/js/%40markuplint%2Fjsx-parser.svg)](https://www.npmjs.com/package/@markuplint/jsx-parser)           | Universal |
| [`@markuplint/react-spec`](./packages/@markuplint/react-spec)           | [![npm version](https://badge.fury.io/js/%40markuplint%2Freact-spec.svg)](https://www.npmjs.com/package/@markuplint/react-spec)           | Universal |
| [`@markuplint/vue-parser`](./packages/@markuplint/vue-parser)           | [![npm version](https://badge.fury.io/js/%40markuplint%2Fvue-parser.svg)](https://www.npmjs.com/package/@markuplint/vue-parser)           | Universal |
| [`@markuplint/vue-spec`](./packages/@markuplint/vue-spec)               | [![npm version](https://badge.fury.io/js/%40markuplint%2Fvue-spec.svg)](https://www.npmjs.com/package/@markuplint/vue-spec)               | Universal |
| [`@markuplint/svelte-parser`](./packages/@markuplint/svelte-parser)     | [![npm version](https://badge.fury.io/js/%40markuplint%2Fsvelte-parser.svg)](https://www.npmjs.com/package/@markuplint/svelte-parser)     | Universal |
| [`@markuplint/astro-parser`](./packages/@markuplint/astro-parser)       | [![npm version](https://badge.fury.io/js/%40markuplint%2Fastro-parser.svg)](https://www.npmjs.com/package/@markuplint/astro-parser)       | Universal |
| [`@markuplint/php-parser`](./packages/@markuplint/php-parser)           | [![npm version](https://badge.fury.io/js/%40markuplint%2Fphp-parser.svg)](https://www.npmjs.com/package/@markuplint/php-parser)           | Universal |
| [`@markuplint/erb-parser`](./packages/@markuplint/erb-parser)           | [![npm version](https://badge.fury.io/js/%40markuplint%2Ferb-parser.svg)](https://www.npmjs.com/package/@markuplint/erb-parser)           | Universal |
| [`@markuplint/ejs-parser`](./packages/@markuplint/ejs-parser)           | [![npm version](https://badge.fury.io/js/%40markuplint%2Fejs-parser.svg)](https://www.npmjs.com/package/@markuplint/ejs-parser)           | Universal |
| [`@markuplint/mustache-parser`](./packages/@markuplint/mustache-parser) | [![npm version](https://badge.fury.io/js/%40markuplint%2Fmustache-parser.svg)](https://www.npmjs.com/package/@markuplint/mustache-parser) | Universal |
| [`@markuplint/nunjucks-parser`](./packages/@markuplint/nunjucks-parser) | [![npm version](https://badge.fury.io/js/%40markuplint%2Fnunjucks-parser.svg)](https://www.npmjs.com/package/@markuplint/nunjucks-parser) | Universal |
| [`@markuplint/liquid-parser`](./packages/@markuplint/liquid-parser)     | [![npm version](https://badge.fury.io/js/%40markuplint%2Fliquid-parser.svg)](https://www.npmjs.com/package/@markuplint/liquid-parser)     | Universal |

## Editor Extensions

| Editor                                                                                                                                                                                 | Page                                                                                                    | Author                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| <a href="https://marketplace.visualstudio.com/items?itemName=yusukehirao.vscode-markuplint"><img src="media/vscode.png" width="75" alt="Visual Studio Code: markuplint extension"></a> | [Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=yusukehirao.vscode-markuplint) | [@YusukeHirao](https://github.com/YusukeHirao) |
| <a href="https://github.com/heavenshell/vim-markuplint"><img src="media/vim.png" width="75" alt="Vim: markuplint plugin"></a>                                                          | [Vim](https://github.com/heavenshell/vim-markuplint) (Not support v1.x yet)                             | [@heavenshell](https://github.com/heavenshell) |

## Other Tools

-   [gulp-markuplint](https://github.com/oro-oss/gulp-markuplint) (Not support v1.x yet) Author: [@ktsn](https://twitter.com/ktsn)

## License

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fmarkuplint%2Fmarkuplint.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fmarkuplint%2Fmarkuplint?ref=badge_large)

## Sponsors

[:heart: Sponsor](https://github.com/sponsors/markuplint)

### Personal Supporters

[<img width="36" src="https://avatars.githubusercontent.com/u/6581173?v=4" alt="mikimhk"/>](https://github.com/mikimhk)

## Thanks

This linter is inspired by:

-   [HTMLHint](https://htmlhint.com/)
-   [ESLint](https://eslint.org/)
-   [stylelint](https://stylelint.io/)
-   [textlint](https://textlint.github.io/)
