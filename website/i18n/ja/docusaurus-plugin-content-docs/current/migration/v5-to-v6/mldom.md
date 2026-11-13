---
sidebar_position: 3
title: 'MLDOM'
---

# MLDOM

`@markuplint/ml-core`のMLDOMのクラス（`MLElement`、`MLNode`、`MLAttr`、`MLDocument`など）は、標準のDOMインターフェース（`Element`、`Node`、`Document`、`Attr`、`NamedNodeMap`、`DOMTokenList`など）を実装しなくなりました。ルールとセレクターエンジンが読むメンバーだけを残したため、MLDOMのオブジェクトをDOMの`Element`や`Node`に代入できなくなります。

設定への変更ではありません。`@markuplint/ml-core`、`@markuplint/ml-spec`、`@markuplint/selector`を通じてMLDOMを読むコードに影響します。

## 削除したもの {#removed}

- `UnexpectedCallError`を投げるだけだったメンバー（変更、イベント、レイアウト、`before()`・`after()`・`remove()`など）。
- モノレポのどこからも読まれていなかったメンバー: `getElementsByTagName()`、`getElementsByClassName()`、`firstElementChild`、`lastElementChild`、`assignedNodes()`、`assignedSlot`、`getAttributeNames()`、`hasAttributes()`。代わりに`childElements`、`getAssignedNodes()`、`getFlatTreeSlot()`を読んでください。
- `MLNode`の`lastChild`、`MLDocument`の`defaultView`、`MLNode`の`DOCUMENT_POSITION_*`・`ENTITY_NODE`・`ENTITY_REFERENCE_NODE`・`NOTATION_NODE`・`PROCESSING_INSTRUCTION_NODE`の各定数。
- `@markuplint/shared`の`UnexpectedCallError`。
- `@markuplint/ml-spec`の`getAccname()`（DOMの`Element`のアクセシブルネームを計算していました）。`MLElement`の`getAccessibleName()`を読んでください。`@markuplint/selector`の`:aria(has name)`はそれを呼びます。

## 改名したもの {#renamed}

残ったメンバーは、Rust DOM（`crates/markuplint-dom`）の命名に合わせました。

| v5                                                           | v6                    |
| ------------------------------------------------------------ | --------------------- |
| `children`（子要素）                                         | `childElements`       |
| `getAttribute(name)`                                         | `getAttrValue(name)`  |
| `getAttributeNode(name)`                                     | `getAttrNode(name)`   |
| `hasAttribute(name)`                                         | `hasAttr(name)`       |
| ドキュメントやドキュメントフラグメントの`getElementById(id)` | `findElementById(id)` |
| `previousElementSibling`                                     | `prevElementSibling`  |
| `previousSibling`                                            | `prevSibling`         |
| `parentNode`                                                 | `parent`              |
| `getPureChildNodes()`                                        | `pureChildren()`      |

`nextElementSibling`、`parentElement`、`childNodes`、`textContent`、`localName`などは名前を変えていません。`MLToken`（`startLine`、`startCol`、`startOffset`、`raw`）も変えていません。

## 型 {#types}

- DOMの`Element`を受け取っていた`@markuplint/ml-spec`の関数（`getComputedRole()`、`getImplicitRole()`、`isExposed()`など）は、読むメンバーを列挙した型`SpecElement`を受け取ります。`ComputedRole#el`も`SpecElement`です。
- `@markuplint/ml-spec`の関数は`SpecElement`、`@markuplint/selector`の関数は`SelectorElement`を読みます。どちらのインターフェースも表の名前（`getAttrValue()`、`hasAttr()`、`childElements`、`parent`、`prevSibling`、`prevElementSibling`、`findElementById()`）を使うため、DOMの`Element`をそのままでは受け付けません。`@markuplint/ml-spec`の`AccnameElement`も同じです。
- `NodeListOf`と`HTMLCollectionOf`は返さなくなりました。`childNodes`と`querySelectorAll()`は`MLNodeList`、`childElements`は`MLHTMLCollection`を返します。

## やること {#what-to-do}

1. MLDOMを読むコードで、上の表のメンバー名を変更する。
2. ブラウザやJSDOMのDOMの`Element`を`@markuplint/ml-spec`や`@markuplint/selector`の関数に渡していた場合は、表のアクセサーをそのプロトタイプに定義するか、要素を包む。これらの関数が読むのは`SpecElement`・`SelectorElement`で、DOMの`Element`ではありません。
3. `UnexpectedCallError`を`catch`していれば削除する。
