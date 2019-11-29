# @markuplint/rules

[![npm version](https://badge.fury.io/js/%40markuplint%2Frules.svg)](https://www.npmjs.com/package/@markuplint/rules)
[![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=next)](https://travis-ci.org/markuplint/markuplint)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=next)](https://coveralls.io/github/markuplint/markuplint?branch=next)

## Rules

### Validation

| Avaiable | Docs | Docs(ja) | Rule                                              | Fixable |
| -------- | ---- | -------- | ------------------------------------------------- | ------- |
| ✅       | ✅   | ✅       | [attr-duplication](./src/attr-duplication/)       | 🚧      |
| ✅       | ✅   | ✅       | [character-reference](./src/character-reference/) | 🚧      |
| 🚧       | 🚧   | 🚧       | [comment](./src/comment/)                         |
| 🚧       | 🚧   | 🚧       | [deprecated-attr](./src/deprecated-attr/)         |
| ✅       | ✅   | ✅       | [deprecated-element](./src/deprecated-element/)   |
| ✅       | ✅   | ✅       | [doctype](./src/doctype/)                         | 🚧      |
| ✅       | ✅   | ✅       | [id-duplication](./src/id-duplication/)           |
| ✅       | 🚧   | 🚧       | [parse-error](./src/parse-error/)                 |
| ✅       | 🚧   | 🚧       | [permitted-contents](./src/permitted-contents/)   |
| ✅       | ✅   | ✅       | [required-attr](./src/required-attr/)             |

### Accessibility

| Avaiable | Docs | Docs(ja) | Rule                                                                  | Fixable |
| -------- | ---- | -------- | --------------------------------------------------------------------- | ------- |
| 🚧       | 🚧   | 🚧       | [accessible-text](./src/accessible-text/)                             |
| 🚧       | 🚧   | 🚧       | [attr-role](./src/permitted-role/)                                    |
| 🚧       | 🚧   | 🚧       | [heading-in-sectioning-content](./src/heading-in-sectioning-content/) |
| 🚧       | 🚧   | 🚧       | [heading-in-sectioning-root](./src/heading-in-sectioning-root/)       |
| 🚧       | 🚧   | 🚧       | [heading-levels-skipping](./src/heading-levels-skipping/)             |
| 🚧       | 🚧   | 🚧       | [labeling-controls](./src/labeling-controls/)                         |
| 🚧       | 🚧   | 🚧       | [landmark-roles](./src/landmark-roles/)                               |
| ✅       | 🚧   | 🚧       | [required-h1](./src/required-h1/)                                     |

### Usability

| Avaiable | Docs | Docs(ja) | Rule                                  | Fixable |
| -------- | ---- | -------- | ------------------------------------- | ------- |
| 🚧       | 🚧   | 🚧       | [external-link](./src/external-link/) | 🚧      |

### Structure Design and Naming Convention

| Avaiable | Docs | Docs(ja) | Rule                                                  | Fixable |
| -------- | ---- | -------- | ----------------------------------------------------- | ------- |
| ✅       | 🚧   | 🚧       | [class-naming](./src/class-naming/)                   |
| 🚧       | 🚧   | 🚧       | [custom-element-naming](./src/custom-element-naming/) |
| 🚧       | 🚧   | 🚧       | [data-attr-naming](./src/data-attr-naming/)           |
| 🚧       | 🚧   | 🚧       | [required-element](./src/required-element/)           |

### Style

| Avaiable | Docs | Docs(ja) | Rule                                                        | Fixable |
| -------- | ---- | -------- | ----------------------------------------------------------- | ------- |
| ✅       | ✅   | ✅       | [attr-equal-space-after](./src/attr-equal-space-after/)     | ✅      |
| ✅       | ✅   | ✅       | [attr-equal-space-before](./src/attr-equal-space-before/)   | ✅      |
| ✅       | ✅   | ✅       | [attr-spacing](./src/attr-spacing/)                         | ✅      |
| ✅       | ✅   | ✅       | [attr-value-quotes](./src/attr-value-quotes/)               | ✅      |
| ✅       | ✅   | ✅       | [case-sensitive-attr-name](./src/case-sensitive-attr-name/) | ✅      |
| ✅       | ✅   | ✅       | [case-sensitive-tag-name](./src/case-sensitive-tag-name/)   | ✅      |
| 🚧       | 🚧   | 🚧       | [comment-spasing](./src/comment-spasing/)                   | 🚧      |
| 🚧       | 🚧   | 🚧       | [event-attr](./src/event-attr/)                             |
| ✅       | ✅   | ✅       | [indentation](./src/indentation/)                           | ✅      |
| 🚧       | 🚧   | 🚧       | [indentation-attr](./src/indentation-attr/)                 | 🚧      |
| 🚧       | 🚧   | 🚧       | [path](./src/path/)                                         |
| 🚧       | 🚧   | ✅       | [self-closing-tag](./src/self-closing-tag/)                 | 🚧      |
| 🚧       | 🚧   | 🚧       | [tag-omission](./src/tag-omission/)                         | 🚧      |

### Performance

| Avaiable | Docs | Docs(ja) | Rule                                                | Fixable |
| -------- | ---- | -------- | --------------------------------------------------- | ------- |
| ✅       | ✅   | ✅       | [async-attr-in-script](./src/async-attr-in-script/) |

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
