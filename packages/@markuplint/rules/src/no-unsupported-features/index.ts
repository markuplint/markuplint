import type { UnsupportedResult } from './compat-data.js';

import { createRule, getAttrSpecs, getSpec } from '@markuplint/ml-core';

import { checkAttributeSupport, checkElementSupport } from './compat-data.js';
import meta from './meta.js';
import { clearBrowserslistCache, resolveTargetBrowsers } from './resolve-browsers.js';

/**
 * Options for the `no-unsupported-features` rule.
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
	/** Whether to warn about experimental elements and attributes. */
	readonly checkExperimental?: boolean;
	/** Whether to warn about non-standard elements and attributes. */
	readonly checkNonStandard?: boolean;
};

/**
 * Rule that warns when using HTML elements or attributes that are not
 * supported by the project's target browsers (via browserslist),
 * or that are experimental/non-standard.
 */
export default createRule<boolean, Options>({
	meta: meta,
	defaultSeverity: 'warning',
	defaultOptions: {
		checkExperimental: false,
		checkNonStandard: false,
	},
	async verify({ document, report, t }) {
		const options = document.rule.options;
		const targetBrowsers = resolveTargetBrowsers(document.filename, {
			browserslist: options.browserslist,
			browserslistConfig: options.browserslistConfig,
			browserslistEnv: options.browserslistEnv,
		});

		const hasTargetBrowsers = targetBrowsers != null && targetBrowsers.length > 0;
		const checkExperimental = options.checkExperimental ?? false;
		const checkNonStandard = options.checkNonStandard ?? false;

		// If no browserslist config and no experimental/nonStandard check, rule is no-op
		if (!hasTargetBrowsers && !checkExperimental && !checkNonStandard) {
			return;
		}

		const ignoreFeatures = new Set(options.ignoreFeatures);

		await document.walkOn('Element', async el => {
			// Web components and authored elements (JSX/Vue/Svelte) reach this rule
			// via `pretenders`: they masquerade as a known HTML element on `el.localName`,
			// so spec / BCD lookups below resolve correctly. See #3740.
			if (
				el.namespaceURI !== 'http://www.w3.org/1999/xhtml' ||
				(el.elementType !== 'html' && el.pretenderContext?.type !== 'pretender')
			) {
				return;
			}

			const elName = el.localName;
			const elOptions = el.rule.options;
			const elIgnoreFeatures = new Set(elOptions.ignoreFeatures ?? ignoreFeatures);

			// Check element itself
			if (!elIgnoreFeatures.has(elName)) {
				// Experimental check (spec-based, no BCD needed)
				if (elOptions.checkExperimental ?? checkExperimental) {
					const spec = getSpec(el, document.specs.specs);
					if (spec?.experimental) {
						report({
							scope: el,
							message: t('{0} is {1:c}', t('the "{0*}" {1}', elName, 'element'), 'experimental'),
						});
					}
				}

				// NonStandard check (spec-based, no BCD needed)
				if (elOptions.checkNonStandard ?? checkNonStandard) {
					const spec = getSpec(el, document.specs.specs);
					if (spec?.nonStandard) {
						report({
							scope: el,
							message: t('{0} is {1:c}', t('the "{0*}" {1}', elName, 'element'), 'non-standard'),
						});
					}
				}

				// Browser support check (BCD-based)
				if (hasTargetBrowsers) {
					const unsupported = await checkElementSupport(elName, targetBrowsers);
					if (unsupported.length > 0) {
						report({
							scope: el,
							message: formatUnsupportedMessage(t, elName, 'element', unsupported),
						});
					}
				}
			}

			// Check attributes
			const attrSpecs = getAttrSpecs(el, document.specs);

			for (const attr of el.attributes) {
				if (attr.isDirective) {
					continue;
				}

				const attrName = attr.name;
				const ignoreKey = `${elName}[${attrName}]`;

				if (elIgnoreFeatures.has(ignoreKey)) {
					continue;
				}

				const attrSpec = attrSpecs?.find(s => s.name === attrName);

				// Experimental attribute check
				if ((elOptions.checkExperimental ?? checkExperimental) && attrSpec?.experimental) {
					report({
						scope: attr,
						line: attr.nameNode?.startLine,
						col: attr.nameNode?.startCol,
						raw: attr.nameNode?.raw,
						message: t('{0} is {1:c}', t('the "{0*}" {1}', attrName, 'attribute'), 'experimental'),
					});
				}

				// NonStandard attribute check
				if ((elOptions.checkNonStandard ?? checkNonStandard) && attrSpec?.nonStandard) {
					report({
						scope: attr,
						line: attr.nameNode?.startLine,
						col: attr.nameNode?.startCol,
						raw: attr.nameNode?.raw,
						message: t('{0} is {1:c}', t('the "{0*}" {1}', attrName, 'attribute'), 'non-standard'),
					});
				}

				// Browser support attribute check
				if (hasTargetBrowsers) {
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
