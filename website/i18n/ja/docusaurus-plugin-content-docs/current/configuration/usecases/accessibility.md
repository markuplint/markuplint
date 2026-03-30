# アクセシビリティルールのカスタマイズ

推奨プリセットには `markuplint:a11y` 基本プリセット経由で既にすべてのアクセシビリティルールが含まれています。このガイドでは、その動作をカスタマイズする方法を説明します。

## a11yルールのみを使う

HTML適合性やスタイルチェックなしで、アクセシビリティルール**のみ**を使いたい場合:

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:a11y"]
}
```

アクセシビリティとHTML適合性チェックを組み合わせる場合（スタイルやパフォーマンスルールは除外）:

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:a11y", "markuplint:html-standard"]
}
```

## 導入時の深刻度の調整

既存プロジェクトにMarkuplintを導入する際、まずアクセシビリティ違反を警告として扱い、段階的に厳格にすることができます:

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "a11y/*": "warning"
  }
}
```

## 特定のルールを無効にする

残りを維持したまま特定のアクセシビリティルールを無効にする場合:

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "a11y/no-accesskey": false
  }
}
```

## a11yプリセットのチェック内容

`markuplint:a11y` プリセットには以下のルールが含まれます:

- **WAI-ARIA適合性** — `role` と `aria-*` 属性の妥当性
- **アクセシブルな名前** — 名前が必要な要素が名前を持っているか（フォームコントロール、画像、ランドマークなど）
- **ランドマーク構造** — `banner`、`main`、`complementary`、`contentinfo` がトップレベルのランドマークか
- **見出し構造** — `<h1>` の存在、見出しレベルの飛ばしがないか
- **ラベルの関連付け** — `<label>` 要素がコントロールに正しく紐づいているか
- **メディアのアクセシビリティ** — `<audio>` と `<video>` に `<track>` 要素があるか
- **インタラクティブコンテンツ** — `accesskey` の禁止、`tabindex` の制限、自動再生の制約

ルールの完全な一覧は[プリセットルールセット](/docs/guides/presets#preset-a11y)を参照してください。
