import specs from '@markuplint/html-spec';
import { createTestDocument } from '@markuplint/ml-core';
import { test, expect } from 'vitest';

import { matches } from './utils.js';

/**
 * Builds a document whose `<x-comp>` element pretends to be `<div>`, and
 * returns the `<x-comp>` element for direct inspection.
 */
function getPretendedElement() {
	const doc = createTestDocument<any, any>('<x-comp>x</x-comp>', {
		specs,
		pretenders: [{ selector: 'x-comp', as: 'div' }],
	});
	const el = doc.nodeList.find(node => node.is(node.ELEMENT_NODE) && node.rawName === 'x-comp');
	if (!el?.is(el.ELEMENT_NODE)) {
		throw new Error('Test fixture is broken: expected an x-comp element.');
	}
	return el;
}

test('[permitted-contents-issue-3739-008] matches() restores pretenderContext after the selector engine throws', () => {
	// An invalid combinator-leading selector (`> span`) forces
	// `createSelector(...).search(node)` to throw `InvalidSelectorError`.
	// The `matches()` helper temporarily nulls `pretenderContext` in `'origin'`
	// mode; if the `finally` branch failed to restore it, subsequent lookups
	// would see the element in its origin identity forever. This test pins the
	// restoration path so regressions in the try/finally are caught.
	const el = getPretendedElement();
	const savedCtx = el.pretenderContext;
	expect(savedCtx?.type).toBe('pretender');

	expect(() => matches('> span', el, specs, 'origin')).toThrow();

	// Critical assertion: pretenderContext must be the exact same reference
	// as before the throw, not null, not a rebuilt copy.
	expect(el.pretenderContext).toBe(savedCtx);
});

test('[permitted-contents-issue-3739-009] matches() leaves pretenderContext untouched in pretended mode', () => {
	// Pretended mode does not touch `pretenderContext` at all; guards against
	// an accidental future refactor that starts mutating the context for both
	// modes.
	const el = getPretendedElement();
	const savedCtx = el.pretenderContext;
	expect(savedCtx?.type).toBe('pretender');

	// A valid selector that matches the pretender target.
	const result = matches('div', el, specs, 'pretended');
	expect(result.matched).toBe(true);
	expect(el.pretenderContext).toBe(savedCtx);
});
