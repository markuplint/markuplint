import type { Identity } from './types.js';
import type { PretenderAttr, PretenderContent, Slot } from '@markuplint/ml-config';

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
 * The attributes `outer` writes on `inner` reach the element only through the props
 * `inner` passes on, and a scanner cannot see how `inner` handles its props, so
 * they are composed conservatively (see {@link composeAttrs}):
 *
 * - They are added to the attributes of the result only when `inner` spreads its props
 *   (`inheritAttrs`), and are dropped otherwise (`variant="primary"` is consumed by `inner`
 *   and is not an attribute of the element). A name both write is kept when the values
 *   agree and is `{ dynamic: true }` otherwise, because which one wins depends on the position
 *   of the spread, which a scanner does not record.
 * - The result spreads its props (`inheritAttrs`) only when both `outer` and `inner` do:
 *   the attributes written at the usage site of `outer` reach the element only through both.
 * - An attribute of `inner` that takes the value of one of its props (`{ fromAttr }`)
 *   takes what `outer` writes for that prop instead, because the usage site of `inner` is
 *   now `outer`. It is omitted when `outer` does not pass the prop on.
 *
 * ARIA properties (`aria`) are not composed, and the result carries those of `inner`.
 * The scanners do not write `aria` at all: they write `aria-label` and the like as attributes
 * (`attrs`), so that the name is computed by the accessible name algorithm. `aria.name` would
 * take precedence over `aria-labelledby`, which no component source says.
 *
 * The result is again a description of the element that `inner` renders, so a longer
 * chain composes one hop at a time, from the outermost component inward.
 */
export function composeIdentity(outer: Identity, inner: Identity): Identity {
	const composedInner = typeof inner === 'string' ? inner : composeAttrs(outer, inner);
	if (typeof outer === 'string') {
		return composedInner;
	}

	const innerDetail: DetailedIdentity =
		typeof composedInner === 'string' ? { element: composedInner } : composedInner;
	// `null` means no slot, and omitting `slots` means `true`; `??` would fold the former into the latter.
	const innerSlots = innerDetail.slots === undefined ? true : innerDetail.slots;
	if (innerSlots === null) {
		return composedInner;
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
 * only restate the default, the same as the scanners write their identities.
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

/**
 * Composes the attributes that `outer` writes on `inner` into what `inner` says about
 * its element: the attributes of the root, those of the wrappers of its slots and of
 * its contents, and `inheritAttrs`. The rules are in {@link composeIdentity}.
 */
function composeAttrs(outer: Identity, inner: DetailedIdentity): DetailedIdentity {
	const outerAttrs = typeof outer === 'string' ? [] : (outer.attrs ?? []);
	const isOuterSpread = typeof outer !== 'string' && outer.inheritAttrs === true;
	const isInnerSpread = inner.inheritAttrs === true;
	const resolve = (attrs: readonly PretenderAttr[] | undefined) =>
		(attrs ?? []).flatMap(attr => resolveAttr(attr, outerAttrs, isOuterSpread));

	const rootAttrs = isInnerSpread ? addAttrs(resolve(inner.attrs), outerAttrs) : resolve(inner.attrs);
	const { slots, contents } = inner;

	return {
		...omit(inner, ['attrs', 'inheritAttrs', 'slots', 'contents']),
		...(rootAttrs.length > 0 ? { attrs: rootAttrs } : {}),
		...(isOuterSpread && isInnerSpread ? { inheritAttrs: true } : {}),
		...(slots === undefined
			? {}
			: { slots: Array.isArray(slots) ? slots.map(slot => resolveSlot(slot, resolve)) : slots }),
		...(contents ? { contents: resolveContents(contents, resolve) } : {}),
	};
}

function resolveSlot(slot: Slot, resolve: (attrs: readonly PretenderAttr[] | undefined) => PretenderAttr[]): Slot {
	const { attrs, contents, ...rest } = slot;
	const resolvedAttrs = resolve(attrs);
	return {
		...rest,
		...(resolvedAttrs.length > 0 ? { attrs: resolvedAttrs } : {}),
		...(contents ? { contents: resolveContents(contents, resolve) } : {}),
	};
}

function resolveContents(
	contents: readonly PretenderContent[],
	resolve: (attrs: readonly PretenderAttr[] | undefined) => PretenderAttr[],
): PretenderContent[] {
	return contents.map((entry): PretenderContent => {
		if (!('element' in entry)) {
			return entry;
		}
		const { attrs, ...rest } = entry;
		const resolvedAttrs = resolve(attrs);
		return { ...rest, ...(resolvedAttrs.length > 0 ? { attrs: resolvedAttrs } : {}) };
	});
}

/**
 * Re-expresses an attribute of `inner` that takes the value of a prop (`{ fromAttr }`)
 * in terms of what `outer` writes. The other attributes are returned as they are.
 *
 * - `outer` writes the prop: its value. If `outer` spreads its props too, which of the two
 *   is rendered depends on the position of the spread, so it is dynamic. A boolean
 *   (`<Inner label />`) is `true`, which is not the string it would be as an attribute,
 *   and is dynamic as well.
 * - `outer` does not write it, but spreads its props: the usage site of `outer` may have it,
 *   so the attribute is left as it is.
 * - Neither: the prop is `undefined`. The attribute is omitted if `inner` says that it is
 *   omitted then (`omitIfMissing`), and is empty otherwise.
 */
function resolveAttr(
	attr: PretenderAttr,
	outerAttrs: readonly PretenderAttr[],
	isOuterSpread: boolean,
): PretenderAttr[] {
	const { value } = attr;
	if (typeof value !== 'object' || !('fromAttr' in value)) {
		return [attr];
	}

	const propName = value.fromAttr.toLowerCase();
	const written = outerAttrs.find(outerAttr => isSameName(outerAttr.name, propName));
	if (written) {
		const writtenValue = written.value;
		if (
			isOuterSpread ||
			writtenValue === undefined ||
			(typeof writtenValue === 'object' && 'dynamic' in writtenValue)
		) {
			return [{ name: attr.name, value: { dynamic: true } }];
		}
		return [{ name: attr.name, value: writtenValue }];
	}

	if (isOuterSpread) {
		return [attr];
	}

	return value.omitIfMissing ? [] : [{ name: attr.name }];
}

/**
 * Adds the attributes that `outer` writes to those of the element. A name both have is
 * kept when the values agree, and is dynamic otherwise.
 */
function addAttrs(attrs: readonly PretenderAttr[], added: readonly PretenderAttr[]): PretenderAttr[] {
	const result = [...attrs];
	for (const attr of added) {
		const index = result.findIndex(existing => isSameName(existing.name, attr.name));
		const existing = result[index];
		if (!existing) {
			result.push(attr);
		} else if (serializeValue(existing.value) !== serializeValue(attr.value)) {
			result[index] = { name: existing.name, value: { dynamic: true } };
		}
	}
	return result;
}

/**
 * Attribute names are matched without regard to case, as ml-core does.
 */
function isSameName(a: string, b: string) {
	return a.toLowerCase() === b.toLowerCase();
}

/**
 * Two values agree when they say the same thing, whatever the order of their keys.
 */
function serializeValue(value: PretenderAttr['value']) {
	if (value === undefined) {
		return 'boolean';
	}
	if (typeof value === 'string') {
		return `string:${value}`;
	}
	if ('dynamic' in value) {
		return 'dynamic';
	}
	return `fromAttr:${value.fromAttr.toLowerCase()}:${value.omitIfMissing === true}`;
}

function omit<T extends object, K extends keyof T>(value: T, keys: readonly K[]): Omit<T, K> {
	return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key as K))) as Omit<T, K>;
}
