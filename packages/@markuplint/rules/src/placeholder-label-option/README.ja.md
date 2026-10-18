---
description: select要素にプレースホルダーラベルオプションが必要か確認します。
---

# `placeholder-label-option`

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

`select`要素に**プレースホルダーラベルオプション**が必要か確認します。

> If a select element has a required attribute specified, and has a display size of 1; and if the value of the first option element in the select element's list of options (if any) is the empty string, and that option element does not have an ancestor optgroup in between itself and the select element, then that option is the select element's placeholder label option.
>
> select要素がrequired属性を指定され、multiple属性を指定されず、1である表示サイズを持つ場合、そのselect要素は、プレースホルダーのラベルオプションを持たなければならない。

[HTML Living Standard 4.10.7 select要素](https://momdo.github.io/html/form-elements.html#the-select-element:~:text=select%E8%A6%81%E7%B4%A0%E3%81%8Crequired,%E3%82%8C%E3%81%B0%E3%81%AA%E3%82%89%E3%81%AA%E3%81%84%E3%80%82)より引用

<!-- prettier-ignore-end -->

❌ 間違ったコード例

```html
<!-- 不正: 最初のoption要素の値が空でない -->
<select required>
  <option value="placeholder">プレースホルダー</option>
  <option value="option1">オプション1</option>
  <option value="option2">オプション2</option>
</select>

<select required size="1">
  <option value="placeholder">プレースホルダー</option>
  <option value="option1">オプション1</option>
  <option value="option2">オプション2</option>
</select>

<!-- 不正: 最初のoption要素がoptgroup要素の子孫 -->
<select required>
  <optgroup label="グループ">
    <option value="">プレースホルダー</option>
  </optgroup>
  <option value="option1">オプション1</option>
  <option value="option2">オプション2</option>
</select>

<!-- 不正: 最初のoption要素にvalue属性がないので、そのテキストが値になる -->
<select required>
  <option>選択してください</option>
  <option>オプション1</option>
</select>

<!-- 不正: option要素がない -->
<select required></select>
```

✅ 正しいコード例

```html
<!-- 妥当: プレースホルダーラベルオプションを持っている -->
<select required>
  <option value="">プレースホルダー</option>
  <option value="option1">オプション1</option>
  <option value="option2">オプション2</option>
</select>

<!-- 妥当: 最初のoption要素にvalue属性もテキストもないので、値が空文字列になる -->
<select required>
  <option></option>
  <option value="option1">オプション1</option>
</select>

<!-- 妥当: プレースホルダーラベルオプションを持っていないが、multiple属性を持っている -->
<select required multiple>
  <option value="placeholder">プレースホルダー</option>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>

<!-- 妥当: プレースホルダーラベルオプションを持っていないが、1より大きいsize属性を持っている -->
<select required size="2">
  <option value="placeholder">プレースホルダー</option>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
