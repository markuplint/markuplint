import type { UnsupportedResult } from './compat-data.js';

import { createRule } from '@markuplint/ml-core';

import { checkAttributeSupport, checkElementSupport } from './compat-data.js';
import meta from './meta.js';
import { clearBrowserslistCache, resolveTargetBrowsers } from './resolve-browsers.js';

/**
 * Options for the `no-unsupported-browser-features` rule.
 */
type Options = {
	/** A browserslist query to override project configuration. */
	readonly browserslist?: string | readonly string[];
	/** Explicit path to a browserslist configuration file. */
	readonly browserslistConfig?: string;
	/** Browserslist environment name (e.g., "production"). */
	readonly browserslistEnv?: string;
	/** Features to ignore. Element name ("dialog") or attribute pattern ("input[list]"). */
	readonly ignoreFeatures?: readonly string[];
};

export default createRule<boolean, Options>({
	meta: meta,
	defaultSeverity: 'warning',
	defaultOptions: {},
	async verify({ document, report, t }) {
		const options = document.rule.options;
		const targetBrowsers = resolveTargetBrowsers(document.filename, {
			browserslist: options.browserslist,
			browserslistConfig: options.browserslistConfig,
			browserslistEnv: options.browserslistEnv,
		});

		// Without a browserslist configuration, there is nothing to check against.
		if (targetBrowsers == null || targetBrowsers.length === 0) {
			return;
		}

		const ignoreFeatures = new Set(options.ignoreFeatures);

		await document.walkOn('Element', async el => {
			// Web components and authored elements (JSX/Vue/Svelte) reach this rule
			// via `pretenders`: they masquerade as a known HTML element on `el.localName`,
			// so BCD lookups below resolve correctly. See #3740.
			if (
				el.namespaceURI !== 'http://www.w3.org/1999/xhtml' ||
				(el.elementType !== 'html' && el.pretenderContext?.type !== 'pretender')
			) {
				return;
			}

			const elName = el.localName;
			const elOptions = el.rule.options;
			const elIgnoreFeatures = new Set(elOptions.ignoreFeatures ?? ignoreFeatures);

			if (!elIgnoreFeatures.has(elName)) {
				const unsupported = await checkElementSupport(elName, targetBrowsers);
				if (unsupported.length > 0) {
					report({
						scope: el,
						message: formatUnsupportedMessage(t, elName, 'element', unsupported),
					});
				}
			}

			for (const attr of el.attributes) {
				if (attr.isDirective) {
					continue;
				}

				const attrName = attr.name;
				const ignoreKey = `${elName}[${attrName}]`;

				if (elIgnoreFeatures.has(ignoreKey)) {
					continue;
				}

				const unsupported = await checkAttributeSupport(elName, attrName, targetBrowsers);
				if (unsupported.length > 0) {
					report({
						scope: attr,
						line: attr.nameNode?.startLine,
						col: attr.nameNode?.startCol,
						raw: attr.nameNode?.raw,
						message: formatUnsupportedMessage(t, attrName, 'attribute', unsupported),
					});
				}
			}
		});

		clearBrowserslistCache();
	},
});

/**
 * Format an unsupported feature message listing affected browsers.
 */
function formatUnsupportedMessage(
	t: Parameters<Parameters<typeof createRule>[0]['verify']>[0]['t'],
	featureName: string,
	featureType: string,

	unsupported: readonly UnsupportedResult[],
): string {
	const browserDetails = unsupported
		.map(u => {
			if (u.addedVersion === false) {
				if (u.removedVersion) {
					return `${u.displayName} (removed in ${u.removedVersion})`;
				}
				return `${u.displayName} (not supported)`;
			}
			return `${u.displayName} (added in ${u.addedVersion}, target: ${u.targetVersion})`;
		})
		.join(', ');

	return t('{0} is not supported in {1}', t('the "{0*}" {1}', featureName, featureType), browserDetails);
}
