import type { LiteralValueDeclaration } from '@markuplint/ml-ast';

/**
 * How Pug renders a literal in an attribute value (`pug_attr` of `pug-runtime`, which `pug-attrs` uses to
 * fold a constant too), where it differs from the default of `@markuplint/ml-core`. Pug has no spec
 * package, so the parser says it. Names are in lower case.
 *
 * Pug has no list of boolean attributes and decides by the value alone:
 *
 * - `true` is the attribute with its name as the value (`checked="checked"`, or `checked` under
 *   `doctype html`), whichever attribute it is, `data-x=true` included: it is `""` here, as the attribute
 *   is present
 * - `false`, `null` and `undefined` remove the attribute
 * - `class` and `style` are also removed for a falsy value, `""` and `0`
 * - Any other value is written with `JSON.stringify`, so `0` is `"0"` on any attribute, a boolean attribute
 *   included (`disabled=0` is `disabled="0"`, which is present)
 *
 * What it does not tell, which does not affect a rule:
 *
 * - A boolean attribute has its name as the value (`disabled="disabled"`) unless `doctype html`
 * - A string on a boolean attribute is `""` in the default, and Pug writes the string
 * - A quoted attribute name (`'data-x'="y"`) and an unescaped one (`data-x!="y"`) are read as code
 *   whose value is not known
 *
 * @see https://pugjs.org/language/attributes.html
 * @see https://pugjs.org/language/doctype.html
 */
export const PUG_LITERAL_VALUES: LiteralValueDeclaration = {
	booleanAttrs: { '""': '', '0': '0' },
	ariaAttrs: { true: '', false: null },
	dataAttrs: { true: '', false: null },
	otherAttrs: { true: '', false: null },
	attrs: {
		class: { '""': null, '0': null },
		style: { '""': null, '0': null },
		hidden: { '0': '0' },
	},
};
