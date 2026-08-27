# `invalid-attr`

4 ルールに分割。v4 スキーマが許して v5 が許さない形式は破壊的です。

| 新ルール | 検査 |
| --- | --- |
| `no-unknown-attr` | 仕様にない名前 |
| `no-disallowed-attr` | ここには不許可な名前 |
| `no-invalid-attr-value` | 値の型・文法 |
| `no-restricted-attr` | ユーザーの `disallowAttrs` のみ |

`aria-*` と `role` は仕様検査 3 ルールでは対象外です。

| 旧オプション | 行き先 |
| --- | --- |
| `allowAttrs` | `no-unknown-attr`、`no-disallowed-attr`、`no-invalid-attr-value` |
| `ignoreAttrNamePrefix` | `no-unknown-attr`、`no-disallowed-attr` |
| `allowToAddPropertiesForPretender` | `no-unknown-attr` |
| `disallowAttrs` | `no-restricted-attr`（設定されていたときだけエイリアスに含める） |

`invalid-attr` は v6 まで非推奨警告で展開されます。[改名と分割](../rule-names.ja.md)。

## `{ type: X }` ラッパー廃止

v4 の `ValueRule` は `{ type: AttributeType }` を許していました。v5 は型名（または pattern）を直接書きます。オブジェクト形式の `allowAttrs` / `disallowAttrs` は新ルールでは非推奨（配列推奨）。旧 `attrs` オプションは削除済みです。
