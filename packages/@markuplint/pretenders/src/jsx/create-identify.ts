import type { SlotInfo } from '../contents.js';
import type { Identity } from '../types.js';
import type { PretenderAttr } from '@markuplint/ml-config';

import { isTrivialContents } from '../contents.js';

/**
 * What one render branch of a component says about the element it pretends to be,
 * before the branches are merged.
 */
export type Draft = SlotInfo & {
	readonly element: string;
	readonly attrs: readonly PretenderAttr[];
	readonly hasSpread: boolean;
};

/**
 * Returns just the tag name string when there is nothing to say about the element
 * besides its name. Otherwise a detailed identity object: attributes, the slot
 * (`null` when the component does not render its children), what surrounds the
 * slot, and whether the element inherits spread attributes.
 */
export function createIdentity(draft: Draft): Identity {
	const { element, attrs, hasSpread, slots, contents } = draft;
	const hasContents = !isTrivialContents(contents);

	if (attrs.length === 0 && !hasSpread && slots === null && !hasContents) {
		return element;
	}

	return {
		element,
		slots,
		...(attrs.length > 0 ? { attrs } : {}),
		...(hasContents ? { contents } : {}),
		...(hasSpread ? { inheritAttrs: true as const } : {}),
	};
}

/**
 * Merges the branches of one component into a single draft, so the result is
 * true for every branch, or `undefined` when there is no such draft.
 *
 * - The element must be the same in every branch.
 * - An attribute remains if every branch has it: with its value if they agree, and
 *   as `{ dynamic: true }` if they do not (`aria-label="x"` vs `aria-label={label}`).
 *   The spread only remains if every branch has it.
 * - When the branches agree on the slot they keep it. When they disagree on what
 *   surrounds it, the surroundings become unknown (`{ dynamic: true }` before the
 *   slot). When they disagree on which element wraps the slot, nothing can be said.
 */
export function mergeDrafts(drafts: readonly Draft[]): Draft | undefined {
	const [first, ...rest] = drafts;
	if (!first || rest.some(draft => draft.element !== first.element)) {
		return undefined;
	}

	const attrs = first.attrs
		.filter(attr => rest.every(draft => draft.attrs.some(other => other.name === attr.name)))
		.map((attr): PretenderAttr => {
			const isAgreed = rest.every(draft => draft.attrs.some(other => isSame(attr, other)));
			return isAgreed ? attr : { name: attr.name, value: { dynamic: true } };
		});
	const hasSpread = drafts.every(draft => draft.hasSpread);

	if (rest.every(draft => isSame(getSlotInfo(draft), getSlotInfo(first)))) {
		return { ...first, attrs, hasSpread };
	}

	const withSlot = drafts.filter(draft => draft.slots !== null);
	const [sample] = withSlot;
	if (!sample || withSlot.some(draft => !isSame(getWrapper(draft.slots), getWrapper(sample.slots)))) {
		return sample ? undefined : { ...first, attrs, hasSpread, slots: null, contents: [{ dynamic: true }] };
	}

	const unknown = [{ dynamic: true as const }, { slot: true as const }];
	if (sample.slots === true) {
		return { ...first, attrs, hasSpread, slots: true, contents: unknown };
	}
	const [only, ...others] = sample.slots ?? [];
	return {
		...first,
		attrs,
		hasSpread,
		slots: only && others.length === 0 ? [{ ...only, contents: unknown }] : sample.slots,
		contents: [],
	};
}

function getSlotInfo(draft: Draft): SlotInfo {
	return { slots: draft.slots, contents: draft.contents };
}

/**
 * The slot without what surrounds the slot inside it: which element wraps the children.
 */
function getWrapper(slots: SlotInfo['slots']) {
	return Array.isArray(slots) ? slots.map(({ contents: _contents, ...slot }) => slot) : slots;
}

function isSame(a: unknown, b: unknown) {
	return JSON.stringify(a) === JSON.stringify(b);
}
