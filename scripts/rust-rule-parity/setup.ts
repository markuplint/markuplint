/**
 * Runs the rule specs of `@markuplint/rules` against the Rust engine.
 *
 * `vitest.rust-rule-parity.config.ts` sets `MARKUPLINT_EXPERIMENTAL_RUST_CORE`, so the testing API
 * (`mlRuleTest`, `mlTest`, `mlTestFile`) lints with `experimentalRustCore`, and a rule that is
 * one of the built-in ones runs by its registered name. The config also points `@markuplint/rules`
 * at its source, so the rule a spec imports is the object of the registry that the testing API
 * looks up. A fallback to the TypeScript engine would pass on the TypeScript engine's own result,
 * so it fails the test: a pass is the Rust engine's own result.
 */

import path from 'node:path';

import presetRules from '@markuplint/rules';
import { afterEach, beforeAll, beforeEach, expect } from 'vitest';

import { assertRustCoreSwitch, watchFallbacks } from './rust-engine.ts';

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
 * the TS engine is removed.
 */
const KNOWN_DIVERGENCES: ReadonlyMap<string, string> = new Map([
	[
		'permitted-contents/index.spec.ts [permitted-contents-invalid-011]',
		'the Rust HTML parser keeps a div inside a select; parse5 drops it',
	],
]);

/**
 * Whether the specs of the directory test a built-in rule. The ones of a directory that is not
 * registered (`srcset-sizes-constraint`, whose spec lints a custom probe rule, `landmark-roles`,
 * `table-row-column-alignment` and `wai-aria`, which hold helpers) are not checked for a fallback.
 */
function isRegisteredRuleDirectory(filepath: string) {
	const name = path.relative(RULES_SRC, path.dirname(filepath)).split(path.sep)[0];
	return !!name && name in presetRules;
}

// One watcher for the whole file, never stopped: the file is the unit that a worker runs, so there is
// nothing to put back, and no two watchers nest.
const watch = watchFallbacks();

/**
 * The testing API must be on the Rust engine at all: if the environment variable of the config were
 * not the one `markuplint` reads, every spec would run on the TypeScript engine, with no warning to
 * watch for, and pass. A custom rule has to fall back to the TypeScript engine, with a warning, when
 * it is on; and a built-in rule has to run on the Rust engine, which needs the native addon, the
 * environment variable and the redirect of `@markuplint/rules` (the registry identity that
 * `mlRuleTest` looks up) all together.
 */
beforeAll(async () => {
	const original = await import('markuplint');
	await assertRustCoreSwitch(original);

	watch.fallbacks.length = 0;
	const { violations } = await original.mlRuleTest(presetRules['no-duplicate-id']!, '<p id="a"></p><p id="a"></p>');
	expect(
		watch.fallbacks,
		'a built-in rule did not run on the Rust engine (is the native addon built, and `@markuplint/rules` redirected to its source? see registry-alias.ts)',
	).toStrictEqual([]);
	expect(violations).toHaveLength(1);
	watch.fallbacks.length = 0;
});

beforeEach(context => {
	const id = /\[[a-z0-9-]+\]/.exec(context.task.name)?.[0];
	const file = path.relative(RULES_SRC, context.task.file.filepath).split(path.sep).join('/');
	const reason = id ? KNOWN_DIVERGENCES.get(`${file} ${id}`) : undefined;
	if (reason) {
		context.skip(reason);
	}
});

afterEach(context => {
	const told = [...watch.fallbacks];
	watch.fallbacks.length = 0;
	if (isRegisteredRuleDirectory(context.task.file.filepath)) {
		expect(told, 'the Rust engine did not lint this').toStrictEqual([]);
	}
});
