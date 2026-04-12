import type { Log } from './debug.js';
import type { Translator } from '@markuplint/i18n';
import type { FixToken, IRuleFixer, PlainData, TextEdit } from '@markuplint/ml-config';
import type { Element, RuleConfigValue, Document } from '@markuplint/ml-core';
import type { Attribute } from '@markuplint/ml-spec';
import type { WritableDeep } from 'type-fest';

import { isConditionalAttributeTypeArray } from '@markuplint/ml-spec';

import { attrCheck } from './attr-check.js';

/**
 * Tests whether an element matches the condition specified in an attribute spec.
 * When the condition is `null` or `undefined`, the element is considered to match unconditionally.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param node - The element to test against the condition
 * @param condition - A CSS selector string or array of selector strings from the attribute specification;
 *   if `null`/`undefined`, the function returns `true`
 * @returns `true` if the element matches the condition (or no condition is given), `false` otherwise
 */
export function attrMatches<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Element<T, O>,
	condition: Attribute['condition'],
) {
	if (condition == null) {
		return true;
	}

	const condSelector = typeof condition === 'string' ? condition : condition.join(',');

	return node.matches(condSelector);
}

/**
 * Tests whether a string matches a given pattern. The pattern can be either
 * a plain string (tested for exact equality) or a regular expression literal
 * in the form `/pattern/flags`.
 *
 * @param needle - The string to test
 * @param pattern - A plain string or a regex literal string (e.g. `/^foo/i`)
 * @returns `true` if the needle matches the pattern
 */
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

/**
 * Validates an attribute name/value pair against its specification.
 * Checks attribute existence in the spec, value validity, conditional applicability,
 * and skips validation for dynamic (template-interpolated) values when the error
 * relates to an invalid value.
 *
 * @param t - The i18n translator for generating localized error messages
 * @param name - The attribute name to validate
 * @param value - The attribute value to validate
 * @param isDynamicValue - Whether the value is dynamic (e.g. from a template expression);
 *   if `true`, invalid-value errors are suppressed
 * @param node - The element that owns the attribute
 * @param attrSpecs - The list of attribute specifications to validate against
 * @param log - Optional debug logger for diagnostic output
 * @returns `false` if valid, or an `Invalid` object (or array of them) describing the violation
 */
export function isValidAttr(
	t: Translator,
	name: string,
	value: string,
	isDynamicValue: boolean,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Element<any, any>,
	attrSpecs: readonly Attribute[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	log?: Log,
) {
	let spec = attrSpecs.find(s => s.name.toLowerCase() === name.toLowerCase());
	log?.('Spec of the %s attr: %o', name, spec);

	// Resolve ConditionalAttributeType[] to a concrete type based on element matching (#3598).
	if (spec && isConditionalAttributeTypeArray(spec.type)) {
		const matched = spec.type.find(entry => {
			const cond = typeof entry.condition === 'string' ? entry.condition : entry.condition.join(',');
			return node.matches(cond);
		});
		log?.('ConditionalAttributeType resolution for %s: %o', name, matched);
		spec = { ...spec, type: matched ? matched.type : 'Any' };
	}

	const allAttrNames = attrSpecs.map(s => s.name);
	let invalid: ReturnType<typeof attrCheck> = attrCheck(t, name, value, false, spec, allAttrNames);
	if (
		invalid === false &&
		spec &&
		spec.condition != null &&
		!node.hasSpreadAttr &&
		!attrMatches(node, spec.condition)
	) {
		invalid = {
			invalidType: 'non-existent',
			message: t('{0} is {1}', t('the "{0*}" {1}', name, 'attribute'), 'disallowed'),
		};
	}
	if (invalid !== false && (Array.isArray(invalid) || invalid.invalidType === 'invalid-value') && isDynamicValue) {
		invalid = false;
	}
	return invalid;
}

/**
 * Normalizes an attribute value according to its specification rules.
 * Applies case-folding, whitespace trimming, and separator normalization
 * based on the attribute type definition.
 *
 * @param value - The raw attribute value to normalize
 * @param spec - The attribute specification that defines normalization rules
 *   (case sensitivity, separator type, whitespace handling)
 * @returns The normalized attribute value
 */
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

/**
 * Determines whether an element's accessible name may change at runtime.
 * Returns `true` if the element itself has mutable attributes or children,
 * or if an associated `<label>` element has mutable content.
 *
 * @param el - The element whose accessible name stability is being checked
 * @param document - The document containing the element, used to locate associated labels
 * @returns `true` if the accessible name could change dynamically, `false` otherwise
 */
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

export const labelable = ['button', 'input:not([type=hidden])', 'meter', 'output', 'progress', 'select', 'textarea'];
/**
 * Finds the `<label>` element associated with a labelable form element.
 * First checks for an ancestor `<label>`, then looks for a `<label>` whose
 * `for` attribute references the element's `id`. Returns `null` if the
 * element is not labelable or no associated label is found.
 *
 * @template V - The rule configuration value type
 * @template O - The rule options type
 * @param el - The element to find a label for (must be a labelable element)
 * @param document - The document to search for labels with a matching `for` attribute
 * @returns The associated `<label>` element, or `null` if none is found
 */
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

/**
 * A generic, null-safe collection backed by a `Set`.
 * Automatically filters out `null` and `undefined` values when items are added.
 * Implements the iterable protocol so it can be used in `for...of` loops.
 *
 * @template T - The type of items stored in the collection
 */
export class Collection<T> {
	#items = new Set<T>();

	/**
	 * Creates a new collection, optionally pre-populated with the given items.
	 * Any `null` or `undefined` values are silently ignored.
	 *
	 * @param items - Initial items to add to the collection
	 */
	constructor(...items: readonly (T | null | undefined)[]) {
		this.add(...items);
	}

	/**
	 * Returns an iterator over the items in the collection.
	 *
	 * @returns An iterator that yields each item in insertion order
	 */
	[Symbol.iterator](): Iterator<T> {
		return this.#items.values();
	}

	/**
	 * Adds one or more items to the collection.
	 * Any `null` or `undefined` values are silently ignored.
	 *
	 * @param items - Items to add to the collection
	 */
	add(...items: readonly (T | null | undefined)[]) {
		for (const item of items) {
			if (item == null) {
				continue;
			}
			this.#items.add(item);
		}
	}

	/**
	 * Returns a frozen array snapshot of the collection's contents.
	 *
	 * @returns A read-only array containing all items in insertion order
	 */
	toArray() {
		return Object.freeze([...this.#items]);
	}
}

/**
 * Creates a deep, writable copy of the given value using structured cloning.
 * Strips read-only modifiers from the result type so the clone can be freely mutated.
 *
 * @template T - The type of the value to clone
 * @param value - The value to deep-copy
 * @returns A mutable deep clone of the input value
 */
export function deepCopy<T>(value: T): WritableDeep<T> {
	return structuredClone(value as any) as WritableDeep<T>;
}

/**
 * Computes a removal range from a list of nullable tokens.
 * Filters out null/undefined tokens and tokens with empty `raw`,
 * then returns the range spanning from the first to the last token.
 *
 * @param tokens - An array of nullable tokens to compute the range from
 * @returns `[start, end]` tuple, or `null` if no valid tokens
 */
function tokenRange(tokens: readonly (FixToken | null | undefined)[]): readonly [number, number] | null {
	const valid = tokens.filter((t): t is FixToken => t != null && t.raw.length > 0);
	const first = valid[0];
	const last = valid.at(-1);
	if (!first || !last) {
		return null;
	}
	return [first.startOffset, last.startOffset + last.raw.length];
}

/**
 * Creates a fix that removes an entire attribute (name + value + surrounding whitespace).
 * Used by rules that need to remove a whole attribute from an element.
 *
 * @param fixer - The rule fixer instance for building TextEdits
 * @param attr - The attribute token parts to remove (from `spacesBeforeName` through `endQuote`)
 * @returns A TextEdit (or empty array if no valid tokens exist) that removes the attribute
 */
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

/**
 * Creates a fix that removes only the value portion of an attribute
 * (equals sign, quotes, and value), keeping the attribute name.
 * Used by `no-boolean-attr-value` to convert `disabled="disabled"` to `disabled`.
 *
 * @param fixer - The rule fixer instance for building TextEdits
 * @param attr - The attribute token parts to remove (from `spacesBeforeEqual` through `endQuote`)
 * @returns A TextEdit (or empty array if no valid tokens exist) that removes the value portion
 */
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
