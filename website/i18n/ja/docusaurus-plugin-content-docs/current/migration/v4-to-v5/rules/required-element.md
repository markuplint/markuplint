---
sidebar_position: 2
title: 'required-element'
---

# `required-element`

`require-element` に改名。v6 までエイリアス。[改名と分割](/docs/migration/v4-to-v5/rules/rule-names)。

## `ignoreOmittedElements` の既定

v4 既定 `false`: パーサが挿入したゴースト（省略 `<tbody>` など）も要件を満たした。

v5 既定 `true`: ソースに書いた要素だけ。

`table` に `["tbody"]` を要求すると、tbody 省略の表は v4 では通って v5 では違反になります。v4 相当は `"ignoreOmittedElements": false`。
