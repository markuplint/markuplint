---
id: heading-levels
description: Warns for skipped  heading levels
---

# `heading-levels`

Warns for skipped heading levels.

> Each heading following another heading lead in the outline must have a heading level that is less than, equal to, or 1 greater than lead's heading level.

Cite: [HTML Living Standard 4.3.11 Headings and outlines](https://html.spec.whatwg.org/multipage/sections.html#headings-and-outlines-2:~:text=Each%20heading%20following%20another%20heading%20lead%20in%20the%20outline%20must%20have%20a%20heading%20level%20that%20is%20less%20than%2C%20equal%20to%2C%20or%201%20greater%20than%20lead%27s%20heading%20level.)

<!-- prettier-ignore-end -->

❌ Examples of **incorrect** code for this rule

```html
<h1>Heading 1</h1>
<h3>Heading 3<!-- SKIPPED --></h3>
<h4>Heading 3</h4>
```

✅ Examples of **correct** code for this rule

```html
<h1>Heading 1</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>
```
