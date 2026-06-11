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
 * Determines whether a `<select>` element requires a placeholder label option.
 *
 * Per the HTML spec, a select element needs a placeholder label option when it
 * has `required`, does not have `multiple`, and has a display size of 1.
 *
 * @param select - The `<select>` element to evaluate.
 * @returns `true` if the select element requires a placeholder label option.
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
 * Checks whether a `<select>` element already has a valid placeholder label option.
 *
 * A placeholder label option is the first `<option>` whose value is the empty string
 * and whose parent is the `<select>` element itself (not an `<optgroup>`).
 *
 * @param select - The `<select>` element to check.
 * @returns `true` if the element has a valid placeholder label option.
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

	// > in the select element's list of options (if any) is the empty string
	const firstOption = select.querySelector('option');
	if (!firstOption) {
		// if any
		return true;
	}

	// > that option element's parent node is the select element (and not an optgroup element)
	if (firstOption.parentElement?.localName === 'optgroup') {
		return false;
	}

	const value = firstOption.getAttribute('value');

	return value === '' || value === null;
}
