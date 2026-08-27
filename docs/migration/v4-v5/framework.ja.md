# フレームワークパーサ

htmx と Alpine.js のパッケージ構成が変わりました。このページは、v4 設定が指していて解決できなくなるものだけを扱います。

## htmx

`@markuplint/htmx-parser` は無くなりました。`@markuplint/htmx-spec` だけ使います（`parser` エントリ不要）。

## Alpine.js

`<template x-for>` 用に `@markuplint/alpine-parser` は残します。spec は `@markuplint/alpine-parser/spec` から `@markuplint/alpine-spec` へ。

## スペック作者

`ExtendedSpec.directivePatterns` でディレクティブ属性名を HTML 名にマップできます。`useIDLAttributeNames` は `acceptedAttrNames` に改名されました（例: `'idl'`）。
