---
title: 属性間のスペース
id: attr-spacing
fixable: true
cateogry: style
---

# 属性間のスペース

要素間のスペース・改行の有無や数に対して警告します。

**🔧 Fixable**

## Rule Details

👎 Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<img src="path/to"src="path/to2">
```
<!-- prettier-ignore-end -->

👍 Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<img src="path/to" src="path/to2">
```
<!-- prettier-ignore-end -->

### Setting value

Type: `boolean`

### Options

#### `lineBreak`

Type: `"either" | "always" | "never"`

| value      | default | description                    |
| ---------- | ------- | ------------------------------ |
| `"either"` | ✓       | 改行に関して警告をしません。   |
| `"always"` |         | 改行をしていないと警告します。 |
| `"never"`  |         | 改行をしていると警告します。   |

#### `width`

Type: `number | false`

| value    | default | description                                              |
| -------- | ------- | -------------------------------------------------------- |
| [number] | ✓ `1`   | スペースの幅が設定した数値になっていなければ警告します。 |
| `false`  |         | スペースの幅に関して警告をしません。                     |

### Default notification severity

`warning`
