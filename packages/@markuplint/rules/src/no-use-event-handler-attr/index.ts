import { createRule } from '@markuplint/ml-core';

import { match } from '../helpers.js';

import meta from './meta.js';

/** Configuration options for the `no-use-event-handler-attr` rule. */
type Options = {
	/** Attribute name pattern(s) to exclude from the check. */
	ignore?: string | string[];
};

/**
 * Rule that disallows inline event handler attributes (e.g., `onclick`,
 * `onchange`).
 *
 * Reports any attribute on an HTML element whose name starts with `on`,
 * indicating an inline event handler. An `ignore` option allows specific
 * attribute names or patterns to be excluded from the check.
 */
export default createRule<boolean, Options>({
	meta: meta,
	defaultSeverity: 'warning',
	defaultOptions: {},
	async verify({ document, report, t }) {
		await document.walkOn('Attr', attr => {
			if (attr.ownerElement.elementType !== 'html') {
				return;
			}

			const ignoreList = Array.isArray(attr.rule.options.ignore)
				? attr.rule.options.ignore
				: attr.rule.options.ignore
					? [attr.rule.options.ignore]
					: [];

			const name = attr.name;

			for (const ignore of ignoreList) {
				if (match(name, ignore)) {
					return;
				}
			}

			if (/^on/i.test(name)) {
				report({
					scope: attr,
					raw: attr.raw,
					line: attr.startLine,
					col: attr.startCol,
					message: t('{0} is disallowed', t('the "{0*}" {1}', name, 'attribute')),
				});
			}
		});
	},
});
