/**
 * Runs the rule specs of `@markuplint/rules` against the Rust engine.
 *
 * `mlRuleTest` hands the rule under test to the TypeScript engine as a custom rule, which the
 * Rust engine never evaluates (a custom rule makes it fall back). Here it is replaced: the rule
 * is enabled by its registered name, the one the spec file's directory carries, and the file is
 * linted with `experimentalRustCore`. A fallback to the TypeScript engine fails the test, so a
 * pass is the Rust engine's own result.
 */

import type * as Markuplint from 'markuplint';

import path from 'node:path';

import { beforeEach, expect, vi } from 'vitest';

type MarkuplintModule = typeof Markuplint;
type RuleTestArgs = Parameters<MarkuplintModule['mlRuleTest']>;

const RULES_SRC = path.resolve('packages', '@markuplint', 'rules', 'src');

/**
 * Tests whose expectation the Rust engine deliberately does not meet, keyed by the spec file
 * (relative to the rules' `src`) and the ID in the test name: an ID is unique per spec file, not per
 * rule (`permitted-contents-invalid-011` is also in `count-pattern.spec.ts` and `order.spec.ts`).
 *
 * `permitted-contents/index.spec.ts` `[permitted-contents-invalid-011]` (a `<div>` inside a
 * `<select>`): the TS engine reads the
 * markup with parse5 8.1, which still has the "in select" insertion mode and drops the `div`
 * into the text of the `select`, so the TS rule reports a text node. The Rust HTML parser follows
 * the current HTML Living Standard, where that mode is gone and the `div` stays an element of the
 * `select` (https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody, the rules for
 * the `select` and `option` start tags), and the html5lib-tests conformance suite that
 * `markuplint-html-parser` runs says the same (`tree-construction/webkit02.dat`). Matching parse5
 * would take a parser mode that contradicts that suite. The expectation of the TS spec flips when
 * the TS engine is removed (RFC #3178 Phase 8-5).
 */
const KNOWN_DIVERGENCES: ReadonlyMap<string, string> = new Map([
	[
		'permitted-contents/index.spec.ts [permitted-contents-invalid-011]',
		'the Rust HTML parser keeps a div inside a select; parse5 drops it',
	],
]);

beforeEach(context => {
	const id = /\[[a-z0-9-]+\]/.exec(context.task.name)?.[0];
	const file = path.relative(RULES_SRC, context.task.file.filepath).split(path.sep).join('/');
	const reason = id ? KNOWN_DIVERGENCES.get(`${file} ${id}`) : undefined;
	if (reason) {
		context.skip(reason);
	}
});

vi.mock('markuplint', async importOriginal => {
	const original = await importOriginal<MarkuplintModule>();
	const { default: presetRules } = await import('@markuplint/rules');
	const { lintWithRust } = await import('./rust-engine.ts');

	function ruleUnderTest(): string | undefined {
		const testPath = expect.getState().testPath ?? '';
		const name = path.relative(RULES_SRC, path.dirname(testPath)).split(path.sep)[0];
		return name && name in presetRules ? name : undefined;
	}

	function mlRuleTest(...args: RuleTestArgs) {
		const name = ruleUnderTest();
		if (!name) {
			return original.mlRuleTest(...args);
		}
		return lintWithRust(original, name, args);
	}

	return { ...original, mlRuleTest };
});
