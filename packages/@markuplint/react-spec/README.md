# @markuplint/react-spec

[![npm version](https://badge.fury.io/js/%40markuplint%2Freact-spec.svg)](https://www.npmjs.com/package/@markuplint/react-spec)

Use **markuplint** with [**React**](https://reactjs.org/).
Add React specific elements and attributes to the schema.

## Install

```shell
$ npm install -D @markuplint/react-spec

$ yarn add -D @markuplint/react-spec
```

## Usage

Add `specs` option to your [configuration](https://markuplint.dev/configuration/#properties/specs).

```json
{
  "specs": {
    ".[jt]sx?$": "@markuplint/react-spec"
  }
}
```

React moves `<title>`, `<meta>`, `<link>` and `<style>` (under the conditions its reference gives) to the `<head>` wherever they are written, so this spec does not check them against the content model of the element that contains them, and it defines the attributes that ask React to (`precedence` and `href` of `<style>`, `precedence` of `<link>`).

If your React outputs every element where it is written (the reference of each element on react.dev says whether the React you use moves it), specify `@markuplint/react-spec/react-18`, which has neither. It is named for the last major version of React that does not move them.

```json
{
  "specs": {
    ".[jt]sx?$": "@markuplint/react-spec/react-18"
  }
}
```
