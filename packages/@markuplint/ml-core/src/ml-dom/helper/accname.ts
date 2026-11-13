import type { MLDocumentFragment } from '../node/document-fragment.js';
import type { MLDocument } from '../node/document.js';
import type { MLElement } from '../node/element.js';
import type { MLNode } from '../node/node.js';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';
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
	getComputedRole,
	EMBEDDED_CONTROL_ROLES,
	isExposedAsPresentational,
	isNativeEmbeddedControl,
} from '@markuplint/ml-spec';
import { decodeEntities } from '@markuplint/shared';

import { log } from '../../debug.js';

import { expandConditionalBlocks, mayBeAbsentWith } from './conditional-block.js';
import { getDOMValue } from './tree-scope.js';

const accnameLog = log.extend('accname');

export function getAccname(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<any, any>,
	version: ARIAVersion,
): string {
	return computeNameWithoutThrowing(el, version, false);
}

/**
 * The accessible name of the element with the branches of the conditional blocks read as one
 * (see {@link getRenderedChildNodes}, `everyBranch`). Errors are handled as in {@link getAccname}.
 *
 * The text is the concatenation of the branches, of which only one is rendered, so it is not a
 * name that the element has. Only whether it is empty means something: it is not empty when some
 * branch gives a name, because the name from content is the concatenation of what every child gives
 * on its own, and a lookup of a name that takes one child (`legend`, `caption`, the SVG `title`)
 * reads each of them that a branch may leave out ({@link AccnameResolver.mayBeAbsentWith}).
 *
 * @param el - The element whose name is computed
 * @param version - The ARIA version
 * @returns The concatenated name of every branch, which is empty when no branch gives a name
 */
export function getAccnameOfEveryBranch(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<any, any>,
	version: ARIAVersion,
): string {
	return computeNameWithoutThrowing(el, version, true);
}

function computeNameWithoutThrowing(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<any, any>,
	version: ARIAVersion,
	everyBranch: boolean,
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
		return computeAccessibleName(el, createMLCoreResolver(el, version, everyBranch)).name;
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

/**
 * The children the accessible-name computation renders for `el`.
 *
 * An ordinary `template` element contributes none: its content is another tree
 * and is not rendered where the element is written. A host renders the child
 * nodes of its declarative shadow root, of either mode. A `template` whose
 * shadow root is only maybe attached contributes none too, because that root
 * is not there to read. A slot whose assignment is not known contributes its own children, so a rule that
 * must not report on what it cannot know asks `MLElement#getAssignedNodes` itself.
 *
 * The shadow root comes first, for a pretended component too: it is attached to a
 * pretended host only when the component renders the children written in it in
 * itself, and then it is rendered in place of what the component renders.
 * Otherwise a pretended component is unchanged: `as.childNodes` is empty when it never
 * renders its children (`slots: null`), so text written inside `<Img>Save</Img>`
 * does not become its name. `contents` may wrap the children given at the usage site.
 *
 * > The template contents of a template element are not children of the element itself.
 *
 * > If the current node has an attached shadow root, set the rendered child nodes to be the child nodes of the shadow root.
 *
 * > Otherwise, if the current node is a slot with assigned nodes, set the rendered child nodes to be the assigned nodes of the current node.
 *
 * > Otherwise, set the rendered child nodes to be the child nodes of the current node.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param el - The element whose rendered children are asked for
 * @param options - How the conditional blocks are read ({@link RenderedChildNodesOptions})
 * @returns The nodes the computation walks
 * @see https://html.spec.whatwg.org/multipage/scripting.html#the-template-element
 * @see https://w3c.github.io/accname/#comp_name_from_content
 */
export function getRenderedChildNodes<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<T, O>,
	options?: RenderedChildNodesOptions,
): Iterable<MLNode<T, O>> {
	const nodes = getRenderedChildNodesAsWritten(el);
	return options?.everyBranch ? expandConditionalBlocks(nodes) : nodes;
}

function getRenderedChildNodesAsWritten<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<T, O>,
): Iterable<MLNode<T, O>> {
	const shadowRoot = el.declarativeShadowRoot;
	if (shadowRoot) {
		return shadowRoot.childNodes;
	}
	const assigned = el.getAssignedNodes();
	if (assigned && assigned.length > 0) {
		return assigned;
	}
	const context = el.pretenderContext;
	if (context?.type === 'pretender') {
		const given = [...context.as.childNodes];
		return context.slotContent ? context.slotContent.fill(given) : given;
	}
	if (el.isHTMLTemplateElement) {
		return [];
	}
	return el.childNodes;
}

/**
 * How {@link getRenderedChildNodes} reads the conditional blocks.
 */
export type RenderedChildNodesOptions = {
	/**
	 * Replaces each block that has a `blockBehavior` (`if`, `switch`, `await` and their clauses,
	 * which `MLNode#childNodes` keeps as nodes) with the nodes of its branches, as if every branch
	 * were rendered at once. Which branch is rendered is not known from the markup, so a caller
	 * that must not report on what it cannot know reads them all. A block that has no behavior stays:
	 * it is unknown by itself (`MLElement#hasMutableChildren`).
	 */
	readonly everyBranch?: boolean;
};

function createMLCoreResolver(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<any, any>,
	version: ARIAVersion,
	everyBranch = false,
): AccnameResolver {
	const doc = el.ownerMLDocument;
	// An id is resolved in the tree of the element: not in the content of a `template` outside of it.
	// An element that is in no tree (a `template` that a declarative shadow root is attached to) is its
	// own root and resolves nothing.
	const node = el.getRootNode();
	const root: MLDocument<any, any> | MLDocumentFragment<any, any> | null =
		node.is(node.DOCUMENT_NODE) || node.is(node.DOCUMENT_FRAGMENT_NODE) ? node : null;
	// The ids the algorithm hands over are the ones written in the markup (`MLElement#id` and a token of
	// `aria-labelledby`), so the character references are resolved on both sides, as the DOM has them
	return {
		...(everyBranch
			? {
					// A branch that renders the other candidate may leave this one out
					mayBeAbsentWith: (candidate: AccnameElement, other: AccnameElement) =>
						mayBeAbsentWith(candidate as MLElement<any, any>, other as MLElement<any, any>),
				}
			: {}),
		getElementById(id: string): AccnameElement | null {
			return root?.getElementById(decodeEntities(id)) ?? null;
		},
		getLabelsForId(id: string): readonly AccnameElement[] {
			const domId = decodeEntities(id);
			return root
				? [...root.querySelectorAll('label[for]')].filter(
						label => getDOMValue(label.getAttributeNode('for')) === domId,
					)
				: [];
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
			return getRenderedChildNodes(target as MLElement<any, any>, { everyBranch });
		},
	};
}
