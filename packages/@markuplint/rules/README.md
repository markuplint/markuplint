# @markuplint/rules

[![npm version](https://badge.fury.io/js/%40markuplint%2Frules.svg)](https://www.npmjs.com/package/@markuplint/rules)
[![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=main)](https://travis-ci.org/markuplint/markuplint)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=main)](https://coveralls.io/github/markuplint/markuplint?branch=main)

## Rules

### Conformance checking

- [`attr-duplication`](./src/attr-duplication)
- [`character-reference`](./src/character-reference)
- [`deprecated-attr`](./src/deprecated-attr)
- [`deprecated-element`](./src/deprecated-element)
- [`disallowed-element`](./src/disallowed-element)
- [`doctype`](./src/doctype)
- [`id-duplication`](./src/id-duplication)
- [`ineffective-attr`](./src/ineffective-attr)
- [`invalid-attr`](./src/invalid-attr)
- [`permitted-contents`](./src/permitted-contents)
- [`required-attr`](./src/required-attr)
- [`required-element`](./src/required-element)

### Accessibility

- [`landmark-roles`](./src/landmark-roles)
- [`no-refer-to-non-existent-id`](./src/no-refer-to-non-existent-id)
- [`required-h1`](./src/required-h1)
- [`use-list`](./src/use-list)
- [`wai-aria`](./src/wai-aria)

### Naming Convention

- [`class-naming`](./src/class-naming)

### Maintenability

- [`no-hard-code-id`](./src/no-hard-code-id)
- [`no-use-event-handler-attr`](./src/no-use-event-handler-attr)

### Style

- [`attr-equal-space-after`](./src/attr-equal-space-after)
- [`attr-equal-space-before`](./src/attr-equal-space-before)
- [`attr-spacing`](./src/attr-spacing)
- [`attr-value-quotes`](./src/attr-value-quotes)
- [`case-sensitive-attr-name`](./src/case-sensitive-attr-name)
- [`case-sensitive-tag-name`](./src/case-sensitive-tag-name)
- [`end-tag`](./src/end-tag)
- [`indentation`](./src/indentation)
- [`no-boolean-attr-value`](./src/no-boolean-attr-value)
- [`no-default-value`](./src/no-default-value)

## Install

Generally, you **don't have to install** this package because markuplint dependents it defaultly.

```sh
$ npm install -D @markuplint/rules

$ yarn add -D @markuplint/rules
```
