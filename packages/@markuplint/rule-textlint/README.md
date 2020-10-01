# @markuplint/rule-textlint

The rule [`textlint`](https://github.com/textlint/textlint) for HTML, Vue and so on markup languages.

[![npm version](https://badge.fury.io/js/%40markuplint%2Frule-textlint.svg)](https://www.npmjs.com/package/@markuplint/rule-textlint)
[![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=master)](https://travis-ci.org/markuplint/markuplint)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=master)](https://coveralls.io/github/markuplint/markuplint?branch=master)

## Install

```sh
$ npm install @markuplint/rule-textlint

$ yarn add @markuplint/rule-textlint
```

## Usage

### Example

```sh
$ yarn add -D textlint-rule-prh
```

`markuplint.config.js`

```js
const path = reuqire('path');

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

## Contributing

```
$ git clone git@github.com:markuplint/markuplint.git -b master
$ yarn
$ yarn build
$ yarn test
```

---

Copyright &copy; 2020 markuplint. Under the MIT License.
