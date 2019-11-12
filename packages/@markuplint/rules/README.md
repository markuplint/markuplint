# @markuplint/rules

[![npm version](https://badge.fury.io/js/%40markuplint%2Frules.svg)](https://www.npmjs.com/package/@markuplint/rules)
[![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=next)](https://travis-ci.org/markuplint/markuplint)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=next)](https://coveralls.io/github/markuplint/markuplint?branch=next)

## Rules

### Validation

| Avaiable | Docs | Docs(ja) | Rule                                                       | Fixable |
| -------- | ---- | -------- | ---------------------------------------------------------- | ------- |
| ✅       | ✅   | ✅       | [attr-duplication](./src/attr-duplication/README.md)       | 🚧      |
| ✅       | ✅   | ✅       | [character-reference](./src/character-reference/README.md) | 🚧      |
| 🚧       | 🚧   | 🚧       | [comment](./src/comment/README.md)                         |
| 🚧       | 🚧   | 🚧       | [deprecated-attr](./src/deprecated-attr/README.md)         |
| ✅       | ✅   | ✅       | [deprecated-element](./src/deprecated-element/README.md)   |
| ✅       | ✅   | ✅       | [doctype](./src/doctype/README.md)                         | 🚧      |
| ✅       | ✅   | ✅       | [id-duplication](./src/id-duplication/README.md)           |
| ✅       | 🚧   | 🚧       | [parse-error](./src/parse-error/README.md)                 |
| ✅       | 🚧   | 🚧       | [permitted-contents](./src/permitted-contents/README.md)   |
| ✅       | ✅   | ✅       | [required-attr](./src/required-attr/README.md)             |

### Accessibility

| Avaiable | Docs | Docs(ja) | Rule                                                                           | Fixable |
| -------- | ---- | -------- | ------------------------------------------------------------------------------ | ------- |
| 🚧       | 🚧   | 🚧       | [accessible-text](./src/accessible-text/README.md)                             |
| 🚧       | 🚧   | 🚧       | [attr-role](./src/permitted-role/README.md)                                    |
| 🚧       | 🚧   | 🚧       | [heading-in-sectioning-content](./src/heading-in-sectioning-content/README.md) |
| 🚧       | 🚧   | 🚧       | [heading-in-sectioning-root](./src/heading-in-sectioning-root/README.md)       |
| 🚧       | 🚧   | 🚧       | [heading-levels-skipping](./src/heading-levels-skipping/README.md)             |
| 🚧       | 🚧   | 🚧       | [labeling-controls](./src/labeling-controls/README.md)                         |
| 🚧       | 🚧   | 🚧       | [landmark-roles](./src/landmark-roles/README.md)                               |
| ✅       | 🚧   | 🚧       | [required-h1](./src/required-h1/README.md)                                     |

### Usability

| Avaiable | Docs | Docs(ja) | Rule                                           | Fixable |
| -------- | ---- | -------- | ---------------------------------------------- | ------- |
| 🚧       | 🚧   | 🚧       | [external-link](./src/external-link/README.md) | 🚧      |

### Structure Design and Naming Convention

| Avaiable | Docs | Docs(ja) | Rule                                                           | Fixable |
| -------- | ---- | -------- | -------------------------------------------------------------- | ------- |
| 🚧       | 🚧   | 🚧       | [class-naming](./src/class-naming/README.md)                   |
| 🚧       | 🚧   | 🚧       | [custom-element-naming](./src/custom-element-naming/README.md) |
| 🚧       | 🚧   | 🚧       | [data-attr-naming](./src/data-attr-naming/README.md)           |
| 🚧       | 🚧   | 🚧       | [required-element](./src/required-element/README.md)           |

### Style

| Avaiable | Docs | Docs(ja) | Rule                                                                 | Fixable |
| -------- | ---- | -------- | -------------------------------------------------------------------- | ------- |
| ✅       | ✅   | ✅       | [attr-equal-space-after](./src/attr-equal-space-after/README.md)     | ✅      |
| ✅       | ✅   | ✅       | [attr-equal-space-before](./src/attr-equal-space-before/README.md)   | ✅      |
| ✅       | ✅   | ✅       | [attr-spacing](./src/attr-spacing/README.md)                         | ✅      |
| ✅       | ✅   | ✅       | [attr-value-quotes](./src/attr-value-quotes/README.md)               | ✅      |
| ✅       | ✅   | ✅       | [case-sensitive-attr-name](./src/case-sensitive-attr-name/README.md) | ✅      |
| ✅       | ✅   | ✅       | [case-sensitive-tag-name](./src/case-sensitive-tag-name/README.md)   | ✅      |
| 🚧       | 🚧   | 🚧       | [comment-spasing](./src/comment-spasing/README.md)                   | 🚧      |
| 🚧       | 🚧   | 🚧       | [event-attr](./src/event-attr/README.md)                             |
| ✅       | ✅   | ✅       | [indentation](./src/indentation/README.md)                           | ✅      |
| 🚧       | 🚧   | 🚧       | [indentation-attr](./src/indentation-attr/README.md)                 | 🚧      |
| 🚧       | 🚧   | 🚧       | [path](./src/path/README.md)                                         |
| 🚧       | 🚧   | ✅       | [self-closing-tag](./src/self-closing-tag/README.md)                 | 🚧      |
| 🚧       | 🚧   | 🚧       | [tag-omission](./src/tag-omission/README.md)                         | 🚧      |

### Performance

| Avaiable | Docs | Docs(ja) | Rule                                                         | Fixable |
| -------- | ---- | -------- | ------------------------------------------------------------ | ------- |
| ✅       | ✅   | ✅       | [async-attr-in-script](./src/async-attr-in-script/README.md) |

## Install

This package is **default** used that dependenced by [`markuplint`](https://www.npmjs.com/package/markuplint/).

Prerequisites: [Node.js](https://nodejs.org) (Version 12.4.0 or later)

```sh
$ npm install @markuplint/rules

$ yarn add @markuplint/rules
```

## Contributing

```
$ git clone git@github.com:markuplint/markuplint.git -b next
$ yarn
$ yarn build
$ yarn test
```

---

Copyright &copy; 2019 markuplint. Unter the MIT License.
