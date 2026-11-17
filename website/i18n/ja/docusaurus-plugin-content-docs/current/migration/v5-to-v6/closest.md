---
sidebar_position: 5
title: ':closest()セレクター'
---

# `:closest()`セレクター

v5で非推奨だった擬似クラス`:closest()`を削除しました。これを含むセレクターは、`:hover`を含むセレクターと同じく無効なセレクターです。`nodeRules`や`childNodeRules`のセレクター、`--search`に渡すセレクター、`@markuplint/selector`に渡すセレクターが対象です。

そのようなセレクターを持つ設定は、読み飛ばされません。ドキュメントにエラー（`parse-error`、`Unsupported pseudo :closest(...) selector.`）が付き、そのドキュメントではルールが1つも実行されません。

## やること {#what-to-do}

`:closest(X)`を`:is(X *)`に置き換えてください。どちらも`X`にマッチする祖先を持つ要素にマッチします。v5の`:closest(X)`の詳細度は`X`のものでした。`:is(X *)`も、`*`が詳細度を足さないので、同じです。

| v5                                  | v6                            |
| ----------------------------------- | ----------------------------- |
| `:closest(nav)`                     | `:is(nav *)`                  |
| `:closest(.wrapper)`                | `:is(.wrapper *)`             |
| `div:closest(nav):closest(section)` | `div:is(nav *):is(section *)` |
| `:closest(nav, aside)`              | `:is(nav *, aside *)`         |

`X`がリストのときは、その各セレクターの後ろに`*`を付けてください。`:is(nav, aside *)`は、`nav`、または`aside *`の意味になります。

祖先は、`:closest()`と同じく要素のツリーの中で探します。`<template>`要素の内容は独立したツリーで、`:is(section *)`は、その外にある`<section>`には届きません。[ツリー](/docs/guides/selectors#ツリー)を参照してください。
