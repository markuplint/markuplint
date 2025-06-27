---
description: 要素に複数のアクセシブルな名前のソースが提供されている場合に警告します。
---

# `no-conflicting-accessible-name`

要素に複数のアクセシブルな名前のソースが提供されている場合に警告します。これは、どのアクセシブルな名前が使用されるかについて混乱を招く可能性があります。アクセシブルな名前の計算アルゴリズムに従って、異なるソースには異なる優先順位があるためです。

このルールは以下の競合を検出します：
- `<label>`要素とARIAラベリング属性（`aria-label`、`aria-labelledby`）
- 複数の`<label>`要素（`for`属性による関連付けと親ラベルの両方）

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<!-- labelとaria-labelledbyの競合 -->
<label for="input1">ユーザー名</label>
<span id="username-help">ユーザー名を入力してください</span>
<input type="text" id="input1" aria-labelledby="username-help" />

<!-- labelとaria-labelの競合 -->
<label for="input2">メールアドレス</label>
<input type="text" id="input2" aria-label="メールアドレス" />

<!-- 複数のlabel要素 -->
<label for="input3">外部ラベル</label>
<label>
  親ラベル
  <input type="text" id="input3" />
</label>
```

✅ 正しいコード例

```html
<!-- 単一のlabel要素 -->
<label for="input1">ユーザー名</label>
<input type="text" id="input1" />

<!-- aria-labelledbyのみ -->
<span id="username-help">ユーザー名を入力してください</span>
<input type="text" aria-labelledby="username-help" />

<!-- aria-labelのみ -->
<input type="text" aria-label="ユーザー名" />

<!-- 親ラベルのみ -->
<label>
  ユーザー名
  <input type="text" />
</label>
```

## なぜ？

複数のアクセシブルな名前のソースが存在する場合、アクセシブルな名前の計算アルゴリズムには特定の優先順位があります：

1. `aria-labelledby`（最高優先度）
2. `aria-label`
3. 関連付けられた`<label>`要素
4. その他の要素固有のソース（画像の`alt`など）

複数のソースがあると、以下の問題につながる可能性があります：
- どの名前が使用されるかについての開発者の混乱
- 丁寧に作成されたラベルの意図しない上書き
- ラベルを更新する必要がある場合のメンテナンスの困難

アクセシブルな名前には、単一で明確なソースを使用することが推奨されます。

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->