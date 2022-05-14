# @markuplint/selector

[![npm version](https://badge.fury.io/js/%40markuplint%2Fselector.svg)](https://www.npmjs.com/package/@markuplint/selector)
[![Build Status](https://travis-ci.org/markuplint/markuplint.svg?branch=main)](https://travis-ci.org/markuplint/markuplint)
[![Coverage Status](https://coveralls.io/repos/github/markuplint/markuplint/badge.svg?branch=main)](https://coveralls.io/github/markuplint/markuplint?branch=main)

## Install

```sh
$ npm install @markuplint/selector

$ yarn add @markuplint/selector
```

## [W3C Selectors](https://www.w3.org/TR/selectors-4/) matcher

Supported selectors and operators:

| Selector Type                                    | Code Example                                                                              | Support |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------- |
| Universal selector                               | `*`                                                                                       | ✅      |
| Type selector                                    | `div`                                                                                     | ✅      |
| ID selector                                      | `#id`                                                                                     | ✅      |
| Class selector                                   | `.class`                                                                                  | ✅      |
| Attribute selector                               | `[data-attr]`                                                                             | ✅      |
| Attribute selector, Exact match                  | `[data-attr=value]`                                                                       | ✅      |
| Attribute selector, Include whitespace separated | `[data-attr~=value]`                                                                      | ✅      |
| Attribute selector, Subcode match                | <code>[data-attr\|=value]</code>                                                          | ✅      |
| Attribute selector, Partial match                | `[data-attr*=value]`                                                                      | ✅      |
| Attribute selector, Forward match                | `[data-attr^=value]`                                                                      | ✅      |
| Attribute selector, Backward match               | `[data-attr$=value]`                                                                      | ✅      |
| Negation pseudo-class                            | `:not(div)`                                                                               | ✅      |
| Matches-Any pseudo-class                         | `:is(div)`                                                                                | ✅      |
| Specificity-adjustment pseudo-class              | `:where(div)`                                                                             | ✅      |
| Relational pseudo-class                          | `:has(div)` `:has(> div)`                                                                 | ✅      |
| Directionality pseudo-class                      | `:dir(ltr)`                                                                               | ❌      |
| Language pseudo-class                            | `:lang(en)`                                                                               | ❌      |
| Hyperlink pseudo-class                           | `:any-link`                                                                               | ❌      |
| Link History pseudo-class                        | `:link` `:visited`                                                                        | ❌      |
| Local link pseudo-class                          | `:local-link`                                                                             | ❌      |
| Target pseudo-class                              | `:target`                                                                                 | ❌      |
| Target container pseudo-class                    | `:target-within`                                                                          | ❌      |
| Reference element pseudo-class                   | `:scope`                                                                                  | ✅      |
| Current-element pseudo-class                     | `:current` `:current(div)`                                                                | ❌      |
| Past pseudo-class                                | `:past`                                                                                   | ❌      |
| Future pseudo-class                              | `:future`                                                                                 | ❌      |
| Interactive pseudo-class                         | `:active` `:hover` `:focus` `:focus-within` `:focus-visible`                              | ❌      |
| Enable and disable pseudo-class                  | `:enable` `:disable`                                                                      | ❌      |
| Mutability pseudo-class                          | `:read-write` `:read-only`                                                                | ❌      |
| Placeholder-shown pseudo-class                   | `:placeholder-shown`                                                                      | ❌      |
| Default-option pseudo-class                      | `:default`                                                                                | ❌      |
| Selected-option pseudo-class                     | `:checked`                                                                                | ❌      |
| Indeterminate value pseudo-class                 | `:indeterminate`                                                                          | ❌      |
| Validity pseudo-class                            | `:valid` `:invalid`                                                                       | ❌      |
| Range pseudo-class                               | `:in-range` `:out-of-range`                                                               | ❌      |
| Optionality pseudo-class                         | `:required` `:optional`                                                                   | ❌      |
| Empty-Value pseudo-class                         | `:blank`                                                                                  | ❌      |
| User-interaction pseudo-class                    | `:user-invalid`                                                                           | ❌      |
| Root pseudo-class                                | `:root`                                                                                   | ✅      |
| Empty pseudo-class                               | `:empty`                                                                                  | ❌      |
| Nth-child pseudo-class                           | `:nth-child(2)` `:nth-last-child(2)` `:first-child` `:last-child` `:only-child`           | ❌      |
| Nth-child pseudo-class (`of El` Syntax)          | `:nth-child(2 of div)` `:nth-last-child(2 of div)`                                        | ❌      |
| Nth-of-type pseudo-class                         | `:nth-of-type(2)` `:nth-last-of-type(2)` `:first-of-type` `:last-of-type` `:only-of-type` | ❌      |
| Nth-col pseudo-class                             | `:nth-col(2)` `:nth-last-col(2)`                                                          | ❌      |
| Pseudo elements                                  | `::before` `::after`                                                                      | ❌      |
| Descendant combinator                            | `div span`                                                                                | ✅      |
| Child combinator                                 | `div > span`                                                                              | ✅      |
| Next-sibling combinator                          | `div + span`                                                                              | ✅      |
| Subsequent-sibling combinator                    | `div ~ span`                                                                              | ✅      |
| Column combinator                                | <code>div \|\| span</code>                                                                | ❌      |
| Multiple selectors                               | `div, span`                                                                               | ✅      |

## Regex Selector

```json
{
  "nodeName": "/^[a-z]+$/",
  "attrName": "/^[a-z]+$/",
  "attrValue": "/^[a-z]+$/"
}
```
