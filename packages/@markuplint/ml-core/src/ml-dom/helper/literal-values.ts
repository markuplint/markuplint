import type { LiteralValueDeclaration, LiteralValues } from '@markuplint/ml-ast';
import type { MLMLSpec } from '@markuplint/ml-spec';
import type { LiteralExpression } from '@markuplint/parser-utils';

import { asciiLowerCase } from '@markuplint/shared';

/**
 * How a literal in an attribute value that is written as code is rendered as an attribute of the DOM.
 *
 * - `value`: the attribute has this value (`""` for `disabled={true}`)
 * - `absent`: the attribute is not output (`disabled={false}`), as `getAttribute()` returns `null`
 * - `unknown`: the frameworks differ and the attribute has a value that is not known (`disabled={""}`
 *   is `""` in Vue and Svelte, and absent in React and Astro)
 */
export type RenderedLiteral =
	| { readonly kind: 'value'; readonly value: string }
	| { readonly kind: 'absent' }
	| { readonly kind: 'unknown' };

/**
 * What decides the rendering of a literal besides the literal itself.
 */
export type LiteralRenderingContext = {
	/**
	 * The name of the attribute as the DOM names it, in lower case.
	 */
	readonly name: string;

	/**
	 * Whether the attribute is a boolean attribute: a name whose type is `Boolean` in the spec
	 * ({@link getBooleanAttrNames}). The frameworks decide it by the name, not by the element.
	 */
	readonly isBoolean: boolean;

	/**
	 * Whether the element is a custom element (`elementType: "web-component"`), which React and Astro
	 * render differently from an element of HTML.
	 */
	readonly isCustomElement: boolean;

	/**
	 * `literalValues` of the merged spec (`MLMLSpec#literalValues`).
	 */
	readonly specLiteralValues?: LiteralValueDeclaration;

	/**
	 * `literalValues` that the parser declares (`MLParser#literalValues`), which a parser without a spec
	 * package has. A spec wins over it on a key that both say.
	 */
	readonly parserLiteralValues?: LiteralValueDeclaration;
};

/**
 * The tables of `@markuplint/ml-core` by attribute name, for an attribute whose rendering the
 * frameworks agree on and the spec cannot say: `hidden` is an enumerated attribute (`""`, `hidden`,
 * `until-found`) in the HTML Standard, but React, Vue, Svelte and Astro all render a boolean as
 * present or absent. What differs among them is said by `literalValues` of the spec or the parser.
 *
 * It lists what the frameworks agree on. A number other than `0` is a string by the default (`hidden={1}` is
 * `hidden="1"`, which React, Vue and Svelte render as `hidden=""`): the attribute is output either way. The
 * empty string is present by the default; React does not output it, which its spec says.
 *
 * It is read after `attrs` of a spec or a parser, so that a framework that renders `hidden` differently
 * can say so there, and before the table of its kind (`otherAttrs`, as `hidden` is not `Boolean` in the
 * spec), so that what a framework says for the other attributes does not change it.
 */
const NAME_DEFAULTS: Readonly<Record<string, LiteralValues>> = {
	hidden: { true: '', false: null, '0': null },
};

/**
 * Renders a literal in an attribute value that is written as code, as the framework renders it as
 * an attribute of the DOM.
 *
 * The tables are looked up by the key of the literal (the normal form in `LiteralExpression#key`),
 * and the first table that has the key decides, in this order. A spec is read before a parser at each step.
 *
 * 1. On a custom element, `customElements`: the table of the attribute by name (`attrs`), then that of
 *    its kind
 * 2. `attrs`: the table of the attribute by name
 * 3. The table of `@markuplint/ml-core` by name ({@link NAME_DEFAULTS})
 * 4. The table of the kind of the attribute (`ariaAttrs` for `aria-`, `dataAttrs` for `data-`,
 *    `booleanAttrs` for a boolean attribute, `otherAttrs` for the rest). The kinds are independent: an
 *    attribute is of one kind and does not fall back to another
 * 5. The default of `@markuplint/ml-core` ({@link renderByDefault})
 *
 * A table lists only what differs from the default, so most attributes are rendered by 5.
 *
 * @param literal - The literal that is written
 * @param context - What decides the rendering besides the literal
 * @returns How the attribute is rendered
 */
export function renderLiteral(literal: LiteralExpression, context: LiteralRenderingContext): RenderedLiteral {
	const { key } = literal;
	const { name, specLiteralValues: spec, parserLiteralValues: parser } = context;
	const kind = kindOf(name, context.isBoolean);

	const tables: (LiteralValues | undefined)[] = [];
	if (context.isCustomElement) {
		tables.push(
			spec?.customElements?.attrs?.[name],
			parser?.customElements?.attrs?.[name],
			spec?.customElements?.[kind],
			parser?.customElements?.[kind],
		);
	}
	tables.push(spec?.attrs?.[name], parser?.attrs?.[name], NAME_DEFAULTS[name], spec?.[kind], parser?.[kind]);

	for (const table of tables) {
		if (table && Object.hasOwn(table, key)) {
			const rendered = table[key];
			return rendered == null ? { kind: 'absent' } : { kind: 'value', value: rendered };
		}
	}

	return renderByDefault(literal, kind);
}

type AttrKind = 'ariaAttrs' | 'dataAttrs' | 'booleanAttrs' | 'otherAttrs';

function kindOf(name: string, isBoolean: boolean): AttrKind {
	if (name.startsWith('aria-')) {
		return 'ariaAttrs';
	}
	if (name.startsWith('data-')) {
		return 'dataAttrs';
	}
	return isBoolean ? 'booleanAttrs' : 'otherAttrs';
}

/**
 * The rendering that React, Vue, Svelte and Astro share, which a table of a spec or a parser
 * overrides on the keys it lists.
 *
 * | literal            | boolean attribute         | others          |
 * | ------------------ | ------------------------- | --------------- |
 * | `true`             | `""`                      | `"true"`        |
 * | `false`            | not output                | `"false"`       |
 * | `null`/`undefined` | not output                | not output      |
 * | a number except 0  | `""`                      | `String(n)`     |
 * | `0`                | not output                | `"0"`           |
 * | `""`               | unknown                   | `""`            |
 * | any other string   | `""`                      | the string      |
 *
 * `aria-` and `data-` attributes are rendered as the others. The empty string on a boolean attribute is
 * the one that the frameworks disagree on (present in Vue and Svelte, absent in React and Astro), so it is
 * unknown unless the spec or the parser says. Svelte renders any other string on a boolean attribute
 * as it is when it is rendered on the server, which is not told from `""` here: both mean that the
 * attribute is present.
 */
function renderByDefault(literal: LiteralExpression, kind: AttrKind): RenderedLiteral {
	const { type, value } = literal;
	if (type === 'null' || type === 'undefined') {
		return { kind: 'absent' };
	}

	if (kind === 'booleanAttrs') {
		switch (type) {
			case 'boolean': {
				return value ? { kind: 'value', value: '' } : { kind: 'absent' };
			}
			case 'number': {
				return value === 0 ? { kind: 'absent' } : { kind: 'value', value: '' };
			}
			default: {
				return value === '' ? { kind: 'unknown' } : { kind: 'value', value: '' };
			}
		}
	}

	// The key of a number is its digits: a BigInt keeps all of them
	return { kind: 'value', value: type === 'number' ? literal.key : String(value) };
}

/**
 * The string of a literal as it is written, which is what a component receives as a prop of the
 * literal. A component does not render it: where it ends up is decided by the element that the
 * prop is forwarded to.
 *
 * @param literal - The literal that is written
 * @returns The string form: a string as it is, a number by `String(n)`, a boolean as `"true"` or
 * `"false"`, and `null` or `undefined` as the empty string
 */
export function literalToString(literal: LiteralExpression): string {
	switch (literal.type) {
		case 'null':
		case 'undefined': {
			return '';
		}
		case 'number': {
			return literal.key;
		}
		default: {
			return String(literal.value);
		}
	}
}

/**
 * The code that reads as the literal again: the key of the literal, except for a number that is not
 * finite, whose key (`Infinity`) is a name and not a literal, so it is written as the number that overflows.
 *
 * @param literal - The literal that is written
 * @returns The code that `parseLiteralExpression` reads as the same literal
 */
export function literalToExpression(literal: LiteralExpression): string {
	if (literal.type === 'number' && !Number.isFinite(literal.value)) {
		return literal.value > 0 ? '1e999' : '-1e999';
	}
	return literal.key;
}

const booleanAttrNamesCache = new WeakMap<MLMLSpec, ReadonlySet<string>>();

/**
 * The names of the boolean attributes of a spec: those whose type is `Boolean` somewhere in it, in
 * the global attributes or in an element, so `open` is one though it is another type on `<mfenced>`.
 * An attribute with several types, or a conditional type, counts when any of them is `Boolean`.
 * Names are in lower case.
 *
 * The frameworks decide a boolean attribute by its name alone (React, Vue, Svelte, Astro and Alpine
 * each have a list of names), so the element does not matter. `hidden` is not in the set: its type is
 * enumerated in the HTML Standard.
 *
 * @param spec - The merged spec
 * @returns The set of names, computed once for a spec
 */
export function getBooleanAttrNames(spec: MLMLSpec): ReadonlySet<string> {
	let names = booleanAttrNamesCache.get(spec);
	if (names) {
		return names;
	}

	const found = new Set<string>();
	const collect = (attrs: Readonly<Record<string, { readonly type?: unknown } | undefined>> | undefined) => {
		for (const [name, attr] of Object.entries(attrs ?? {})) {
			if (hasBooleanType(attr?.type)) {
				found.add(asciiLowerCase(name));
			}
		}
	};

	for (const attrs of Object.values(spec.def?.['#globalAttrs'] ?? {})) {
		collect(attrs);
	}
	for (const elSpec of spec.specs ?? []) {
		collect(elSpec.attributes);
	}

	names = found;
	booleanAttrNamesCache.set(spec, names);
	return names;
}

function hasBooleanType(type: unknown): boolean {
	if (type === 'Boolean') {
		return true;
	}
	if (Array.isArray(type)) {
		return type.some(hasBooleanType);
	}
	// A conditional type: `{ condition, type }`
	if (type != null && typeof type === 'object' && 'condition' in type && 'type' in type) {
		return hasBooleanType(type.type);
	}
	return false;
}
