import type { LiteralValueDeclaration } from '@markuplint/ml-ast';

/**
 * The rendering of the attribute that Astro does not render as a boolean, whose spec is Boolean: it
 * is rendered as a string, with the empty string as its name alone (`addAttribute`).
 */
const AS_STRING = { true: 'true', false: 'false', '0': '0', '""': '' } as const;

/**
 * The rendering of the attribute that Astro renders as a boolean and the spec does not know as one:
 * present for a truthy value.
 */
const AS_BOOLEAN = { true: '', false: null, '0': null, '""': null } as const;

/**
 * How Astro renders a literal in `{…}` (`addAttribute` of `astro/runtime/server/render/util.ts`),
 * where it differs from the default of `@markuplint/ml-core`. Astro has no spec package, so the
 * parser says it. Names are in lower case.
 *
 * - A boolean attribute (`htmlBooleanAttributes`) is present for a truthy value, which is `""`: `disabled={""}`
 *   has no `disabled`. Any other value is a string (`title={true}` is `title="true"`, as the default says)
 * - `download` and `popover` are present for `true` and absent for `false`; `hidden` is present for `true`,
 *   absent for `false`, and a number is a string (`hidden={0}` is `hidden="0"`)
 * - A custom element takes every boolean as a string (`handleBooleanAttribute`): `disabled={false}` is
 *   `disabled="false"`
 *
 * What it does not tell, which does not affect a rule:
 *
 * - `hidden` and `popover` take a string as it is (`hidden="until-found"`), which the default does too
 * - `scoped` and `seamless`, obsolete attributes that Astro renders as boolean, are not in the spec
 *
 * @see https://docs.astro.build/en/reference/astro-syntax/#dynamic-attributes
 * @see https://github.com/withastro/astro/blob/main/packages/astro/src/runtime/server/render/util.ts#addAttribute
 * @see https://github.com/withastro/astro/blob/main/packages/astro/src/runtime/server/render/util.ts#htmlBooleanAttributes
 * @see https://github.com/withastro/astro/blob/main/packages/astro/src/runtime/server/render/util.ts#handleBooleanAttribute
 */
export const ASTRO_LITERAL_VALUES: LiteralValueDeclaration = {
	booleanAttrs: { '""': null },
	attrs: {
		download: { true: '', false: null },
		popover: { true: '', false: null },
		hidden: { '0': '0' },
		// Booleans of Astro that the spec does not know as boolean
		disablepictureinpicture: AS_BOOLEAN,
		disableremoteplayback: AS_BOOLEAN,
		// Boolean attributes of the spec that Astro does not render as boolean
		alpha: AS_STRING,
		focusgroupstart: AS_STRING,
		headingreset: AS_STRING,
		ismap: AS_STRING,
		multiple: AS_STRING,
		shadowrootclonable: AS_STRING,
		shadowrootcustomelementregistry: AS_STRING,
		shadowrootdelegatesfocus: AS_STRING,
		shadowrootserializable: AS_STRING,
		switch: AS_STRING,
	},
	customElements: {
		booleanAttrs: AS_STRING,
		attrs: {
			hidden: { true: 'true', false: 'false', '0': '0' },
			popover: { true: 'true', false: 'false' },
			download: { true: 'true', false: 'false' },
		},
	},
};
