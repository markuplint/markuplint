import type { FixToken, IRuleFixer, PlainData, TextEdit } from '@markuplint/ml-config';
import type { Attr, Element, RuleConfigValue, Document } from '@markuplint/ml-core';
import type { Attribute } from '@markuplint/ml-spec';
import type { WritableDeep } from 'type-fest';

import { escapeCSS } from '@markuplint/ml-spec';
import { asciiLowerCase } from '@markuplint/shared';

/** A `null`/`undefined` condition means the attribute applies unconditionally. */
export function attrMatches<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Element<T, O>,
	condition: Attribute['condition'],
) {
	if (condition == null) {
		return true;
	}

	// Multiple condition selectors are OR-ed: joined with ',' as a selector list, any match enables the attribute.
	const condSelector = typeof condition === 'string' ? condition : condition.join(',');

	return node.matches(condSelector);
}

/**
 * Conditions are evaluated against literal attribute values, so when a referenced
 * attribute's value is dynamic (template-interpolated) the condition result is
 * indeterminate and must not be used to report a violation.
 */
export function conditionDependsOnDynamicAttr<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Element<T, O>,
	condition: NonNullable<Attribute['condition']>,
) {
	const selectors = typeof condition === 'string' ? [condition] : condition;
	const referencedNames = new Set<string>();
	for (const selector of selectors) {
		// Collect attribute names from attribute selectors (e.g. `[type='module' i]` -> `type`)
		for (const matched of selector.matchAll(/\[\s*([^\s\]=~|^$*]+)/g)) {
			const name = matched[1];
			if (name) {
				referencedNames.add(name);
			}
		}
	}
	// Whether the attribute is the one that the selector names is up to the attribute (`isNamedBy`)
	const names = [...referencedNames];
	return node.attributes.some(attr => attr.isDynamicValue && names.some(name => attr.isNamedBy(name)));
}

/**
 * Memoizes `fn` by the identity of its argument. Use it for an object that is one object for every
 * caller, such as the array `getAttrSpecs` hands out for an element name. The options of the
 * elements a `nodeRule` selects are not: each element gets a copy, so use {@link memoizeByContent} for them.
 *
 * @param fn - The function to memoize
 * @returns The function that computes `fn` once per object
 */
export function memoizeByObject<K extends object, V>(fn: (key: K) => V): (key: K) => V {
	const cache = new WeakMap<K, V>();
	return key => {
		if (cache.has(key)) {
			return cache.get(key) as V;
		}
		const value = fn(key);
		cache.set(key, value);
		return value;
	};
}

/**
 * Memoizes `fn` by the content of its argument, which must be JSON data (a rule option is). The
 * options of the elements a `nodeRule` selects arrive as a copy for each element, so keying by
 * identity alone would rebuild the table for every element; identity stays as the first, cheap
 * lookup, and the content is serialised only for an object not seen before. The cache lives as long
 * as the memoized function, which a rule creates once per `verify` call, so it is bounded by the
 * options of one document. Two contents that differ only in key order are two entries, which is
 * harmless for a table read by name. JSON keeps `['a', 'b']` and `['a\0b']` apart, which a joined
 * string would not.
 *
 * @param fn - The function to memoize
 * @returns The function that computes `fn` once per content
 */
export function memoizeByContent<K extends object, V>(fn: (key: K) => V): (key: K) => V {
	const byContent = new Map<string, V>();
	return memoizeByObject((key: K) => {
		const content = JSON.stringify(key);
		if (byContent.has(content)) {
			return byContent.get(content) as V;
		}
		const value = fn(key);
		byContent.set(content, value);
		return value;
	});
}

const exactSpecsOf = memoizeByObject((attrSpecs: readonly Attribute[]) => {
	const exact = new Map<string, Attribute>();
	for (const spec of attrSpecs) {
		if (!exact.has(spec.name)) {
			exact.set(spec.name, spec);
		}
	}
	return exact;
});

/**
 * Finds the spec of an attribute: the spec named as the attribute is written, and otherwise the
 * first one that the attribute says it is (`MLAttr#isNamedBy`). The case of a name is decided by
 * the attribute, so the rules that look an attribute up share one answer.
 *
 * `getAttrSpecs` hands out the same array for every element of a name, so the exact names are
 * indexed once per array and the scan runs only for a name that is not written as the spec spells it.
 *
 * @param attrSpecs - The specs of the attributes of the element
 * @param attr - The attribute
 * @returns The spec, or `undefined` if the attribute has none
 */
export function findAttrSpec<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attrSpecs: readonly Attribute[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attr: Attr<T, O>,
): Attribute | undefined {
	return exactSpecsOf(attrSpecs).get(attr.name) ?? attrSpecs.find(spec => attr.isNamedBy(spec.name));
}

/**
 * The name that a namespace of names (`data-*`, `aria-*`, the predefined groups of `attr-order`)
 * is told by: the name that the DOM gives the attribute (`nameKey`). For the prop of a component it
 * is the name as written in ASCII lower case instead, because
 * `nameKey` camelizes it in Vue (`data-x` is `dataX`) and a prefix cannot be told then.
 *
 * @param attr - The attribute, with the element type of its owner
 * @returns The name to test against a namespace
 */
export function namespaceKeyOf(
	attr: Pick<Attr<RuleConfigValue, PlainData>, 'name' | 'nameKey'> & {
		readonly ownerElement: { readonly elementType: string };
	},
): string {
	return attr.ownerElement.elementType === 'authored' ? asciiLowerCase(attr.name) : attr.nameKey;
}

/**
 * Whether the attribute is an `aria-*` one, told by {@link namespaceKeyOf}.
 *
 * @param attr - The attribute
 * @returns `true` if the attribute is an `aria-*` one
 */
export function isAriaAttr<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attr: Attr<T, O>,
): boolean {
	return namespaceKeyOf(attr).startsWith('aria-');
}

/**
 * The shape of an option that lists attributes (`allowAttrs`, `disallowAttrs`): bare names, which
 * carry no value of their own, `{ name, value }` pairs, or a record of name to value.
 */
type NameValueOption<V> = (string | { readonly name: string; readonly value: V })[] | Record<string, V>;

/**
 * Creates a lookup of an attribute in a `NameValueOption`.
 *
 * A name of an option is compared as the DOM compares attribute names (`MLAttr#isNamedBy`): ASCII
 * case-insensitive in the HTML syntax and for an HTML element that code sets through the DOM API
 * (JSX, MDX, Vue), exact for an SVG or MathML element there, and the props of a component are not
 * folded. The README of `no-unknown-attr` states it for users.
 *
 * Among the entries, one spelled as the attribute is written wins over any other, and the last of
 * the same spelling wins. With no such entry, the last entry that the attribute accepts wins.
 * The table of an option is built once per content (`memoizeByContent`).
 *
 * @param stringValue - The value of a bare name
 * @returns The lookup, which gives the value for the attribute, or `undefined` if no entry names it
 */
export function createNameOptionLookup<V>(stringValue: V): <T extends RuleConfigValue, O extends PlainData>(
	option: NameValueOption<V> | undefined,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attr: Attr<T, O>,
) => V | undefined {
	const tableOf = memoizeByContent((option: NameValueOption<V>) => {
		const entries: [string, V][] = Array.isArray(option)
			? option.map(entry => (typeof entry === 'string' ? [entry, stringValue] : [entry.name, entry.value]))
			: Object.entries(option);
		// `new Map` keeps the later of two entries of one spelling. Across spellings, the exact
		// spelling is looked up first and the scan below keeps the last that the attribute accepts.
		return { entries, exact: new Map(entries) };
	});
	return (option, attr) => {
		if (!option) {
			return;
		}
		const { entries, exact } = tableOf(option);
		if (exact.has(attr.name)) {
			return exact.get(attr.name);
		}
		let found: V | undefined;
		for (const [name, value] of entries) {
			if (attr.isNamedBy(name)) {
				found = value;
			}
		}
		return found;
	};
}

/**
 * Creates a test of whether an attribute has one of the prefixes of an option
 * (`ignoreAttrNamePrefix`), which `MLAttr#isPrefixedBy` decides.
 *
 * @returns The test, which takes the prefixes of the option and the attribute
 */
export function createPrefixMatcher(): <T extends RuleConfigValue, O extends PlainData>(
	prefixes: string | readonly string[] | undefined,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attr: Attr<T, O>,
) => boolean {
	return (prefixes, attr) => {
		if (prefixes == null) {
			return false;
		}
		return (typeof prefixes === 'string' ? [prefixes] : prefixes).some(prefix => attr.isPrefixedBy(prefix));
	};
}

/** `pattern` is a regex literal of the form `/pattern/flags` if it matches that shape, otherwise an exact string. */
export function match(needle: string, pattern: string) {
	const matches = pattern.match(/^\/(.*)\/([gim])*$/);
	if (matches && matches[1]) {
		const re = matches[1];
		const flag = matches[2];
		return new RegExp(re, flag).test(needle);
	}
	return needle === pattern;
}

/**
 * PotentialCustomElementName
 *
 * @see https://spec.whatwg.org/multipage/custom-elements.html#prod-potentialcustomelementname
 *
 * > PotentialCustomElementName ::=
 * >   [a-z] (PCENChar)* '-' (PCENChar)*
 * > PCENChar ::=
 * >   "-" | "." | [0-9] | "_" | [a-z] | #xB7 | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x37D] |
 * >   [#x37F-#x1FFF] | [#x200C-#x200D] | [#x203F-#x2040] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
 * > This uses the EBNF notation from the XML specification. [XML]
 *
 * ASCII-case-insensitively.
 * Originally, it is not possible to define a name including ASCII upper alphas in the custom element, but it is not treated as illegal by the HTML parser.
 */
export const rePCENChar = [
	'\\-',
	'\\.',
	'[0-9]',
	'_',
	'[a-z]',
	'\u00B7',
	'[\u00C0-\u00D6]',
	'[\u00D8-\u00F6]',
	'[\u00F8-\u037D]',
	'[\u037F-\u1FFF]',
	'[\u200C-\u200D]',
	'[\u203F-\u2040]',
	'[\u2070-\u218F]',
	'[\u2C00-\u2FEF]',
	'[\u3001-\uD7FF]',
	'[\uF900-\uFDCF]',
	'[\uFDF0-\uFFFD]',
	'[\uD800-\uDBFF][\uDC00-\uDFFF]',
].join('|');

export function toNormalizedValue(value: string, spec: Attribute) {
	let normalized = value;

	if (!spec.caseSensitive) {
		normalized = normalized.toLowerCase();
	}

	// When spec.type is an array (AttributeType[] or ConditionalAttributeType[]),
	// type-specific normalization is skipped — only caseSensitive applies above.
	if (typeof spec.type === 'string') {
		if (spec.type[0] === '<') {
			normalized = normalized.toLowerCase().trim().replaceAll(/\s+/g, ' ');
		}
	} else {
		if ('separator' in spec.type) {
			if (spec.type.caseInsensitive) {
				normalized = normalized.toLowerCase();
			}
			if (!spec.type.disallowToSurroundBySpaces) {
				normalized = normalized.trim();
			}
			if (spec.type.separator === 'space') {
				normalized = normalized.replaceAll(/\s+/g, ' ');
			}
			if (spec.type.separator === 'comma') {
				normalized = normalized.replaceAll(/\s*,\s*/g, ',');
			}
		}
	}

	return normalized;
}

export function accnameMayBeMutable(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<any, any>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	document: Document<any, any>,
) {
	if (el.hasMutableAttributes() || el.hasMutableChildren(true)) {
		return true;
	}

	const ownedLabel = getOwnedLabel(el, document);
	if (ownedLabel && (ownedLabel.hasMutableAttributes() || ownedLabel.hasMutableChildren(true))) {
		return true;
	}

	return false;
}

/**
 * Whether the accessible name of `el` may be rendered by content the pretender
 * does not know: an unknown entry (`{ dynamic: true }`) in the `contents` of
 * `el`, of a pretended descendant among the children the name computation
 * traverses, of an element `aria-labelledby` refers to, or of the owned label.
 *
 * Not folded into {@link accnameMayBeMutable}: a component with an unknown
 * entry and a static name (`aria-label`, static text) is still decidable and
 * must stay checked (and reported as redundant by `no-redundant-accessible-name`).
 * Call it only once the static name has been computed and found empty.
 */
export function accnameMayComeFromUnknownContent(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<any, any>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	document: Document<any, any>,
) {
	if (hasUnknownContent(el)) {
		return true;
	}

	const labelledby = el.getAttribute('aria-labelledby');
	if (labelledby) {
		const referenced = labelledby
			.trim()
			.split(/\s+/)
			.map(id => document.querySelector(`#${escapeCSS(id)}`));
		if (referenced.some(target => target && hasUnknownContent(target))) {
			return true;
		}
	}

	const ownedLabel = getOwnedLabel(el, document);
	return !!ownedLabel && hasUnknownContent(ownedLabel);
}

/**
 * Walks the same children the accname resolver of `@markuplint/ml-core` does:
 * for a pretended element, the children the component renders (`as.childNodes`,
 * placed into `contents`), so that a nested component contributes its own
 * `contents`; otherwise the children as written. A hidden child is skipped
 * because the name computation never reads it (`isHidden` in that resolver).
 */
function hasUnknownContent(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<any, any>,
): boolean {
	const context = el.pretenderContext;
	if (context?.type === 'pretender' && context.slotContent?.mutable) {
		return true;
	}
	const given = context?.type === 'pretender' ? [...context.as.childNodes] : [...el.childNodes];
	const children = context?.type === 'pretender' && context.slotContent ? context.slotContent.fill(given) : given;
	return children.some(
		child =>
			child.is(child.ELEMENT_NODE) &&
			child.getAttribute('aria-hidden') !== 'true' &&
			!child.hasAttribute('hidden') &&
			hasUnknownContent(child),
	);
}

export const labelable = ['button', 'input:not([type=hidden])', 'meter', 'output', 'progress', 'select', 'textarea'];
export function getOwnedLabel<V extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<V, O>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	document: Document<V, O>,
) {
	if (!labelable.some(cond => el.matches(cond))) {
		return null;
	}

	let ownedLabel = el.closest('label');

	if (!ownedLabel) {
		const id = el.getAttribute('id');
		if (id) {
			ownedLabel = document.querySelector(`label[for="${id}"]`);
		}
	}

	return ownedLabel;
}

/** `null`/`undefined` items are silently dropped on add. */
export class Collection<T> {
	#items = new Set<T>();

	constructor(...items: readonly (T | null | undefined)[]) {
		this.add(...items);
	}

	[Symbol.iterator](): Iterator<T> {
		return this.#items.values();
	}

	add(...items: readonly (T | null | undefined)[]) {
		for (const item of items) {
			if (item == null) {
				continue;
			}
			this.#items.add(item);
		}
	}

	toArray() {
		return Object.freeze([...this.#items]);
	}
}

/** Strips read-only modifiers from the result type so the clone can be freely mutated. */
export function deepCopy<T>(value: T): WritableDeep<T> {
	return structuredClone(value as any) as WritableDeep<T>;
}

function tokenRange(tokens: readonly (FixToken | null | undefined)[]): readonly [number, number] | null {
	const valid = tokens.filter((t): t is FixToken => t != null && t.raw.length > 0);
	const first = valid[0];
	const last = valid.at(-1);
	if (!first || !last) {
		return null;
	}
	return [first.startOffset, last.startOffset + last.raw.length];
}

export function removeAttr(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	fixer: IRuleFixer,
	attr: {
		readonly spacesBeforeName: FixToken | null;
		readonly nameNode: FixToken | null;
		readonly spacesBeforeEqual: FixToken | null;
		readonly equal: FixToken | null;
		readonly spacesAfterEqual: FixToken | null;
		readonly startQuote: FixToken | null;
		readonly valueNode: FixToken | null;
		readonly endQuote: FixToken | null;
	},
): TextEdit | TextEdit[] {
	const range = tokenRange([
		attr.spacesBeforeName,
		attr.nameNode,
		attr.spacesBeforeEqual,
		attr.equal,
		attr.spacesAfterEqual,
		attr.startQuote,
		attr.valueNode,
		attr.endQuote,
	]);
	if (!range) {
		return [];
	}
	return fixer.removeRange(range);
}

export function removeAttrValue(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	fixer: IRuleFixer,
	attr: {
		readonly spacesBeforeEqual: FixToken | null;
		readonly equal: FixToken | null;
		readonly spacesAfterEqual: FixToken | null;
		readonly startQuote: FixToken | null;
		readonly valueNode: FixToken | null;
		readonly endQuote: FixToken | null;
	},
): TextEdit | TextEdit[] {
	const range = tokenRange([
		attr.spacesBeforeEqual,
		attr.equal,
		attr.spacesAfterEqual,
		attr.startQuote,
		attr.valueNode,
		attr.endQuote,
	]);
	if (!range) {
		return [];
	}
	return fixer.removeRange(range);
}

/** The parts of the keys of `ignoreFeatures`: `dialog` is an element, `img[loading]` an attribute of one. */
interface IgnoreFeaturesTable {
	/** The element parts of the keys that name an element, as written and ASCII-folded. */
	readonly elements: { readonly exact: ReadonlySet<string>; readonly folded: ReadonlySet<string> };
	/** The attribute parts of the keys that name an attribute, by the element part, as written and ASCII-folded. */
	readonly attrs: {
		readonly exact: ReadonlyMap<string, readonly string[]>;
		readonly folded: ReadonlyMap<string, readonly string[]>;
	};
}

function parseIgnoreFeatures(features: readonly string[]): IgnoreFeaturesTable {
	const elements = { exact: new Set<string>(), folded: new Set<string>() };
	const attrs = { exact: new Map<string, string[]>(), folded: new Map<string, string[]>() };
	const push = (map: Map<string, string[]>, element: string, attrName: string) => {
		const names = map.get(element);
		if (names) {
			names.push(attrName);
		} else {
			map.set(element, [attrName]);
		}
	};
	for (const feature of features) {
		const open = feature.indexOf('[');
		if (open === -1 || !feature.endsWith(']')) {
			elements.exact.add(feature);
			elements.folded.add(asciiLowerCase(feature));
			continue;
		}
		const element = feature.slice(0, open);
		const attrName = feature.slice(open + 1, -1);
		push(attrs.exact, element, attrName);
		push(attrs.folded, asciiLowerCase(element), attrName);
	}
	return { elements, attrs };
}

/**
 * Creates the lookup of `ignoreFeatures`, whose keys are an element (`dialog`) or an attribute of
 * an element (`img[loading]`). The element part of a key is compared as the document compares tag
 * names (`tagNameCaseSensitive`), so `DIALOG` is not `<dialog>` in Svelte. The attribute part is
 * compared by the attribute that is checked (`MLAttr#isNamedBy`). An element key does not ignore
 * the attributes of the element.
 *
 * The option of an element replaces the option of the rule for that element. The options of the
 * elements a `nodeRule` selects arrive as a copy for each element, so the table of an option is built
 * once per content (`memoizeByContent`).
 *
 * @param tagNameCaseSensitive - `MLDocument#tagNameCaseSensitive`
 * @param ruleOption - `ignoreFeatures` of the rule
 * @returns The lookup for an element and for an attribute of an element
 */
export function createIgnoreFeaturesLookup(
	tagNameCaseSensitive: boolean,
	ruleOption: readonly string[] | undefined,
): {
	/** Whether the element is ignored. */
	isElementIgnored(elementOption: readonly string[] | undefined, elementName: string): boolean;
	/** Whether the attribute of the element is ignored. */
	isAttrIgnored<T extends RuleConfigValue, O extends PlainData>(
		elementOption: readonly string[] | undefined,
		elementName: string,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		attr: Attr<T, O>,
	): boolean;
} {
	const tableOf = memoizeByContent(parseIgnoreFeatures);
	const ruleTable = tableOf(ruleOption ?? []);
	const pick = (elementOption: readonly string[] | undefined) => (elementOption ? tableOf(elementOption) : ruleTable);
	return {
		isElementIgnored(elementOption, elementName) {
			const { exact, folded } = pick(elementOption).elements;
			return tagNameCaseSensitive ? exact.has(elementName) : folded.has(asciiLowerCase(elementName));
		},
		isAttrIgnored(elementOption, elementName, attr) {
			const { exact, folded } = pick(elementOption).attrs;
			const names = tagNameCaseSensitive ? exact.get(elementName) : folded.get(asciiLowerCase(elementName));
			return names?.some(name => attr.isNamedBy(name)) ?? false;
		},
	};
}
