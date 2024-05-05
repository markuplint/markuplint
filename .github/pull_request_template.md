Fixes #???

## What is the purpose of this PR?

- [ ] Fix bug
- [ ] Fix typo
- [ ] Update specs
- [ ] Add new rule
- [ ] Add new parser
- [ ] Improve or refactor rules
- [ ] Add a new core feature
- [ ] Improve or refactor core features
- [ ] Update documents
- [ ] Others

### Description

<!-- WRITE A DESCRIPTION -->

## Checklist

Fill out the checks for the applicable purpose.

- [ ] Fix bug
  - [ ] Add the test that can check whether resolved the issue.
- [ ] Update specs
  - [ ] Element
    - [ ] Update **[global attributes](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/html-spec/src/spec-common.attributes.json)**
    - [ ] Update **[content models](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/html-spec/src/spec-common.contents.json)**
    - [ ] Add also ARIA that you explored **ARIA in HTML [Recommendation](https://www.w3.org/TR/html-aria/) and [Editor's draft](https://w3c.github.io/html-aria/)**
  - [ ] Attribute
    - [ ] Update **[global attributes](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/html-spec/src/spec-common.attributes.json)**
    - [ ] Update **[IDL attribute](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/parser-utils/src/idl-attributes.ts)**
- [ ] Add new rule
  - [ ] Add a test
  - [ ] Add a README document
    - [ ] Create an issue that requests translating the doc if you want.
  - [ ] Add to [index](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/rules/src/index.ts)
  - [ ] Add JSON schema to [schema.json](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/rules/schema.json)
  - [ ] Add to [`@markuplint/config-presets`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/config-presets)
    - [ ] And add to [Rulesets of base presets](https://markuplint.dev/docs/guides/presets#rulesets-of-base-presets)
      - [ ] Add to a [doc file](https://github.com/markuplint/markuplint/blob/main/website/docs/guides/presets.md)
      - [ ] Add to a [doc file (ja)](https://github.com/markuplint/markuplint/blob/main/website/i18n/ja/docusaurus-plugin-content-docs/current/guides/presets.md), or create an issue that requests translating the doc if you want.
- [ ] Add new parser
  - [ ] Add a test
    - [ ] Do a test with some parser.
  - [ ] Add to [initializer](https://github.com/markuplint/markuplint/blob/main/packages/markuplint/src/cli/init/create-config.ts)
