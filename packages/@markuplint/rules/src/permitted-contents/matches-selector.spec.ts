import specs from '@markuplint/html-spec';
import { createTestElement } from '@markuplint/ml-core';
import { test, expect } from 'vitest';

import { matchesSelector } from './matches-selector.js';

/**
 * Runs garbage collection so that a `WeakRef` whose target is no longer
 * referenced can be observed as cleared. `new WeakRef()` keeps its target alive
 * until the current job ends, so each round yields to the macrotask queue
 * first (see `node-store.spec.ts` in `@markuplint/ml-core` for the full
 * rationale).
 */
async function forceGc(): Promise<void> {
	for (let i = 0; i < 3; i++) {
		await new Promise<void>(resolve => setImmediate(resolve));
		globalThis.gc!();
	}
}

/**
 * Warms the condition cache with a specs object that nothing else references,
 * and returns only a `WeakRef` to it so the caller holds no strong reference.
 */
function warmCacheWithFreshSpecs(): WeakRef<object> {
	// `MLDocument` gets a new specs object per parse (`schemaToSpec()`).
	const fresh = { ...specs };
	matchesSelector('#flow', undefined, fresh, 0, 'pretended');
	return new WeakRef(fresh);
}

function c(model: any, innerHtml: string) {
	const el = createTestElement(`<div>${innerHtml}</div>`, { specs });
	const child = [...el.childNodes][0];
	return matchesSelector(model, child, specs, 0, 'pretended');
}

test('[permitted-contents-invalid-001] a', () => {
	expect(c('a', '<a></a>').type).toBe('MATCHED');
	expect(c('a', '<b></b>').type).toBe('UNMATCHED_SELECTORS');
	expect(c('a', '<c></c>').type).toBe('UNMATCHED_SELECTORS');
	expect(c('a', 'text').type).toBe('UNEXPECTED_EXTRA_NODE');
	expect(c('a', '').type).toBe('MISSING_NODE');
});

test('[permitted-contents-invalid-002] #flow', () => {
	expect(c('#flow', '<a></a>').type).toBe('MATCHED');
	expect(c('#flow', '<b></b>').type).toBe('MATCHED');
	expect(c('#flow', '<c></c>').type).toBe('UNMATCHED_SELECTOR_BUT_MAY_EMPTY');
	expect(c('#flow', 'text').type).toBe('MATCHED');
	expect(c('#flow', '').type).toBe('MATCHED_ZERO');
});

test('[permitted-contents-invalid-003] :model(flow)', () => {
	expect(c(':model(flow)', '<a></a>').type).toBe('MATCHED');
	expect(c(':model(flow)', '<b></b>').type).toBe('MATCHED');
	expect(c(':model(flow)', '<c></c>').type).toBe('UNMATCHED_SELECTOR_BUT_MAY_EMPTY');
	expect(c(':model(flow)', 'text').type).toBe('MATCHED');
	expect(c(':model(flow)', '').type).toBe('MATCHED_ZERO');
});

// The condition cache is keyed by the specs object, and every parsed document
// brings its own, so a strong cache would retain one entry per document for the
// life of a long-running process (language server, watch mode).
test('[permitted-contents-issue-4088-001] specs of a dropped document are collectible', async () => {
	expect(globalThis.gc, 'run Vitest with --expose-gc').toBeTypeOf('function');

	const refs = Array.from({ length: 5 }, () => warmCacheWithFreshSpecs());

	await forceGc();

	const stillAlive = refs.filter(ref => ref.deref() !== undefined);
	expect(stillAlive).toHaveLength(0);
});

test('[permitted-contents-invalid-004] #text', () => {
	expect(c('#text', '<a></a>').type).toBe('UNMATCHED_SELECTOR_BUT_MAY_EMPTY');
	expect(c('#text', '<b></b>').type).toBe('UNMATCHED_SELECTOR_BUT_MAY_EMPTY');
	expect(c('#text', '<c></c>').type).toBe('UNMATCHED_SELECTOR_BUT_MAY_EMPTY');
	expect(c('#text', 'text').type).toBe('MATCHED');
	expect(c('#text', '').type).toBe('MATCHED_ZERO');
});

// it(':model(flow):not(:model(interactive))', () => {
// 	expect(c(':model(flow)', '<a></a>', ':not(:model(interactive))').type).toBe('MATCHED');
// 	expect(c(':model(flow)', '<b></b>', ':not(:model(interactive))').type).toBe('MATCHED');
// 	expect(c(':model(flow)', '<c></c>', ':not(:model(interactive))').type).toBe('UNMATCHED_SELECTOR_BUT_MAY_EMPTY');
// 	expect(c(':model(flow)', 'text', ':not(:model(interactive))').type).toBe('MATCHED');
// 	expect(c(':model(flow)', '<button></button>', ':not(:model(interactive))').type).toBe(
// 		'TRANSPARENT_MODEL_DISALLOWS',
// 	);
// });
