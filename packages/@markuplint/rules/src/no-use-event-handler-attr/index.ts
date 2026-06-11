import { createRule } from '@markuplint/ml-core';

import { match } from '../helpers.js';

import meta from './meta.js';

/** Configuration options for the `no-use-event-handler-attr` rule. */
type Options = {
	/** Attribute name pattern(s) to exclude from the check. */
	ignore?: string | string[];
};

/**
 * Extracts the event name from an attribute name by stripping the `on` prefix
 * and lowercasing. Returns `null` if the attribute is not an event handler.
 */
function extractEventName(attrName: string): string | null {
	const m = /^on(.+)/i.exec(attrName);
	return m?.[1] ? m[1].toLowerCase() : null;
}

/**
 * Tests whether an event name matches a pattern. The pattern is either a plain
 * string (compared case-insensitively) or a regex literal (`/pattern/flags`).
 */
function matchEventName(eventName: string, pattern: string): boolean {
	const regexMatch = /^\/(.*)\/([gim])*$/.exec(pattern);
	if (regexMatch?.[1]) {
		return new RegExp(regexMatch[1], regexMatch[2]).test(eventName);
	}
	return eventName === pattern.toLowerCase();
}

export default createRule<boolean | readonly string[], Options>({
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

			const eventName = extractEventName(name);
			if (eventName == null) {
				return;
			}

			const { value } = attr.rule;

			if (value === true) {
				report({
					scope: attr,
					raw: attr.raw,
					line: attr.startLine,
					col: attr.startCol,
					message: t('{0} is disallowed', t('the "{0*}" {1}', name, 'attribute')),
				});
				return;
			}

			if (Array.isArray(value)) {
				for (const pattern of value) {
					if (matchEventName(eventName, pattern)) {
						report({
							scope: attr,
							raw: attr.raw,
							line: attr.startLine,
							col: attr.startCol,
							message: t('{0} is disallowed', t('the "{0*}" {1}', name, 'attribute')),
						});
						return;
					}
				}
			}
		});
	},
});
