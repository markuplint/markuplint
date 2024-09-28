# @markuplint/rule-textlint

[![npm version](https://badge.fury.io/js/%40markuplint%2Frule-textlint.svg)](https://www.npmjs.com/package/@markuplint/rule-textlint)

The rule plugin that adapts [**textlint**](https://github.com/textlint/textlint) in **markuplint**

## Install

```shell
$ npm install -D @markuplint/rule-textlint
```

## Usage

### Example

```shell
$ npm install -D textlint-rule-prh
```

#### Load `.textlintrc.*` config automatically

```json .markuplintrc
{
  "rules": {
    "textlint": true
  }
}
```

```json .textlintrc
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

```js markuplint.config.js
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Prh from 'textlint-rule-prh';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  rules: {
    textlint: {
      options: {
        rules: [
          {
            ruleId: 'prh',
            rule: Prh,
            options: {
              rulePaths: [path.resolve(__dirname, '..', 'prh.yml')],
            },
          },
        ],
      },
    },
  },
};
```
