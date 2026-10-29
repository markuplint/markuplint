import { isAriaAttr, labelable, memoizeByObject, namespaceKeyOf } from '../../helpers.js';
import type { Options } from '../types.js';
import type { Attr, AttrChecker, Document, Element } from '@markuplint/ml-core';
import type { AccnameVisit, ARIAVersion, ARIARole, ComputedRole } from '@markuplint/ml-spec';

import {
	ARIA_RECOMMENDED_VERSION,
	EMBEDDED_CONTROL_ROLES,
	getComputedRole,
	getImplicitRole,
	isExposedAsPresentational,
	isNativeEmbeddedControl,
} from '@markuplint/ml-spec';

/**
 * Checks whether an ARIA attribute or `role` is applied to a descendant of an
 * element whose role has the `childrenArePresentational` characteristic.
 *
 * Presentational Children
 *
 * @see https://w3c.github.io/aria/#childrenArePresentational
 * @see https://w3c.github.io/aria/#childrenArePresentational
 *
 * > Indicates whether DOM descendants are presentational.
 * > user agents SHOULD NOT expose descendants of
 * > this element through the platform accessibility API.
 * > If user agents do not hide the descendant nodes,
 * > some information might be read twice.
 *
 * @see https://w3c.github.io/aria/#tree_exclusion
 *
 * > Any descendants of elements that have the characteristic "Children Presentational: True"
 * > unless the descendant is not allowed to be presentational
 * > because it meets one of the conditions for exception described
 * > in Presentational Roles Conflict Resolution.
 * > However, the text content of any excluded descendants is included.
 *
 * @see https://w3c.github.io/aria/#tree_inclusion
 *
 * > Text equivalents for hidden referenced objects
 * > can still be used in the name and description computation
 * > even when not included in the accessibility tree.
 *
 * Because the text of the excluded descendants is still used, an attribute that
 * changes what a descendant contributes to a text alternative is not
 * ineffective, and is not reported (see {@link takesEffect}). The computations
 * that can read the descendant are listed by {@link getVisits};
 * `MLElement#getAccessibleNameVisits` tells which elements each of them reaches
 * and how.
 *
 * @param attr - The attribute to inspect.
 * @param el - The element the attribute is read on. For a pretended component it is
 *   the component, while the attribute belongs to the element it pretends to be.
 * @returns A violation if the attribute is an ARIA attribute or `role` that takes no effect under an ancestor with presentational children.
 */
export const checkingPresentationalChildren: AttrChecker<
	boolean,
	Options,
	{ readonly el: Element<boolean, Options> }
> =
	({ attr, el }) =>
	t => {
		if (!isAriaAttr(attr) && attr.nameKey !== 'role') {
			return;
		}
		const context = getContext(el);
		if (!context) {
			return;
		}
		if (takesEffect(attr, el, context)) {
			return;
		}
		return {
			scope: attr,
			message: t(
				'it may be ineffective because {0}',
				t(
					"it has {0} as an ancestor that doesn't expose its descendants to the accessibility tree",
					t('the "{0*}" {1}', context.role.name, 'role'),
				),
			),
		};
	};

type Context = {
	readonly ariaVersion: ARIAVersion;
	/**
	 * The role of the closest ancestor with presentational children.
	 */
	readonly role: ARIARole;
	readonly visits: readonly AccnameVisit[];
};

/**
 * The closest ancestor role with presentational children, and the visits of the
 * element by the computations that can read it, once per element.
 */
const getContext = memoizeByObject(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	(el: Element<boolean, Options>): Context | null => {
		const ariaVersion =
			el.rule.options?.version ?? el.ownerMLDocument.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
		const role = getClosestPresentationalChildrenRole(el, ariaVersion);
		if (!role) {
			return null;
		}
		return { ariaVersion, role, visits: getVisits(el, ariaVersion) };
	},
);

/**
 * Finds the closest ancestor whose computed role has the
 * `childrenArePresentational` characteristic.
 *
 * @param el - The element to start searching from (exclusive, starts from parent).
 * @param ariaVersion - The ARIA version to compute the roles with.
 * @returns The role of that ancestor, or `null` if none is found.
 */
function getClosestPresentationalChildrenRole(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean, Options>,
	ariaVersion: ARIAVersion,
): ARIARole | null {
	let current: Element<boolean, Options> | null = el.parentElement;
	while (current) {
		const role = getComputedRole(el.ownerMLDocument.specs, current, ariaVersion).role;
		if (role?.childrenPresentational) {
			return role;
		}
		current = current.parentElement;
	}
	return null;
}

/**
 * The visits of the element by every computation that can read it. Each reader
 * is taken whether or not its computation reaches the element; one that does
 * not contributes no visit.
 *
 * - the accessible name of every ancestor, as any of them can collect the text
 *   of its subtree (Step 2F and the recursion into descendants)
 * - the text alternative of the element or of an ancestor as a node that
 *   `aria-labelledby` or `aria-describedby` refers to
 * - the accessible name of every control that a `label` ancestor can name: the
 *   element its `for` refers to, and its labelable descendants (HTML-AAM)
 *
 * @see https://w3c.github.io/accname/#comp_name_from_content
 * @see https://w3c.github.io/accname/#comp_labelledby_traversal
 * @see https://w3c.github.io/html-aam/#accessible-name-and-description-computation
 *
 * @param el - The descendant
 * @param ariaVersion - The ARIA version to compute the names with
 * @returns The visits
 */
function getVisits(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean, Options>,
	ariaVersion: ARIAVersion,
): readonly AccnameVisit[] {
	const visits: AccnameVisit[] = [];
	const add = (
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		reader: Element<boolean, Options>,
		asReferenced = false,
	) => {
		visits.push(...(reader.getAccessibleNameVisits(ariaVersion, asReferenced).get(el) ?? []));
	};
	const document = el.ownerMLDocument;
	const referenced = getReferencedIds(document);
	let current: Element<boolean, Options> | null = el;
	while (current) {
		if (current !== el) {
			add(current);
		}
		if (current.id && referenced.has(current.id) && document.getElementById(current.id) === current) {
			add(current, true);
		}
		for (const control of getLabeledControls(current)) {
			add(control);
		}
		current = current.parentElement;
	}
	return visits;
}

/**
 * The controls that the element can name if it is a `label`, as the accessible
 * name computation finds labels: by `for` or as the closest `label` ancestor.
 * Once per label.
 *
 * @see https://html.spec.whatwg.org/multipage/forms.html#labeled-control
 */
const getLabeledControls = memoizeByObject(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	(el: Element<boolean, Options>): readonly Element<boolean, Options>[] => {
		if (el.localName !== 'label' || el.namespaceURI !== 'http://www.w3.org/1999/xhtml') {
			return [];
		}
		const htmlFor = el.getAttribute('for');
		const target = htmlFor == null ? null : el.ownerMLDocument.getElementById(htmlFor);
		return [...(target ? [target] : []), ...el.querySelectorAll(labelable.join(', '))];
	},
);

/**
 * The IDs that an `aria-labelledby` or `aria-describedby` of the document refers to.
 */
const getReferencedIds = memoizeByObject(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	(document: Document<boolean, Options>): ReadonlySet<string> => {
		const ids = new Set<string>();
		for (const referrer of document.querySelectorAll('[aria-labelledby], [aria-describedby]')) {
			for (const name of ['aria-labelledby', 'aria-describedby']) {
				for (const id of referrer.getAttribute(name)?.split(/\s+/) ?? []) {
					if (id !== '') {
						ids.add(id);
					}
				}
			}
		}
		return ids;
	},
);

/**
 * Whether the attribute changes what its element contributes to a text
 * alternative that reads it, given how the computations reach the element.
 *
 * - `aria-hidden="true"` makes the element hidden, so it and its subtree
 *   contribute nothing (Step 2A), unless the `hidden` attribute hides it already
 *   (the other way `@markuplint/ml-core` tells an element hidden).
 * - An `aria-labelledby` replaces the element's subtree (Step 2B) when the
 *   elements it refers to have any text, except inside an ongoing
 *   `aria-labelledby` traversal.
 * - A non-empty `aria-label` replaces it the same way (Step 2D), unless the
 *   element is hidden, an `aria-labelledby` of it takes effect first (one that
 *   refers to the element itself reads the `aria-label` again), or it is an
 *   embedded control, whose `aria-label` the recursion ignores.
 * - `role="none"` or `role="presentation"` drops the host language text
 *   alternative of the element, such as the `alt` of an image (Step 2E), when the
 *   element has one and the Presentational Roles Conflict Resolution does not
 *   ignore the role.
 * - A role that makes the element an embedded control, or keeps a native one
 *   from being it, changes what it contributes between its value and its text
 *   (Step 2C).
 * - The `aria-valuetext`, or else the `aria-valuenow`, of a range embedded
 *   control is its value (Step 2C).
 *
 * @see https://w3c.github.io/accname/#comp_embedded_control
 * @see https://w3c.github.io/accname/#comp_hidden_not_referenced
 * @see https://w3c.github.io/accname/#comp_labelledby
 * @see https://w3c.github.io/accname/#comp_label
 * @see https://w3c.github.io/accname/#comp_host_language_label
 *
 * > Otherwise, if the current node's native markup provides an attribute (e.g. alt) or element (e.g. HTML label or SVG title) that defines a text alternative, return that alternative in the form of a flat string as defined by the host language […], unless the current node is exposed as presentational (role="presentation" or role="none", alt="").
 *
 * @param attr - The attribute on a descendant of a presentational ancestor
 * @param el - The descendant
 * @param context - The ARIA version and the visits of the descendant
 * @returns `true` if the attribute takes effect on a text alternative
 */
function takesEffect(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attr: Attr<boolean, Options>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean, Options>,
	{ ariaVersion, visits }: Context,
): boolean {
	const shown = visits.filter(visit => !visit.hidden);
	switch (namespaceKeyOf(attr)) {
		case 'aria-hidden': {
			return attr.value === 'true' && visits.some(visit => visit.hidden) && !el.hasAttribute('hidden');
		}
		case 'aria-labelledby': {
			return labelledbyGivesText(el, ariaVersion) && shown.some(visit => !visit.inLabelledbyTraversal);
		}
		case 'aria-label': {
			const overridden =
				labelledbyGivesText(el, ariaVersion) &&
				!(el.id !== '' && el.getAttribute('aria-labelledby')?.split(/\s+/).includes(el.id));
			return (
				attr.value.trim() !== '' &&
				shown.some(visit => !visit.embeddedControl && (visit.inLabelledbyTraversal || !overridden))
			);
		}
		case 'aria-valuetext':
		case 'aria-valuenow': {
			// The value of a range embedded control: `aria-valuetext`, else `aria-valuenow`
			const isRange =
				['slider', 'spinbutton'].includes(el.getAttribute('role')?.trim().split(/\s+/)[0] ?? '') ||
				(el.localName === 'input' && el.getAttribute('type')?.trim().toLowerCase() === 'range');
			const valuetext = el.getAttribute('aria-valuetext')?.trim() ?? '';
			const shadowed = namespaceKeyOf(attr) === 'aria-valuenow' && valuetext !== '';
			// Step 2B comes first outside an ongoing aria-labelledby traversal
			const labelledby = labelledbyGivesText(el, ariaVersion);
			return (
				isRange &&
				attr.value.trim() !== '' &&
				!shadowed &&
				shown.some(visit => visit.embeddedControl && (visit.inLabelledbyTraversal || !labelledby))
			);
		}
		case 'role': {
			if (shown.length === 0) {
				return false;
			}
			const { specs } = el.ownerMLDocument;
			const computed = getComputedRole(specs, el, ariaVersion);
			if (isEmbeddedControl(el, computed) !== isEmbeddedControl(el, getImplicitRole(specs, el, ariaVersion))) {
				return true;
			}
			return (
				shown.some(visit => !visit.embeddedControl) &&
				isExposedAsPresentational(computed) &&
				el.getHostLanguageLabelSource(ariaVersion) !== null
			);
		}
	}
	return false;
}

/**
 * Whether the element is an embedded control with the role, as the resolver of
 * `@markuplint/ml-core` tells it: by the role, or as a native control without one.
 */
function isEmbeddedControl(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean, Options>,
	computed: ComputedRole,
): boolean {
	return computed.role ? EMBEDDED_CONTROL_ROLES.has(computed.role.name) : isNativeEmbeddedControl(el);
}

/**
 * Whether the `aria-labelledby` of the element gives a text: Step 2B returns the
 * accumulated text of the elements it refers to only when that text is not empty.
 */
function labelledbyGivesText(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean, Options>,
	ariaVersion: ARIAVersion,
): boolean {
	return (el.getAttribute('aria-labelledby')?.split(/\s+/) ?? []).some(id => {
		if (id === '') {
			return false;
		}
		const referenced = el.ownerMLDocument.getElementById(id);
		return referenced != null && referenced.getReferencedTextAlternative(ariaVersion) !== '';
	});
}
