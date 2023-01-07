---
description: select要素にrequired属性がある場合、プレースホルダーラベルオプションを持っているかどうかを確認します。
---

# `placeholder-label-option`

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

`select`要素に`required`属性がある場合、**プレースホルダーラベルオプション**を持っているかどうかを確認します。

> select要素がrequired属性を指定され、multiple属性を指定されず、1である表示サイズを持つ場合、および（もしあれば）select要素の選択肢のリストで最初のoptionの値が空文字列であり、そのoption要素の親ノードがselect要素（かつoptgroup要素でない）場合、そのoptionは、select要素のプレースホルダーのラベルオプションである。
>
> select要素がrequired属性を指定され、multiple属性を指定されず、1である表示サイズを持つ場合、そのselect要素は、プレースホルダーのラベルオプションを持たなければならない。

[HTML Living Standard 4.10.7 select要素](https://momdo.github.io/html/form-elements.html#the-select-element:~:text=select%E8%A6%81%E7%B4%A0%E3%81%8Crequired,%E3%82%8C%E3%81%B0%E3%81%AA%E3%82%89%E3%81%AA%E3%81%84%E3%80%82)より引用

<!-- prettier-ignore-end -->

❌ 間違ったコード例

```html
<!-- 不正: multiple属性を持っている -->
<select required multiple>
  <option value="">プレースホルダー</option>
  <option value="option1">オプション1</option>
  <option value="option2">オプション2</option>
</select>

<!-- 不正: sizeが1以外 -->
<select required size="2">
  <option value="">プレースホルダー</option>
  <option value="option1">オプション1</option>
  <option value="option2">オプション2</option>
</select>

<!-- 不正: 最初のoption要素の値が空でない -->
<select required>
  <option value="placeholder">プレースホルダー</option>
  <option value="option1">オプション1</option>
  <option value="option2">オプション2</option>
</select>

<!-- 不正: 最初のoption要素の親がoptgroup要素 -->
<select required>
  <optgroup label="グループ">
    <option value="">プレースホルダー</option>
  </optgroup>
  <option value="option1">オプション1</option>
  <option value="option2">オプション2</option>
</select>
```

✅ 正しいコード例

```html
<select required>
  <option value="">プレースホルダー</option>
  <option value="option1">オプション1</option>
  <option value="option2">オプション2</option>
</select>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
