import type { SelectorElement, SelectorResult } from '../types.js';

import { getSelectDisplaySize, resolveNamespace } from '@markuplint/ml-spec';

import { foldAttrName } from '../fold-attr-name.js';
import { InvalidSelectorError } from '../invalid-selector-error.js';
import { typeNameMatches } from '../type-name.js';

type Operator = '=' | '>' | '>=' | '<' | '<=';

/**
 * An attribute selector cannot tell the display size of a `<select>`. It is the result of the rules
 * for parsing non-negative integers applied to `size` (leading whitespace, `+`, leading zeros and
 * trailing characters are all allowed), and falls back to 1, or to 4 with `multiple`, when that fails
 * or the attribute is absent. `[size]:not([size='1'])` takes `size="01"` and `size="abc"` (display
 * size 1) for a display size other than 1. The content model of `<canvas>` and the implicit role of
 * `<select>` both depend on that value.
 *
 * It matches only a `<select>` in the HTML namespace, and never an element of another name.
 * The value is read from the text of the attribute as it is written, as every selector does: a
 * template expression (`:size="n"`) is not told apart from a literal.
 *
 * @param content - What is written in the parentheses
 * @returns The matcher of the pseudo-class
 * @throws {InvalidSelectorError} When `content` is not an operator followed by a number. It is read when the
 * selector is created, so a configuration that holds it is reported as the fault of the configuration
 * @see https://html.spec.whatwg.org/multipage/form-elements.html#concept-select-size
 */
export function displaySizePseudoClass() {
	return (content: string) => {
		const { operator, value } = parse(content);

		return (
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			el: SelectorElement,
		): SelectorResult => {
			if (isHTMLSelect(el) && compare(readDisplaySize(el), operator, value)) {
				return {
					specificity: [0, 1, 0],
					matched: true,
					nodes: [el],
					has: [],
				};
			}
			return {
				specificity: [0, 1, 0],
				matched: false,
			};
		};
	};
}

function parse(content: string): { readonly operator: Operator; readonly value: number } {
	const matched = /^\s*(>=|<=|[=><])\s*(\d+)\s*$/.exec(content);
	if (!matched) {
		throw new InvalidSelectorError(`:display-size(${content})`, `Unsupported syntax: ${content}`);
	}
	return {
		operator: matched[1] as Operator,
		value: Number(matched[2]),
	};
}

function compare(size: number, operator: Operator, value: number): boolean {
	switch (operator) {
		case '=': {
			return size === value;
		}
		case '>': {
			return size > value;
		}
		case '>=': {
			return size >= value;
		}
		case '<': {
			return size < value;
		}
		case '<=': {
			return size <= value;
		}
	}
}

function isHTMLSelect(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: SelectorElement,
): boolean {
	return (
		el.tagNameKind !== 'component' &&
		typeNameMatches('select', el) &&
		resolveNamespace(el.localName, el.namespaceURI).namespace === 'html'
	);
}

function readDisplaySize(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: SelectorElement,
): number {
	let size: string | null = null;
	let hasMultiple = false;
	for (const attr of el.attributes) {
		// An attribute that the framework does not output is not an attribute of the DOM
		if (attr.absent) {
			continue;
		}
		const name = foldAttrName(attr, el, attr.domName ?? attr.localName);
		if (name === 'size') {
			size ??= attr.value;
		} else if (name === 'multiple') {
			hasMultiple = true;
		}
	}
	return getSelectDisplaySize(size, hasMultiple);
}
