import type { MLElement } from '../node/element.js';
import type { AccnameElement, AccnameResolver, ARIAVersion } from '@markuplint/ml-spec';

import {
	computeAccessibleName,
	escapeCSS,
	getComputedRole,
	EMBEDDED_CONTROL_ROLES,
	isNativeEmbeddedControl,
} from '@markuplint/ml-spec';

import { log } from '../../debug.js';

const accnameLog = log.extend('accname');

/**
 * Computes the accessible name for an MLElement using the HTML-AAM algorithm.
 * Creates an MLCore-specific resolver that bridges MLElement to the AccnameResolver interface.
 *
 * @param el - The MLElement to compute the accessible name for
 * @param version - The ARIA specification version to use for role resolution
 * @returns The computed accessible name string, or an empty string on error
 */
export function getAccname(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<any, any>,
	version: ARIAVersion,
): string {
	// AccName computation involves DOM traversal, role resolution, and label
	// lookup via querySelector. These may fail on unexpected DOM states (e.g.,
	// detached nodes, malformed attributes) or incomplete spec data.
	// A single element's failure must not abort the entire linting process,
	// so we catch operational errors and return an empty name (= "unnamed").
	// Programmer errors (TypeError, ReferenceError) are rethrown to avoid
	// masking implementation bugs.
	try {
		const resolver = createMLCoreResolver(el, version);
		const result = computeAccessibleName(el, resolver);
		return result.name;
	} catch (error) {
		if (error instanceof TypeError || error instanceof ReferenceError) {
			throw error;
		}
		accnameLog('Raw: %s', el.raw);
		accnameLog('Error: %O', error);
		return '';
	}
}

function createMLCoreResolver(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<any, any>,
	version: ARIAVersion,
): AccnameResolver {
	const doc = el.ownerMLDocument;
	return {
		getElementById(id: string): AccnameElement | null {
			const found = doc.querySelector(`#${escapeCSS(id)}`);
			return found ?? null;
		},
		getLabelsForId(id: string): readonly AccnameElement[] {
			const labels = doc.querySelectorAll(`label[for="${escapeCSS(id)}"]`);
			return [...labels];
		},
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		allowsNameFromContent(target: AccnameElement): boolean {
			// TODO: Remove cast when getComputedRole accepts AccnameElement (#3178)
			const role = getComputedRole(doc.specs, target as Element, version);
			return !!role.role?.accessibleNameFromContent;
		},
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		isHidden(target: AccnameElement): boolean {
			return target.getAttribute('aria-hidden') === 'true' || target.hasAttribute('hidden');
		},
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		isEmbeddedControl(target: AccnameElement): boolean {
			// TODO: Remove cast when getComputedRole accepts AccnameElement (#3178)
			const role = getComputedRole(doc.specs, target as Element, version);
			if (role.role?.name) {
				return EMBEDDED_CONTROL_ROLES.has(role.role.name);
			}
			return isNativeEmbeddedControl(target);
		},
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		getPrecomputedName(target: AccnameElement): string | null {
			// TODO: Remove cast when AccnameResolver is generic (#3178)
			const targetEl = target as MLElement<any, any>;
			if (!targetEl.pretenderContext || targetEl.pretenderContext.type !== 'pretender') {
				return null;
			}
			const ariaName = targetEl.pretenderContext.aria?.name;
			if (ariaName == null) {
				return null;
			}
			if (typeof ariaName === 'boolean') {
				return 'some-name(Pretender Options)';
			}
			const attrName = ariaName.fromAttr;
			const attrValue = targetEl.getAttributePretended(attrName);
			return attrValue || null;
		},
	};
}
