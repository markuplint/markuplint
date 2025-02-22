import type { ARIAVersion, MLMLSpec } from '../types/index.js';

import { ariaSpecs } from '../specs/aria-specs.js';
import { getSpecByTagName } from '../specs/get-spec-by-tag-name.js';
import { isPresentational } from '../specs/is-presentational.js';
import { resolveNamespace } from '../utils/resolve-namespace.js';

import { getComputedRole } from './get-computed-role.js';

/**
 * Detect including/excluding from the Accessibility Tree
 *
 * @see https://www.w3.org/TR/wai-aria-1.2/#accessibility_tree
 *
 * @param specs
 * @param el
 * @param version
 */
export function isExposed(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
): boolean {
	// According to WAI-ARIA
	if (isExcluding(el, specs, version)) {
		return false;
	}

	// Return true if the element is unknown, deprecated, or obsolete.
	const { localName, namespace } = resolveNamespace(el.localName, el.namespaceURI);
	const spec = getSpecByTagName(specs.specs, localName, namespace);
	if (!spec || spec.deprecated || spec.obsolete != null) {
		return true;
	}

	// According to HTML and SVG Specs with **the author's interpretation**
	{
		if (!isExposedElement(el, specs)) {
			return false;
		}
	}

	// According to WAI-ARIA
	{
		const exposable = isIncluding(el, specs, version);
		if (exposable) {
			return true;
		}
	}

	// Default
	return true;
}

/**
 * Excluding Elements from the Accessibility Tree
 *
 * @see https://www.w3.org/TR/wai-aria-1.2/#tree_exclusion
 *
 * @param specs
 * @param el
 * @param version
 */
function isExcluding(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
): boolean {
	/**
	 * The following elements are not exposed via the accessibility API and
	 * user agents MUST NOT include them in the accessibility tree:
	 * - Elements, including their descendent elements,
	 *   that have host language semantics specifying
	 *   that the element is not displayed, such as CSS display:none,
	 *   visibility:hidden, or the HTML hidden attribute.
	 */
	{
		let currentEl: Element | null = el;
		while (currentEl) {
			if (hasDisplayNodeOrVisibilityHidden(currentEl) || currentEl.hasAttribute('hidden')) {
				return true;
			}
			currentEl = currentEl.parentElement;
		}
	}

	/**
	 * - Elements with none or presentation as the first role in the role attribute.
	 *   However, their exclusion is conditional. In addition,
	 *   the element's descendants and text content are generally included.
	 *   These exceptions and conditions are documented in the presentation (role)
	 *   section.
	 */
	if (isPresentational((el.getAttribute('role') ?? '').split(/\s+/)[0])) {
		return true;
	}

	/**
	 * If not already excluded from the accessibility tree per the above rules,
	 * user agents SHOULD NOT include the following elements
	 * in the accessibility tree:
	 * - Elements, including their descendants, that have aria-hidden set to true.
	 *   In other words, aria-hidden="true" on a parent overrides aria-hidden="false"
	 *   on descendants.
	 */
	{
		let currentEl: Element | null = el;
		while (currentEl) {
			if (currentEl.getAttribute('aria-hidden') === 'true') {
				return true;
			}
			currentEl = currentEl.parentElement;
		}
	}

	/**
	 * - Any descendants of elements that have the characteristic
	 *   "Children Presentational: True" unless the descendant
	 *   is not allowed to be presentational because it meets one of
	 *   the conditions for exception described in
	 *   Presentational Roles Conflict Resolution.
	 *   However, the text content of any excluded descendants is included.
	 */
	{
		let currentEl = el.parentElement;
		while (currentEl) {
			const { role } = getComputedRole(specs, currentEl, version);
			if (role?.childrenPresentational) {
				return true;
			}
			currentEl = currentEl.parentElement;
		}
	}

	return false;
}

/**
 * Including Elements in the Accessibility Tree
 *
 * If not excluded from or marked as hidden in the accessibility tree
 * per the rules above in Excluding Elements in the Accessibility Tree,
 * user agents MUST provide an accessible object in the accessibility tree
 * for DOM elements that meet any of the following criteria:
 *
 * @see https://www.w3.org/TR/wai-aria-1.2/#tree_inclusion
 *
 * @param specs
 * @param el
 * @param version
 */
function isIncluding(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
): boolean {
	/**
	 * > **meet any** of the following criteria:
	 */
	const results: boolean[] = [];

	/**
	 * Elements that are not hidden and may fire an accessibility API event,
	 * including:
	 * - Elements that are currently focused, even if the element or one of
	 *   its ancestor elements has its aria-hidden attribute set to true.
	 */
	// 🚫 Can't detect the element is focused.
	// results.push(true);

	/**
	 * - Elements that are a valid target of an aria-activedescendant attribute.
	 */
	// TODO: Compute aria-activedescendant.
	// results.push(true);

	/**
	 * Elements that have an explicit role or a global WAI-ARIA attribute and
	 * do not have aria-hidden set to true.
	 * (See Excluding Elements in the Accessibility Tree for
	 * additional guidance on aria-hidden.)
	 */
	if (el.getAttribute('aria-hidden') !== 'true') {
		const globalAria = ariaSpecs(specs, version).props.filter(prop => !!prop.isGlobal);
		const { role } = getComputedRole(specs, el, version);
		// Has an explicit role
		if (role && !role.isImplicit) {
			results.push(true);
		}
		// Has a global WAI-ARIA attribute
		for (const attr of el.attributes) {
			if (globalAria.some(aria => aria.name === attr.localName)) {
				results.push(true);
				break;
			}
		}
	}

	/**
	 * Elements that are not hidden and have an ID that is referenced
	 * by another element via a WAI-ARIA property.
	 */
	// TODO: Compute refering ID.
	// results.push(true);

	return results.includes(true);
}

function hasDisplayNodeOrVisibilityHidden(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
) {
	const style = el.getAttribute('style');
	if (!style) {
		return false;
	}
	// TODO: Improve accuracy
	return /display\s*:\s*none|visibility\s*:\s*hidden/i.test(style);
}

function isExposedElement(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
) {
	const svgRenderedConditions = specs.def['#contentModels']['#SVGRenderable']?.join(',');

	if (svgRenderedConditions && el.matches(svgRenderedConditions)) {
		return true;
	}

	return isNotMetaOrHiddenHTMLElement(el, specs);
}

function isNotMetaOrHiddenHTMLElement(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
) {
	const metadataConditions = specs.def['#contentModels']['#metadata']?.join(',');

	if (metadataConditions && el.matches(metadataConditions)) {
		return false;
	}

	return !el.matches('input[type=hidden i]');
}
