---
id: wai-aria
description: Warn if the role attribute and aria-* attributes don't set in accordance with specs that are WAI-ARIA and ARIA in HTML.
---

# `wai-aria`

Warn if the `role` attribute and `aria-*` attributes don't set in accordance with specs that are **WAI-ARIA**, **DPub-ARIA** (Digital Publishing WAI-ARIA Module), and **ARIA in HTML**.

Warn if:

- Clear-cut violation.
  - Use the role that doesn't exist in the spec.
  - Use the abstract role.
  - Use the property/state that doesn't belong to a set role (or an implicit role).
  - Use an invalid value of the property/state.
  - Use the not permitted role according to ARIA in HTML.
  - Don't set the required property/state.
  - The role doesn't have the required child roles (e.g., `table` requires `row`).
  - The role is placed outside its required parent context (e.g., `tab` without a `tablist` ancestor).
- Unrecommended.
  - Set the deprecated role.
  - Set the deprecated property/state.
  - Set the implicit role explicitly according to ARIA in HTML.
  - Set the property/state explicitly when its element has semantic HTML attribute equivalent to it according to ARIA in HTML.
- Preference
  - Set the default value of the property/state explicitly.
- Optional checks (disabled by default)
  - Set ARIA attributes on descendants of roles whose children are presentational.
  - Use focusable interactive elements hidden via `aria-hidden`.

> [!TIP]
> This rule has been split into individual sub-rules for granular severity control.
> When using the `markuplint:a11y` preset, each check runs as an independent rule
> (e.g., `wai-aria-non-existent-role`, `wai-aria-implicit-role`).
> You can still use `wai-aria: true` to enable all checks at once.

❌ Examples of **incorrect** code for this rule

```html
<div role="landmark" aria-busy="busy">
  <ul>
    <li role="button">an item</li>
  </ul>
  <button aria-checked="true">Click me!</button>
</div>
```

✅ Examples of **correct** code for this rule

```html
<div role="banner" aria-busy="true">
  <ul>
    <li role="menuitemcheckbox">an item</li>
  </ul>
  <button aria-pressed="true">Click me!</button>
</div>
```

---

## Options

### `checkingRequiredAccessibilityParentRole`

Type: `boolean` (default: `true`)

Verifies that an element with an explicit `role` attribute is placed within the correct parent context as defined by the ARIA specification ("Required Accessibility Parent Role" in ARIA 1.3 / "Required Context Role" in ARIA 1.2).

For example, a `tab` role requires a `tablist` ancestor, and an `option` role requires a `listbox` ancestor.

When set to `false`, this check is disabled.

```json class=config
{
  "rules": {
    "wai-aria": {
      "options": {
        "checkingRequiredAccessibilityParentRole": false
      }
    }
  }
}
```

> [!NOTE]
> Only explicit roles (set via the `role` attribute) are checked. Implicit roles are skipped because native HTML parent-child semantics are already guaranteed by the HTML specification.

## Known Limitations

- **`aria-owns` is not considered.** The parent context check only walks the DOM `parentElement` chain. Elements referenced by `aria-owns` on a remote ancestor are not treated as accessibility children of that ancestor.
- **Shadow DOM boundaries are not crossed.** The parent context check only traverses the light DOM tree. Shadow DOM host boundaries are not considered.
- **Dual violation reporting.** When a role's required parent context is not satisfied, both `checkingRequiredAccessibilityParentRole` (child-side) and `checkingAllowedAccessibilityChildRoles` (parent-side) may report violations for the same structural issue. Disable one of the options if you want to avoid duplicate reports. Generally, keeping the child-side check (`checkingRequiredAccessibilityParentRole`) is recommended, as it reports the violation on the element that needs to be moved.

## Configuration Example

Explains an example of when changes configs are necessary due to browser support status or the behavior of assistive technologies.

Below is an example of disabling `disallowSetImplicitRole` when the `img` element loading SVG requires `role="img"` in Safari and VoiceOver environments.
(This matter is based on [the issue](https://bugs.webkit.org/show_bug.cgi?id=145263).)

```json class=config
{
  "rules": {
    "wai-aria": true
  },
  "nodeRules": [
    {
      "selector": "img[src$=.svg]",
      "rules": {
        // Allows the implicit role:
        "wai-aria": {
          "options": {
            "disallowSetImplicitRole": false
          }
        },
        // Change to require to specify role attributes:
        "required-attr": "role",
        // Allow only img value for the role attribute:
        "invalid-attr": {
          "options": {
            "allowAttrs": [
              {
                "name": "role",
                "value": {
                  "enum": ["img"]
                }
              }
            ]
          }
        }
      }
    }
  ]
}
```

The selector `img[src$=.svg]` **limits** the rule to the element that is loading an SVG image.
Then, disabling the `disallowSetImplicitRole` option **allows** setting `role="img"` which is the implicit role of the `img` element.
Furthermore, Change to require to specify the `role` attribute through the `required-attr` rule, and allows only the `img` value for the `role` attribute through the `invalid-attr` rule.
Doing this will urge add `role="img"` to the `img[src$=.svg]` element.

> [!IMPORTANT]
> Make sure the `<img>` carries an `alt` attribute (or `aria-label`). Per [ARIA in HTML](https://w3c.github.io/html-aria/#el-img), `<img>` without an accessible name has "No role permitted" — `permittedAriaRoles` will reject `role="img"` in that state. The example above assumes the SVG image has alt text.
