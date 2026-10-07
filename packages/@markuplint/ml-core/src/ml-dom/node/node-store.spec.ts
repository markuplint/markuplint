import type { MLCoreParams } from '../../ml-core.js';
import type { Pretender } from '@markuplint/ml-config';
import type { MLMLSpec } from '@markuplint/ml-spec';

import { parser } from '@markuplint/html-parser';
import spec from '@markuplint/html-spec';
import { describe, test, expect, beforeAll } from 'vitest';

import { convertRuleset } from '../../convert-ruleset.js';
import { MLCore } from '../../ml-core.js';
import { dummySchemas } from '../../test/index.js';

import { MLDocument } from './document.js';

/**
 * Runs garbage collection so that a `WeakRef` whose target is no longer
 * referenced can be observed as cleared.
 *
 * `new WeakRef(target)` and `WeakRef#deref()` add `target` to the agent's
 * kept-alive list, which holds it strongly until the current job ends
 * (ECMAScript `AddToKeptObjects` / `ClearKeptObjects`, "KeepDuringJob"). A
 * `gc()` in the same job as the `WeakRef` creation or `deref()` therefore
 * cannot collect the target. Yielding to the macrotask queue with
 * `setImmediate` ends the job; a microtask (`await Promise.resolve()`) does
 * not, and the tests below then fail on Node.
 *
 * Three rounds is a margin, not a derived minimum: a single round was enough
 * in every trial on Node and Bun, so the extra rounds only absorb collector
 * timing differences between runtimes.
 *
 * On JavaScriptCore (Bun) this is only deterministic with concurrent JIT
 * compilation disabled: an in-flight DFG/FTL plan is a GC root for every value
 * it froze, including the `astNode => createNode(astNode, this)` closure of a
 * superseded `MLDocument`, and `gc()` cannot complete plans. CI's `test-bun`
 * job therefore sets `BUN_JSC_useConcurrentJIT=0`.
 *
 * @see https://tc39.es/ecma262/#sec-weak-ref-objects
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
 * (and everything in its node store) alive.
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

describe('NodeStore resolves nodes within their own document', () => {
	test('nodes resolve their parent and children within their own document', () => {
		const ast = parser.parse('<div><p>a</p></div>');
		const ruleset = convertRuleset({});
		const docA = new MLDocument(ast, ruleset, dummySchemas(), {});
		const docB = new MLDocument(ast, ruleset, dummySchemas(), {});

		const divA = docA.querySelector('div');
		const pA = docA.querySelector('p');
		const divB = docB.querySelector('div');

		expect(Object.is(pA?.parentNode, divA)).toBe(true);
		expect(Object.is(pA?.parentNode, divB)).toBe(false);
		expect(Object.is(divA?.childNodes[0], pA)).toBe(true);
	});
});

describe('NodeStore is scoped to its owning document', () => {
	beforeAll(() => {
		expect(globalThis.gc, 'run Vitest with --expose-gc').toBeTypeOf('function');
	});

	// A document's node tree must not outlive the document itself: its nodes are
	// registered in a store the document owns, not in process-wide state, so a
	// process that re-parses repeatedly (a language server's
	// `onDidChangeContent`) does not retain every past document. See #4074.
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

		// A process-wide registry would keep all 20 documents reachable here.
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
