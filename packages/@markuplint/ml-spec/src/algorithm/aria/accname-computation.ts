import type { AccnameElement, AccnameResolver } from './accname/types.js';
import type { ARIAVersion, MLMLSpec } from '../../types/index.js';

import { computeAccessibleName } from './accname/compute.js';
import { EMBEDDED_CONTROL_ROLES, escapeCSS } from './accname/helpers.js';
import { isNativeEmbeddedControl } from '../../const/index.js';
import { getComputedRole } from './get-computed-role.js';

/**
 * [Implementation-specific] Reentrant guard to prevent infinite recursion when
 * getComputedRole evaluates `:aria(has name)` selectors, which call back into getAccname.
 *
 * This breaks the cycle: `getAccname → createDomResolver → allowsNameFromContent
 * → getComputedRole → getARIA → matches(":aria(has name)") → getAccname`.
 *
 * Module-level state is intentional: the guard must span the entire call stack
 * within a single synchronous computation. `WeakSet` ensures no memory leaks
 * (entries are GC'd with their Element), and `try/finally` in `getAccname`
 * guarantees cleanup even on exceptions.
 */
const computingElements = new WeakSet<Element>();

/**
 * Computes the accessible name for a DOM `Element` using the AccName 1.2 algorithm.
 *
 * This is the public facade that bridges the pure AccName algorithm (in `accname/compute.ts`)
 * with the DOM environment. It creates a DOM-based `AccnameResolver` and delegates to
 * `computeAccessibleName`.
 *
 * **Reentrant guard**: Uses a `WeakSet<Element>` to detect and short-circuit
 * recursive calls caused by the `:aria(has name)` pseudo-class selector in
 * `getComputedRole` → `getARIA` → `matches` chain.
 *
 * @param el - The DOM element to compute the accessible name for
 * @param specs - The ML specification data for role resolution
 * @param version - The ARIA version to use for role computation
 * @returns The computed accessible name string, or an empty string if none is found
 * @see https://www.w3.org/TR/accname-1.2/#computation-steps — AccName 1.2 §4.3.2
 */
export function getAccname(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
): string {
	if (computingElements.has(el)) {
		return '';
	}
	computingElements.add(el);
	const resolver = createDomResolver(el, specs, version);
	// try/finally ensures the reentrant guard (WeakSet) is cleaned up even
	// when computeAccessibleName throws. This is NOT a try/catch — exceptions
	// propagate to the caller (ml-core's getAccname catches them).
	try {
		const result = computeAccessibleName(el, resolver);
		return result.name;
	} finally {
		computingElements.delete(el);
	}
}

/**
 * Creates an `AccnameResolver` from a DOM Element's owner document.
 *
 * [Implementation-specific] This resolver bridges the pure AccName algorithm
 * with the DOM API. It uses `getComputedRole` for spec-driven role resolution
 * (determining `allowsNameFromContent` and `isEmbeddedControl`) instead of
 * hardcoded role lists, ensuring accuracy across ARIA versions.
 */
function createDomResolver(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
): AccnameResolver {
	const root = getRootNode(el);
	return {
		getElementById(id: string): AccnameElement | null {
			if ('getElementById' in root && typeof root.getElementById === 'function') {
				return root.getElementById(id);
			}
			return root.querySelector(`[id="${escapeCSS(id)}"]`) ?? null;
		},
		getLabelsForId(id: string): readonly AccnameElement[] {
			const labels = root.querySelectorAll(`label[for="${escapeCSS(id)}"]`);
			return [...labels];
		},
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		allowsNameFromContent(target: AccnameElement): boolean {
			// TODO: Remove cast when getComputedRole accepts AccnameElement (#3178)
			const role = getComputedRole(specs, target as Element, version);
			return !!role.role?.accessibleNameFromContent;
		},
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		isHidden(target: AccnameElement): boolean {
			if (target.getAttribute('aria-hidden') === 'true') {
				return true;
			}
			if (target.hasAttribute('hidden')) {
				return true;
			}
			// Best-effort CSS visibility check (available in browser/JSDOM).
			// getComputedStyle may throw on:
			//   - SecurityError: cross-origin iframes
			//   - TypeError: detached nodes not connected to a document
			// These are expected operational failures. On error, fall through
			// to return false (treat as visible). Attribute-based checks above
			// (aria-hidden, hidden) are the primary detection for static analysis.
			if (typeof getComputedStyle === 'function') {
				try {
					// TODO: Remove cast when getComputedStyle dependency is decoupled (#3178)
					const style = getComputedStyle(target as Element);
					if (style.display === 'none' || style.visibility === 'hidden') {
						return true;
					}
				} catch {
					// Swallowed intentionally: SecurityError or TypeError from
					// getComputedStyle is non-fatal. CSS hidden detection is
					// supplementary; attribute checks above cover static analysis.
				}
			}
			return false;
		},
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		isEmbeddedControl(target: AccnameElement): boolean {
			// TODO: Remove cast when getComputedRole accepts AccnameElement (#3178)
			const role = getComputedRole(specs, target as Element, version);
			if (role.role?.name && EMBEDDED_CONTROL_ROLES.has(role.role.name)) {
				return true;
			}
			// Native HTML embedded controls without explicit role
			return isNativeEmbeddedControl(target);
		},
	};
}

/**
 * Walks up the DOM tree to find the root node (Document or DocumentFragment).
 */
function getRootNode(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
): Document | DocumentFragment {
	let root: Node = el;
	while (root.parentNode) {
		root = root.parentNode;
	}
	if (root.nodeType === 9 || root.nodeType === 11) {
		return root as Document | DocumentFragment;
	}
	// Fallback: if we reach a disconnected element, use ownerDocument
	return el.ownerDocument;
}
