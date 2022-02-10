# @markuplint/rule-textlint

The rule [`textlint`](https://github.com/textlint/textlint) for HTML, Vue and so on markup languages.

[![npm version](https://badge.fury.io/js/%40markuplint%2Frule-textlint.svg)](https://www.npmjs.com/package/@markuplint/rule-textlint)
[![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=main)](https://travis-ci.org/markuplint/markuplint)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=main)](https://coveralls.io/github/markuplint/markuplint?branch=main)

## Install

```sh
$ npm install -D @markuplint/rule-textlint

$ yarn add -D @markuplint/rule-textlint
```

## Usage

### Example

```sh
$ yarn add -D textlint-rule-prh
```

#### Load `.textlintrc.*` config automatically

```json
// `.markuplintrc`
{
  "rules": {
    "textlint": true
  }
}
```

```json
// `.textlintrc`
{
  // `html` plugin will be used automatically by `markuplint`
  // but make sure to enable it manually
  // if you are using `textlint` as cli at the same time
  // "plugins": ["html"],
  "rules": {
    "prh": {
      "rulePaths": ["../prh.yml"]
    }
  }
}
```

#### Use independent textlint config

```js
// `markuplint.config.js`
const path = require('path');

module.exports = {
  rules: {
    textlint: {
      option: {
        rules: [
          {
            ruleId: 'prh',
            rule: require('textlint-rule-prh'),
            options: {
              rulePaths: [path.resolve(__dirname, '../', 'prh.yml')],
            },
          },
        ],
      },
    },
  },
};
```
