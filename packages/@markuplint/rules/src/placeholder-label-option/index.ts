import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';
import { getSelectDisplaySize } from '@markuplint/ml-spec';
import { decodeEntities } from '@markuplint/shared';

import meta from './meta.js';

/**
 * HTML LS §4.10.7 The select element:
 *
 * > If a select element has a required attribute specified, does not have a
 * > multiple attribute specified, and has a display size of 1, then the
 * > select element must have a placeholder label option.
 *
 * `needPlaceholderLabelOption` gates whether the requirement applies to this
 * `<select>`; `hasPlaceholderLabelOption` then decides whether an existing
 * option already satisfies it.
 *
 * @see https://html.spec.whatwg.org/multipage/form-elements.html#the-select-element
 */
export default createRule<boolean>({
	meta: meta,
	verify({ document, report, t }) {
		for (const select of document.deepQuerySelectorAll('select')) {
			if (!needPlaceholderLabelOption(select)) {
				continue;
			}

			if (hasPlaceholderLabelOption(select)) {
				continue;
			}

			report({
				scope: select,
				message: t('need {0}', t('the {0}', 'placeholder label option')),
			});
		}
	},
});

/**
 * HTML LS §4.10.7 The select element:
 *
 * > If a select element has a required attribute specified, does not have a
 * > multiple attribute specified, and has a display size of 1, then the
 * > select element must have a placeholder label option.
 *
 * @see https://html.spec.whatwg.org/multipage/form-elements.html#the-select-element
 */
function needPlaceholderLabelOption(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	select: Element<boolean>,
) {
	const hasRequired = select.hasAttr('required');
	if (!hasRequired) {
		return false;
	}

	const hasMultiple = select.hasAttr('multiple');
	if (hasMultiple) {
		return false;
	}

	return displaySize(select) === 1;
}

/**
 * HTML LS §4.10.7 The select element — placeholder label option definition:
 *
 * > If a select element has a required attribute specified, and has a display size of 1; and if the value of the first
 * > option element in the select element's list of options (if any) is the empty string, and that option element does
 * > not have an ancestor optgroup in between itself and the select element, then that option is the select element's
 * > placeholder label option.
 *
 * The conditions on the `<select>` itself (required, display size) are
 * `needPlaceholderLabelOption`'s, which `verify` asks first; this decides the
 * rest. The "(if any)" clause requires a first option to exist for the
 * placeholder label option to exist at all; an empty `<select>` therefore has
 * no placeholder label option and must be reported by `verify`.
 *
 * @see https://html.spec.whatwg.org/multipage/form-elements.html#placeholder-label-option
 */
function hasPlaceholderLabelOption(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	select: Element<boolean>,
) {
	// > the first option element in the select element's list of options (if any)
	// No first option → no placeholder label option exists.
	const first = firstOption(select, false);
	if (!first) {
		return false;
	}

	// > does not have an ancestor optgroup in between itself and the select element
	if (first.insideOptgroup) {
		return false;
	}

	// > the value of [it] is the empty string
	// An option whose value cannot be known (a template interpolation as its text) is not reported.
	const value = optionValue(first.option);
	return value === '' || value === null;
}

/**
 * The display size of a `<select>`, as {@link getSelectDisplaySize} defines it.
 *
 * `null` when the size is given by an expression (`:size="n"`, `size={n}`): it
 * is not known until the template runs, so the rule must not assume it is 1.
 */
function displaySize(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	select: Element<boolean>,
): number | null {
	const size = select.getAttrNode('size');
	if (size?.isDynamicValue) {
		return null;
	}
	return getSelectDisplaySize(size?.value ?? null, select.hasAttr('multiple'));
}

/**
 * The first option of a select's list of options, and whether an optgroup lies
 * between it and the select.
 *
 * Following the algorithm literally, an `option` found while descending is
 * appended and its subtree is skipped; so are the subtrees of a nested `select`,
 * `hr` or `datalist`, and of an `optgroup` that has an `optgroup` ancestor below
 * the select. Any other element, such as the wrapper that a customizable select
 * allows, is looked through.
 *
 * @see https://html.spec.whatwg.org/multipage/form-elements.html#concept-select-option-list
 */
function firstOption(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	parent: Element<boolean>,
	insideOptgroup: boolean,
): { option: Element<boolean>; insideOptgroup: boolean } | null {
	for (const child of parent.childNodes) {
		if (!child.is(child.ELEMENT_NODE)) {
			continue;
		}
		switch (child.localName) {
			case 'option': {
				return { option: child, insideOptgroup };
			}
			case 'select':
			case 'hr':
			case 'datalist': {
				continue;
			}
			case 'optgroup': {
				if (insideOptgroup) {
					continue;
				}
				const found = firstOption(child, true);
				if (found) {
					return found;
				}
				continue;
			}
			default: {
				const found = firstOption(child, insideOptgroup);
				if (found) {
					return found;
				}
			}
		}
	}
	return null;
}

/**
 * The value of an `<option>`, or `null` when it cannot be known statically.
 *
 * > The value of an option element is the value of the value content attribute, if there is one, or, if there is not,
 * > the result of get HTML-aware text content given this and false.
 *
 * @see https://html.spec.whatwg.org/multipage/form-elements.html#attr-option-value
 */
function optionValue(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	option: Element<boolean>,
): string | null {
	const valueAttr = option.getAttrNode('value');
	if (valueAttr) {
		// A value given by an expression (`:value="v"`, `value={v}`) is not known until the template runs.
		return valueAttr.isDynamicValue ? null : valueAttr.value;
	}
	const text = htmlAwareTextContent(option);
	return text === null ? null : stripAndCollapseAsciiWhitespace(text);
}

/**
 * Get HTML-aware text content with `includeAltText` false: the data of the
 * Text descendants. The algorithm also skips `script` and `img` subtrees; that
 * changes nothing here, because the HTML parser's tree does not expose a
 * script's source as a Text node and an `img` has no text descendants.
 * `null` when a template construct stands where text would be.
 *
 * @see https://html.spec.whatwg.org/multipage/form-elements.html#get-html-aware-text-content
 */
function htmlAwareTextContent(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	element: Element<boolean>,
): string | null {
	let text = '';
	for (const child of element.childNodes) {
		if (child.is(child.TEXT_NODE)) {
			// The node holds the source text; a character reference such as `&#32;` has to be decoded first.
			text += decodeEntities(child.textContent ?? '');
		} else if (child.is(child.ELEMENT_NODE)) {
			const inner = htmlAwareTextContent(child);
			if (inner === null) {
				return null;
			}
			text += inner;
		} else if (child.is(child.MARKUPLINT_PREPROCESSOR_BLOCK)) {
			return null;
		}
	}
	return text;
}

/** ASCII whitespace only: `trim()` would also strip a no-break space, which is part of the text. */
function stripAndCollapseAsciiWhitespace(text: string): string {
	return text.replaceAll(/[\t\n\f\r ]+/g, ' ').replaceAll(/^ | $/g, '');
}
