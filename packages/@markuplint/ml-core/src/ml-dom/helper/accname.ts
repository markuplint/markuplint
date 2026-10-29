import type { MLElement } from '../node/element.js';
import type {
	AccnameElement,
	AccnameNode,
	AccnameResolver,
	AccnameSource,
	AccnameVisit,
	ARIAVersion,
} from '@markuplint/ml-spec';

import {
	computeAccessibleName,
	computeHostLanguageLabel,
	computeReferencedTextAlternative,
	escapeCSS,
	getComputedRole,
	EMBEDDED_CONTROL_ROLES,
	isExposedAsPresentational,
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
		logFailure(el, error);
		return '';
	}
}

/**
 * The elements that the computation of the element's text alternative reaches,
 * with how it reaches each (see `AccnameResolver.onVisit` of `@markuplint/ml-spec`).
 * Errors are handled as in {@link getAccname}: the computation is taken to reach
 * nothing, so a caller that exempts what the computation reads (such as
 * `no-aria-on-presentational-children`) exempts nothing for that element.
 *
 * @param el - The element whose text alternative is computed
 * @param version - The ARIA version
 * @param asReferenced - Computes it as a node referenced by `aria-labelledby` or
 *   `aria-describedby` instead of its accessible name
 */
export function getAccnameVisits(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<any, any>,
	version: ARIAVersion,
	asReferenced: boolean,
): ReadonlyMap<MLElement<any, any>, readonly AccnameVisit[]> {
	const visits = new Map<MLElement<any, any>, AccnameVisit[]>();
	try {
		const resolver: AccnameResolver = {
			...createMLCoreResolver(el, version),
			onVisit(target, visit) {
				// TODO: Remove cast when AccnameResolver is generic (#3178)
				const targetEl = target as MLElement<any, any>;
				const list = visits.get(targetEl) ?? [];
				list.push(visit);
				visits.set(targetEl, list);
			},
		};
		if (asReferenced) {
			computeReferencedTextAlternative(el, resolver);
		} else {
			computeAccessibleName(el, resolver);
		}
		return visits;
	} catch (error) {
		logFailure(el, error);
		return new Map();
	}
}

/**
 * The text alternative of the element as a node referenced by `aria-labelledby`
 * or `aria-describedby`. Errors are handled as in {@link getAccname}.
 */
export function getReferencedTextAlternative(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<any, any>,
	version: ARIAVersion,
): string {
	try {
		return computeReferencedTextAlternative(el, createMLCoreResolver(el, version)).name;
	} catch (error) {
		logFailure(el, error);
		return '';
	}
}

/**
 * The source of the host language text alternative of the element (AccName
 * Step 2E), whether or not the element is exposed as presentational. Errors are
 * handled as in {@link getAccname}: the element is taken to have none.
 */
export function getHostLanguageLabelSource(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<any, any>,
	version: ARIAVersion,
): AccnameSource | null {
	try {
		return computeHostLanguageLabel(el, createMLCoreResolver(el, version))?.source ?? null;
	} catch (error) {
		logFailure(el, error);
		return null;
	}
}

function logFailure(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<any, any>,
	error: unknown,
): void {
	if (accnameLog.enabled) {
		accnameLog('Raw: %s', el.raw);
		accnameLog('Error: %O', error);
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
		isExposedAsPresentational(target: AccnameElement): boolean {
			// TODO: Remove cast when getComputedRole accepts AccnameElement (#3178)
			return isExposedAsPresentational(getComputedRole(doc.specs, target as Element, version));
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
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		getChildNodes(target: AccnameElement): Iterable<AccnameNode> {
			// TODO: Remove cast when AccnameResolver is generic (#3178)
			const targetEl = target as MLElement<any, any>;
			const context = targetEl.pretenderContext;
			if (context?.type !== 'pretender') {
				return targetEl.childNodes;
			}
			// The children the component renders: `as.childNodes` is empty when it never
			// renders its children (`slots: null`), so text written inside `<Img>Save</Img>`
			// does not become its name.
			const given = [...context.as.childNodes];
			// A pretended component renders its own elements (`contents`) around the
			// children given at the usage site; the name can come from either.
			return context.slotContent ? context.slotContent.fill(given) : given;
		},
	};
}
