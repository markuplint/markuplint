import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Per the HTML spec, a `<select>` with `required`, without `multiple`, and with a
 * display size of 1 must have a placeholder label option (first `<option>` with
 * an empty value directly under `<select>`).
 */
export default createRule<boolean>({
	meta: meta,
	verify({ document, report, t }) {
		for (const select of document.querySelectorAll('select')) {
			if (hasPlaceholderLabelOption(select)) {
				continue;
			}

			if (!needPlaceholderLabelOption(select)) {
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
	const hasRequired = select.hasAttribute('required');
	if (!hasRequired) {
		return false;
	}

	const hasMultiple = select.hasAttribute('multiple');
	if (hasMultiple) {
		return false;
	}

	const size = select.getAttribute('size') ?? '1';
	if (size !== '1') {
		return false;
	}

	return true;
}

/**
 * HTML LS §4.10.7 The select element — placeholder label option definition:
 *
 * > If a select element has a required attribute specified, and has a
 * > display size of 1; and if the value of the first option element in the
 * > select element's list of options (if any) is the empty string, and that
 * > option element's parent node is the select element (and not an optgroup
 * > element), then that option is the select element's placeholder label
 * > option.
 *
 * The "(if any)" clause requires a first option to exist for the placeholder
 * label option to exist at all; an empty `<select>` therefore has no
 * placeholder label option and must be reported by `verify`.
 *
 * @see https://html.spec.whatwg.org/multipage/form-elements.html#placeholder-label-option
 */
function hasPlaceholderLabelOption(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	select: Element<boolean>,
) {
	// > has a required attribute specified
	if (!select.hasAttribute('required')) {
		return false;
	}

	// > does not have a multiple attribute specified
	if (select.hasAttribute('multiple')) {
		return false;
	}

	// > has a display size of 1
	const size = select.getAttribute('size') ?? '1';
	if (size !== '1') {
		return false;
	}

	// > the value of the first option element in the select element's list of options … is the empty string
	// No first option → no placeholder label option exists.
	const firstOption = select.querySelector('option');
	if (!firstOption) {
		return false;
	}

	// > that option element's parent node is the select element (and not an optgroup element)
	if (firstOption.parentElement?.localName === 'optgroup') {
		return false;
	}

	const value = firstOption.getAttribute('value');

	return value === '' || value === null;
}
