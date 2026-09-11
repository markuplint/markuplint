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

export function getAccname(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<any, any>,
	version: ARIAVersion,
): string {
	// AccName computation involves DOM traversal, role resolution, and label
	// lookup via querySelector. These may fail on unexpected DOM states (e.g.,
	// detached nodes, malformed attributes), incomplete spec data, or runtime
	// environment differences (e.g., Deno lacking certain DOM APIs).
	// A single element's failure must not abort the entire linting process,
	// so we catch all errors and return an empty name (= "unnamed").
	// This is an intentional exception to the Tier 1 re-throw policy (see
	// `isFatalError()` in `@markuplint/shared`): Tier-1-shaped errors here
	// can be caused by the runtime environment, not only implementation bugs.
	// The empty-string result is not converted to a violation either — a
	// single element's accname failure must not create noise across
	// unrelated rules, and "unnamed" still drives meaningful a11y rule
	// violations downstream.
	try {
		const resolver = createMLCoreResolver(el, version);
		const result = computeAccessibleName(el, resolver);
		return result.name;
	} catch (error) {
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
