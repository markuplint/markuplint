---
description: for、form、aria-*などに指定されたIDまたはIDのリストが、同じツリー内に存在するIDを参照しているかどうかを確認します。
---

# `no-refer-to-non-existent-id`

`for`、`form`、`aria-*` などに指定された**ID**または**IDのリスト**が、同じツリー内に存在するIDを参照しているかどうかを確認します。ドキュメントは1つのツリーで、`template`要素の内容は独立したツリー、宣言的シャドウルートも同様なので、参照は別のツリーのIDには届きません。参照は、マークアップ中の文字参照を解決したうえでIDと比較します。宣言的シャドウルートが付与される`template`要素はどのツリーにも属さず何も参照しません。付与されるかもしれない`template`要素(親がファイルの中にない、または親がコンポーネント、あるいは`shadowrootmode`が動的な値)も同様で、わからないものは報告しないためです。ReactとVueでは、ディレクティブのない`template`要素の子要素はドキュメントのツリーにあります。また、IDを持つかもしれないがマークアップからはわからない要素がツリーにあるときも、そのツリーは報告しません。`id`がコードで与えられる値の要素(`<h2 id={x}>`)、`id`を与えたり上書きしたりするかもしれないスプレッド属性を持つ要素(`<h2 {...props}>`。`id`より前のスプレッドは`id`が上書きするので対象外)、子要素をマークアップで置き換える属性(`v-html`、`x-html`、`dangerouslySetInnerHTML`)、プリテンダーが解決しないコンポーネント(中に書かれたものを保持するVueの組み込みコンポーネントは除く)、`contents`に不明な項目(`{ dynamic: true }`)があるプリテンダー、内容がわからないもの(`{children}`、インクルードのような振る舞いを持たないテンプレート言語のブロック、Vue・Svelte・Astroの`slot`)です。`contents`が宣言されたプリテンダーは検査されたままです。別のファイルにあるIDは追跡しません。これらのブロックやコンポーネントを除き、ファイルは文書全体として扱います。

ハイパーリンクの**フラグメント**(`<a href="#…">` / `<area href="#…">`)は[`no-broken-fragment-link`](/docs/rules/no-broken-fragment-link)の担当であり、このルールの対象ではありません — このルールが対象とする `DOMID` 型属性や ARIA の ID 参照とは異なり、HTML LS はフラグメントリンクの参照先不在を適合性違反として扱わないため、分割されています。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<label for="foo">Text Field</label><input id="bar" type="text" />
```

✅ 正しいコード例

```html
<label for="foo">Text Field</label><input id="foo" type="text" />
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
