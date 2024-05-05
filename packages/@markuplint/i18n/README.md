# @markuplint/i18n

[![npm version](https://badge.fury.io/js/%40markuplint%2Fi18n.svg)](https://www.npmjs.com/package/@markuplint/i18n)

## Install

[`markuplint`](https://www.npmjs.com/package/markuplint) package includes this package.

<details>
<summary>If you are installing purposely, how below:</summary>

```shell
$ npm install @markuplint/i18n

$ yarn add @markuplint/i18n

```

</details>

## API

```ts
import { translator } from '@markuplint/i18n';

const t = translator({
  locale: 'ja',
  ...require('@markuplint/i18n/locales/ja.json'),
});
```

The `translator` function creates the `t` function.
It is an overloading function that accepts kind of arguments below:

### Translate sentence

```ts
type T = (template?: string, ...values: string[]) => string;
```

```ts
const message = t(
  // Template #1
  '{0} is {1:c}',
  // The {0} value of template #1
  t(
    // Template #2
    '{0} of {1}',
    // The {0} value of template #2
    t(
      // Template #3
      'the {0}',
      // The {0} value of template #3
      'value',
    ),
    // The {1} value of template #2
    t(
      // Template #4
      'the "{0*}" {1}',
      // The {0} value of template #4
      'id',
      // The {1} value of template #4
      'attribute',
    ),
  ),
  // The {1} value of template #1
  'duplicated',
);

console.log(message);
// => 属性「id」の値が重複しています
```

#### Placeholder

There is a placeholder that the number is surrounded by `{}` on template strings. It is replaced argument as a phrase. It translates the phrase if it matches the keyword defined in the dictionary.

#### Tagged templates syntax

:warning: It is experimental.

```ts
import { taggedTemplateTranslator } from '@markuplint/i18n';

const _ = taggedTemplateTranslator({
  locale: 'ja',
  ...require('path/to/dictionary/ja.json'),
});

const message = _`${
  //
  _`${
    //
    _`the ${'value'}`
  } of ${
    //
    _`the "${'id'}" ${'attribute'}`
  }`
} is ${
  //
  'c:duplicated'
}`;

console.log(message);
// => 属性「id」の値が重複しています
```

### Translate a phrase

```ts
type T = (phrase: string) => string;
```

```ts
const phrase = t('element');

console.log(phrase);
// => 要素
```

### Translate listed phrases

```ts
type T = (phrases: string[], useLastSeparator?: boolean) => string;
```

```ts
const list = t(['element', 'attribute', 'value']);

console.log(list);
// => 「要素」「属性」「値」

/* If locale is "en" */
console.log(list);
// => "element", "attribute", "value"
```

```ts
const list = t(['element', 'attribute', 'value'], true);

console.log(list);
// => 「要素」「属性」「値」

/* If locale is "en" */
console.log(list);
// => "element", "attribute" and "value"
```

It converts the character-separated list specified in each locale.

| Locale | Separator            | Before Char                | After Char                  | Last Separator                 |
| ------ | -------------------- | -------------------------- | --------------------------- | ------------------------------ |
| **en** | `, ` (comma + space) | `"` (double quote)         | `"` (double quote)          | `and` (space + chars + space ) |
| **ja** | none (empty string)  | `「` (left corner bracket) | `」` (right corner bracket) | none (empty string)            |

### Avoid translation

The `autocomplete` is defined as `オートコンプリート` in the **JA** dictionary.
However, It avoids translation if the number placeholder includes `*` (asterisk).
It is an effective means if you want a code or a specific name.

```ts
const phrase = t('the "{0}" {1}', 'autocomplete', 'attribute');
console.log(phrase);
// => 属性「オートコンプリート」

const phrase = t('the "{0*}" {1}', 'autocomplete', 'attribute');
console.log(phrase);
// => 属性「autocomplete」
```

Another means is that it surrounds `%` (percentage) to a phrase. It is effective when you use listing.

```ts
const phrase = t('the "{0}" {1}', '%autocomplete%', 'attribute');
console.log(phrase);
// => 属性「autocomplete」

const list = t(['element', '%attribute%', 'value']);
console.log(list);
// => 「要素」「attribute」「値」
```
