import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

export default createRule<boolean>({
	verify({ document, report, t }) {
		document.querySelectorAll('select').forEach(select => {
			const required = select.getAttributeNode('required');

			if (!required) {
				return;
			}

			if (!hasPlaceholderLabelOption(select)) {
				report({
					scope: required,
					message: t(
						'{0} if it has {1}',
						t('need {0}', t('the {0}', 'placeholder label option')),
						t('the "{0*}" {1}', 'required', 'attribute'),
					),
				});
			}
		});
	},
});

function hasPlaceholderLabelOption(select: Element<boolean>) {
	// has a required attribute specified
	if (!select.hasAttribute('required')) {
		return false;
	}

	// does not have a multiple attribute specified
	if (select.hasAttribute('multiple')) {
		return false;
	}

	// has a display size of 1
	const size = select.getAttribute('size') || '1';
	if (size !== '1') {
		return false;
	}

	// in the select element's list of options (if any) is the empty string
	const firstOption = select.querySelector('option');
	if (!firstOption) {
		// if any
		return true;
	}

	// that option element's parent node is the select element (and not an optgroup element)
	if (firstOption.parentElement?.localName === 'optgroup') {
		return false;
	}

	const value = firstOption.getAttribute('value');

	return value === '' || value === null;
}
