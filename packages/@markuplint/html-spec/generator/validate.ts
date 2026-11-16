/**
 * @module @markuplint/html-spec/generator/validate
 *
 * Offline validation of the generated spec, run before the output is written.
 * Catches data loss from failed scraping or reading (dropped elements, missing ARIA roles).
 *
 * @see https://github.com/markuplint/markuplint/issues/3894
 */

import type { ExtendedSpec } from '@markuplint/ml-spec';

/**
 * Minimum fraction of the previous element count the new spec must retain.
 * A larger drop signals that a source file or the glob that reads them dropped elements.
 */
const ELEMENT_COUNT_STABILITY_THRESHOLD = 0.85;

/**
 * HTML elements that must always be present. Their absence means the source
 * files themselves failed to load (an empty or mis-globbed set), not that one
 * of them lacks an entry.
 */
const REQUIRED_ELEMENTS: readonly string[] = [
	'html',
	'head',
	'body',
	'div',
	'span',
	'p',
	'a',
	'ul',
	'li',
	'table',
	'form',
	'input',
	'button',
	'img',
];

/**
 * ARIA roles that must be present in every ARIA version. Their absence means
 * the ARIA spec scrape returned structurally-valid-but-empty data.
 *
 * Kept to roles defined since ARIA 1.1; version-specific roles (e.g. `generic`,
 * added in 1.2) are intentionally excluded so the check holds for all versions.
 */
const REQUIRED_ARIA_ROLES: readonly string[] = ['button', 'link'];

/**
 * Validates the generated spec and throws on any signal of data loss.
 *
 * The previous (committed) spec is optional: when supplied, the element-count
 * stability check runs against it; on first generation it is skipped.
 *
 * @param json - The freshly generated spec about to be written.
 * @param previous - The previously committed spec, if any, for stability checks. It has no descriptions (see
 *   `finalizeSpec`): compare counts of elements and ARIA entries with it, never text.
 * @throws {Error} When a data-loss signal is detected.
 */
export function validateSpecs(json: ExtendedSpec, previous?: ExtendedSpec | null): void {
	const specs = json.specs ?? [];
	const errors: string[] = [];

	// 1. Required core elements present.
	const names = new Set(specs.map(s => s.name));
	const missingElements = REQUIRED_ELEMENTS.filter(name => !names.has(name));
	if (missingElements.length > 0) {
		errors.push(`Required core elements are missing: ${missingElements.join(', ')}.`);
	}

	// 2. ARIA roles present in every version.
	const aria = json.def?.['#aria'];
	if (aria) {
		for (const version of ['1.1', '1.2', '1.3'] as const) {
			const roles = aria[version]?.roles ?? [];
			if (roles.length === 0) {
				errors.push(`ARIA ${version} has no roles. This indicates an ARIA spec scrape failure.`);
				continue;
			}
			const roleNames = new Set(roles.map(r => (typeof r === 'string' ? r : r.name)));
			const missingRoles = REQUIRED_ARIA_ROLES.filter(name => !roleNames.has(name));
			if (missingRoles.length > 0) {
				errors.push(`ARIA ${version} is missing expected roles: ${missingRoles.join(', ')}.`);
			}
		}
	} else {
		errors.push('ARIA definitions (def["#aria"]) are missing entirely.');
	}

	// 3. Element-count stability against the previous spec (skipped on first run).
	const previousSpecs = previous?.specs;
	if (previousSpecs && previousSpecs.length > 0) {
		const ratio = specs.length / previousSpecs.length;
		if (ratio < ELEMENT_COUNT_STABILITY_THRESHOLD) {
			errors.push(
				`Element count dropped from ${previousSpecs.length} to ${specs.length} ` +
					`(${Math.round(ratio * 100)}% retained, below the ` +
					`${Math.round(ELEMENT_COUNT_STABILITY_THRESHOLD * 100)}% threshold). ` +
					'This likely indicates that source files were dropped or are no longer read.',
			);
		}
	}

	if (errors.length > 0) {
		throw new Error(
			`Spec validation failed (${errors.length} issue${errors.length === 1 ? '' : 's'}); aborting to prevent data loss:\n` +
				errors.map(e => `  - ${e}`).join('\n'),
		);
	}
}
