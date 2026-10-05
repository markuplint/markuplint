import type { MLCoreParams } from '../../ml-core.js';
import type { Pretender } from '@markuplint/ml-config';
import type { MLMLSpec } from '@markuplint/ml-spec';

import { parser } from '@markuplint/html-parser';
import spec from '@markuplint/html-spec';
import { describe, test, expect, beforeAll } from 'vitest';

import { convertRuleset } from '../../convert-ruleset.js';
import { MLCore } from '../../ml-core.js';

import { getNodeStoreFor } from './node-store.js';

beforeAll(() => {
	expect(globalThis.gc, 'run Vitest with --expose-gc').toBeTypeOf('function');
});

/**
 * A single synchronous `globalThis.gc()` right after dropping a reference does
 * not reliably clear a `WeakRef` in this V8 build — it needs a microtask
 * tick between collections (observed empirically; not specific to this
 * package). Looping a couple of times is a cheap, deterministic way to make
 * the GC-sensitive tests below reliable instead of flaky.
 */
async function forceGc(): Promise<void> {
	for (let i = 0; i < 3; i++) {
		await new Promise<void>(resolve => setImmediate(resolve));
		globalThis.gc!();
	}
}

function createCore(sourceCode: string, pretenders: readonly Pretender[] = []) {
	const params: MLCoreParams = {
		parser,
		sourceCode,
		ruleset: convertRuleset({}),
		rules: [],
		locale: { locale: 'en' },
		schemas: [spec as unknown as MLMLSpec, {}],
		ruleCommonSettings: {},
		parserOptions: {},
		severity: {},
		pretenders,
		filename: 'test.html',
	};
	return new MLCore(params);
}

/**
 * The first node of `core`'s current document, isolated so callers can take
 * a `WeakRef` of it without a local variable keeping the document itself
 * (and everything in its node store) alive regardless of the fix under test.
 */
function firstNode(core: MLCore) {
	const document = core.document;
	if (document instanceof Error) {
		throw document;
	}
	const [node] = document.nodeList;
	if (!node) {
		throw new Error('Expected at least one parsed node');
	}
	return node;
}

function firstNodeRef(core: MLCore): WeakRef<object> {
	return new WeakRef(firstNode(core));
}

describe('getNodeStoreFor', () => {
	test('returns the same store for the same document object', () => {
		const doc = createCore('<div></div>').document;
		if (doc instanceof Error) throw doc;
		expect(getNodeStoreFor(doc)).toBe(getNodeStoreFor(doc));
	});

	test('returns independent stores for different document objects', () => {
		const docA = createCore('<div></div>').document;
		const docB = createCore('<span></span>').document;
		if (docA instanceof Error) throw docA;
		if (docB instanceof Error) throw docB;
		expect(getNodeStoreFor(docA)).not.toBe(getNodeStoreFor(docB));
	});
});

describe('NodeStore memory scoping (regression for the process-wide leak)', () => {
	// A document's node tree must not outlive the document itself: before this
	// fix, every node was registered in one module-level `Map` shared by the
	// whole process (keyed by a UUID string, never deleted), so re-parsing in
	// a long-lived process (a language server's `onDidChangeContent`, or a
	// CLI run across many files) leaked every past document's full DOM tree
	// for the process's lifetime. See the upstream issue for the full
	// analysis and a standalone heap-snapshot repro.
	test('a document dropped after MLCore#setCode() is collectible', async () => {
		const core = createCore('<div><p>hello</p></div>');
		const nodeRef = firstNodeRef(core);

		// Replaces `core`'s internal document with a new one, exactly like a
		// language server re-linting on every edit (`MLEngine#setCode()` ->
		// `MLCore#setCode()`).
		core.setCode('<span></span>');

		await forceGc();

		expect(nodeRef.deref()).toBeUndefined();
	});

	test('repeated MLCore#setCode() calls do not accumulate nodes across documents', async () => {
		const core = createCore('<div><p>hello</p></div>');

		const refs = Array.from({ length: 20 }, (_, i) => {
			core.setCode(`<div id="d${i}"><p>hello ${i}</p></div>`);
			return firstNodeRef(core);
		});

		// One final setCode() so every ref above — including the most recent
		// one — refers to a now-superseded document.
		core.setCode('<span></span>');

		await forceGc();

		const stillAlive = refs.filter(ref => ref.deref() !== undefined);
		expect(stillAlive).toHaveLength(0);
	});

	test('a document with pretender-generated virtual elements is collectible', async () => {
		const core = createCore('<x-btn></x-btn>', [{ selector: 'x-btn', as: 'button' }]);
		expect(firstNode(core).nodeName).toBe('BUTTON');
		const nodeRef = firstNodeRef(core);

		core.setCode('<span></span>');

		await forceGc();

		expect(nodeRef.deref()).toBeUndefined();
	});
});
