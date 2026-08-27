# `deprecated-element`

Split into `no-obsolete-element` (`error`, HTML LS removed elements) and `no-deprecated-element` (`warning`, MDN/BCD). The alias copies the old setting to both until v6.

v4 `deprecated-element` defaulted to `error` for both kinds. In v5 only obsolete stays `error`.

This rule never checked non-standard elements. That check is the new `no-nonstandard-features` rule (not present in v4). See [Renames and splits](../rule-names.md).
