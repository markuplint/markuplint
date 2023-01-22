---
id: placeholder-label-option
description: Checking whether the select element needs the placeholder label option.
---

# `placeholder-label-option`

Checking whether the `select` element needs the **placeholder label option**.

> If a select element has a required attribute specified, does not have a multiple attribute specified, and has a display size of 1; and if the value of the first option element in the select element's list of options (if any) is the empty string, and that option element's parent node is the select element (and not an optgroup element), then that option is the select element's placeholder label option.
>
> If a select element has a required attribute specified, does not have a multiple attribute specified, and has a display size of 1, then the select element must have a placeholder label option.

Cite: [HTML Living Standard 4.10.7 The select element](https://html.spec.whatwg.org/multipage/form-elements.html#the-select-element:~:text=If%20a%20select%20element%20has,a%20placeholder%20label%20option.)

<!-- prettier-ignore-end -->

❌ Examples of **incorrect** code for this rule

```html
<!-- Invalid: first option element's value is not empty -->
<select required>
  <option value="placeholder">Placeholder</option>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>

<select required size="1">
  <option value="placeholder">Placeholder</option>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>

<!-- Invalid: first option element's parent is optgroup -->
<select required>
  <optgroup label="Group">
    <option value="">Placeholder</option>
  </optgroup>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>
```

✅ Examples of **correct** code for this rule

```html
<!-- Valid: Has placeholder label option -->
<select required>
  <option value="">Placeholder</option>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>

<!-- Valid: Doesn't have placeholder label option but has multiple attribute -->
<select required multiple>
  <option value="placeholder">Placeholder</option>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>

<!-- Valid: Doesn't have placeholder label option but has size greater than 1 -->
<select required size="2">
  <option value="placeholder">Placeholder</option>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>
```
