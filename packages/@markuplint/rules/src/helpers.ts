import type { Log } from './debug.js';
import type { Translator } from '@markuplint/i18n';
import type { PlainData } from '@markuplint/ml-config';
import type { Element, RuleConfigValue, Document } from '@markuplint/ml-core';
import type { Attribute } from '@markuplint/ml-spec';
import type { WritableDeep } from 'type-fest';

// @ts-ignore
import structuredClone from '@ungap/structured-clone';

import { attrCheck } from './attr-check.js';

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
	let invalid: ReturnType<typeof attrCheck> = false;
	const spec = attrSpecs.find(s => s.name.toLowerCase() === name.toLowerCase());
	log?.('Spec of the %s attr: %o', name, spec);
	invalid = attrCheck(t, name, value, false, spec);
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

export function toNormalizedValue(value: string, spec: Attribute) {
	let normalized = value;

	if (!spec.caseSensitive) {
		normalized = normalized.toLowerCase();
	}

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

const labelable = ['button', 'input:not([type=hidden])', 'meter', 'output', 'progress', 'select', 'textarea'];
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

export function deepCopy<T>(value: T): WritableDeep<T> {
	return structuredClone(value as any) as WritableDeep<T>;
}
