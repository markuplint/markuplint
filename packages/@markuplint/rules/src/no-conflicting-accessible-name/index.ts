import type { ARIAVersion } from '@markuplint/ml-spec';

import { createRule } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION, hasAssociatedLabelElement, hasParentLabelElement } from '@markuplint/ml-spec';

import meta from './meta.js';

type Option = {
	ariaVersion: ARIAVersion;
};

export default createRule<boolean, Option>({
	meta: meta,
	defaultOptions: {
		ariaVersion: ARIA_RECOMMENDED_VERSION,
	},
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			const conflicts = detectAccessibleNameConflicts(el);
			
			if (conflicts.length > 0) {
				const conflictDescriptions = conflicts.map(conflict => conflict.description).join(' and ');
				report({ 
					scope: el, 
					message: t('Multiple accessible name sources detected: {0}', conflictDescriptions)
				});
			}
		});
	},
});

interface AccessibleNameConflict {
	type: 'label-and-aria-labelledby' | 'label-and-aria-label' | 'multiple-labels';
	description: string;
}

function detectAccessibleNameConflicts(el: any): AccessibleNameConflict[] {
	const conflicts: AccessibleNameConflict[] = [];
	const tagName = el.tagName?.toLowerCase();
	
	// Only check form elements and other elements that can have labels
	if (!['input', 'textarea', 'select', 'button'].includes(tagName)) {
		return conflicts;
	}
	
	const hasAriaLabel = el.hasAttribute('aria-label');
	const hasAriaLabelledby = el.hasAttribute('aria-labelledby');
	const hasAssociatedLabel = hasAssociatedLabelElement(el);
	const hasParentLabel = hasParentLabelElement(el);
	
	// Check for label + aria-labelledby conflict
	if ((hasAssociatedLabel || hasParentLabel) && hasAriaLabelledby) {
		conflicts.push({
			type: 'label-and-aria-labelledby',
			description: '<label> element and aria-labelledby attribute'
		});
	}
	
	// Check for label + aria-label conflict  
	if ((hasAssociatedLabel || hasParentLabel) && hasAriaLabel) {
		conflicts.push({
			type: 'label-and-aria-label',
			description: '<label> element and aria-label attribute'
		});
	}
	
	// Check for multiple label elements
	if (hasAssociatedLabel && hasParentLabel) {
		conflicts.push({
			type: 'multiple-labels',
			description: 'multiple <label> elements (both associated and parent)'
		});
	}
	
	return conflicts;
}