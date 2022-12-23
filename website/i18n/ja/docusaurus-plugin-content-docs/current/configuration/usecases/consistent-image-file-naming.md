# 一貫した画像ファイル名

img要素とsource要素のファイル名を一致させたい場合。

## ルール

次のようなルールを定義したとする。

- img要素のファイル名をベースとする
- ベースとなるファイル名に`@`で解像度を付加したファイル名をsource要素のファイル名に設定する
- ファイル名が`logo.png`の場合、`@2x`のプレフィックスを付加して`logo@2x.png`としてsource要素に設定する
- `logo-2x.png`などの形式は認めない

```html
<picture>
  <!-- ✅ 正しいファイル名 -->
  <source srcset="logo@3x.png 3x" />
  <source srcset="logo@2x.png 2x" />

  <!-- ❌ 間違ったファイル名: 型式違い -->
  <source srcset="logo-3x.png 3x" />

  <!-- ❌ 間違ったファイル名: 異なる名前 -->
  <source srcset="symbol@2x.png 2x" />

  <!-- ベースとなるファイル名 -->
  <img src="logo.png" alt="logo" />
</picture>
```

## 設定

[`invalid-attr`](/rules/invalid-attr)ルールと[`regexSelector`](/configuration/properties#regexselector)を使います。

```json
{
  "rules": {
    "invalid-attr": true
  },
  "nodeRules": [
    {
      "regexSelector": {
        "nodeName": "img",
        "attrName": "src",
        "attrValue":
          // img要素からファイル名と拡張子をキャプチャつつ
          "/^(?<FileName>.+)\\.(?<Exp>png|jpg|webp|gif)$/",
        // コンビネータと併用して、前方の兄弟のsource要素を選択します
        "combination": {
          "combinator": ":has(~)",
          "nodeName": "source"
        }
      },
      "rules": {
        "invalid-attr": {
          "options": {
            "attrs": {
              "srcset": {
                // ファイル名と拡張子をMustache形式で展開します
                "enum": ["{{FileName}}@2x.{{Exp}} 2x", "{{FileName}}@3x.{{Exp}} 3x"]
              }
            }
          }
        }
      }
    }
  ]
}
```
