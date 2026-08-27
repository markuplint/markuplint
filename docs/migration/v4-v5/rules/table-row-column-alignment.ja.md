# `table-row-column-alignment`

v4 の既定 severity は `warning`。v5 は 4 ルール。エイリアスは 4 つすべてに展開（v6 まで）。

| 新ルール | 検査 | 既定 severity |
| --- | --- | --- |
| `no-table-cell-overlap` | セル重なり | `error` |
| `no-table-span-overflow` | 行グループを越える `rowspan` | `error` |
| `no-empty-table-track` | アンカーのない行・列 | `error` |
| `consistent-table-row-length` | 列数の不揃い（仕様は表を広げてよい） | `warning` |

v5 は [HTML LS §4.9.12.1 Forming a table](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table) のグリッドです。空トラックと行グループ越えの `rowspan` を新たに報告します。下の行をちょうど埋める `rowspan` を余分な列として出していた v4 の誤検出は無くなりました。

重なりがある表では他 3 ルールは黙ります。`markuplint:a11y` は 4 つを名前付きグループで有効にします。
