# CSS設計

BEMのように定義されたCSSクラス名に従っている場合。

## ルール

次のようなルールを定義したとする。

- ブロック名は、最初の文字が大文字、それ以降が小文字または数字でなければならない
- エレメント名は、ブロック名とアンダースコア2文字の後に、アルファベットか数字で指定する
- **エレメントは、所有しないブロックやエレメントの子であってはならない**

```html
<!-- ✅ 正しい構造 -->
<section class="Card">
  <div class="Card__header">
    <div class="Heading">
      <h3 class="Heading__lv3">Title</h3>
    </div>
  </div>
  <div class="Card__body">
    <div class="List">
      <ul class="List__group">
        <li>...</li>
        <li>...</li>
        <li>...</li>
      </ul>
    </div>
  </div>
</section>

<!-- ❌ 間違っている構造 -->
<section class="Card">
  <div class="Card__header">
    <!-- ❌ エレメントが他のブロックに属するエレメントの中に入れ子になっている -->
    <h3 class="Heading__lv3">Title</h3>
  </div>
  <div class="Card__body">
    <!-- ❌ エレメントが他のブロックに属するエレメントの中に入れ子になっている -->
    <ul class="List__group">
      <li>...</li>
      <li>...</li>
      <li>...</li>
    </ul>
  </div>
</section>
```

## 設定

[`class-naming`](/docs/rules/class-naming)ルールと[`regexSelector`](/docs/configuration/properties#regexselector)を使います。

```json
{
  "rules": {
    "class-naming": "/^[A-Z][a-z0-9]+$/"
  },
  "childNodeRules": [
    {
      "regexSelector": {
        "attrName": "class",
        "attrValue":
          // ブロック名をキャプチャします
          "/^(?<BlockName>[A-Z][a-z0-9]+)(?:__[a-z][a-z0-9-]+)?$/"
      },
      "rules": {
        "class-naming": {
          "value": [
            // ブロック名をMustache形式で展開します
            "/^{{BlockName}}__[a-z][a-z0-9-]+$/",
            "/^([A-Z][a-z0-9]+)$/"
          ]
        }
      }
    }
  ]
}
```
