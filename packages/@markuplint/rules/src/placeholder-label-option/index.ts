import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

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
 * > If a select element has a required attribute specified,
 * > does not have a multiple attribute specified,
 * > and has a display size of 1,
 * > then the select element must have a placeholder label option.
 *
 * @param select
 * @returns
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
 * > If a select element has a required attribute specified,
 * > does not have a multiple attribute specified,
 * > and has a display size of 1;
 * > and if the value of the first option element
 * > in the select element's list of options (if any) is the empty string,
 * > and that option element's parent node is the select element (and not an optgroup element),
 * > then that option is the select element's **placeholder label option**.
 *
 * @param select
 * @returns
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
