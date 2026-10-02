import type { Identity } from './types.js';
import type { PretenderContent } from '@markuplint/ml-config';

import { isTrivialContents } from './contents.js';

type DetailedIdentity = Exclude<Identity, string>;

/**
 * Describes a component (`outer`) whose root is another component (`inner`) as the
 * element that `inner` finally renders, keeping what `outer` puts around the children.
 *
 * `outer.contents` are the children `outer` hands to `inner`, so they take the place
 * of `inner`'s `{ slot: true }` entries. Where `outer` puts its own children depends
 * on `outer.slots`:
 *
 * - `null`: nowhere. The result never renders children either.
 * - `true` or omitted: among the children it hands to `inner`, so they end up in
 *   whatever wraps `inner`'s slot. The result keeps `inner`'s `slots`.
 * - An array: inside the wrapper of `outer`, which lives inside `inner`'s slot.
 *   The result keeps that wrapper. Known limitation: what `inner` renders around it
 *   (its own `contents`, or its own slot wrapper) is dropped, because a pretender cannot
 *   nest one wrapper in another. The children are still evaluated against the wrapper
 *   of `outer`; only the placement of that wrapper inside `inner` goes unchecked.
 *
 * When `inner` does not render its children (`slots: null`), nothing `outer` hands over
 * is rendered, so `inner` is the result as it is. So is it when `outer` is only an element
 * name: it says nothing about its children.
 *
 * Attributes, ARIA properties, and `inheritAttrs` of `outer` are not composed;
 * the result carries those of `inner`.
 *
 * The result is again a description of the element that `inner` renders, so a longer
 * chain composes one hop at a time, from the outermost component inward.
 */
export function composeIdentity(outer: Identity, inner: Identity): Identity {
	if (typeof outer === 'string') {
		return inner;
	}

	const innerDetail: DetailedIdentity = typeof inner === 'string' ? { element: inner } : inner;
	// `null` means no slot, and omitting `slots` means `true`; `??` would fold the former into the latter.
	const innerSlots = innerDetail.slots === undefined ? true : innerDetail.slots;
	if (innerSlots === null) {
		return inner;
	}

	const outerSlots = outer.slots === undefined ? true : outer.slots;
	const handed = outerSlots === null ? (outer.contents ?? []) : (outer.contents ?? [{ slot: true }]);
	const rest = omit(innerDetail, ['slots', 'contents']);

	if (Array.isArray(outerSlots)) {
		return build(rest, outerSlots, undefined, innerDetail.slots === undefined);
	}

	if (innerSlots === true) {
		const contents = substitute(innerDetail.contents, handed);
		return build(rest, outerSlots === null ? null : true, contents, innerDetail.slots === undefined);
	}

	if (outerSlots === null) {
		// The wrapper of `inner` takes what `outer` hands over, but what surrounds that
		// wrapper inside the root is not known.
		return build(rest, null, [{ dynamic: true }], false);
	}

	return build(
		rest,
		innerSlots.map(slot => {
			const contents = substitute(slot.contents, handed);
			const slotRest = omit(slot, ['contents']);
			return isTrivialContents(contents) ? slotRest : { ...slotRest, contents };
		}),
		undefined,
		false,
	);
}

/**
 * Replaces each `{ slot: true }` of `contents` (the whole content when omitted)
 * with `handed`.
 */
function substitute(
	contents: readonly PretenderContent[] | undefined,
	handed: readonly PretenderContent[],
): PretenderContent[] {
	return (contents ?? [{ slot: true }]).flatMap(entry => ('slot' in entry ? handed : [entry]));
}

/**
 * A bare element name stays a bare name, and `slots` is left out when it would
 * only restate the default that `inner` left implicit. The scanners never write
 * a bare name, so this only keeps the shape of an identity written in a config.
 */
function build(
	rest: Omit<DetailedIdentity, 'slots' | 'contents'>,
	slots: DetailedIdentity['slots'],
	contents: readonly PretenderContent[] | undefined,
	isSlotsImplicit: boolean,
): Identity {
	const hasContents = contents != null && !isTrivialContents(contents);
	const keys = Object.keys(rest);
	if (isSlotsImplicit && slots === true && !hasContents && keys.length === 1) {
		return rest.element;
	}

	return {
		...rest,
		...(slots === true && isSlotsImplicit ? {} : { slots }),
		...(hasContents ? { contents } : {}),
	};
}

function omit<T extends object, K extends keyof T>(value: T, keys: readonly K[]): Omit<T, K> {
	return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key as K))) as Omit<T, K>;
}
