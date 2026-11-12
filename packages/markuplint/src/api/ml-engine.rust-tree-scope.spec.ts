import type { Config, Violation } from '@markuplint/ml-config';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { MLEngine } from './ml-engine.js';

const nativeAddonIsBuilt = await import('@markuplint/core').then(
	mod => typeof mod.lintHtml === 'function',
	() => false,
);

/** Lints on one engine; the Rust one must not have fallen back to the TypeScript one. */
const lint = async (sourceCode: string, config: Config, rust: boolean): Promise<readonly Violation[]> => {
	const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
	try {
		const file = await MLEngine.toMLFile({ sourceCode, name: 'a.html' });
		const engine = new MLEngine(file!, {
			noSearchConfig: true,
			locale: 'en',
			experimentalRustCore: rust,
			config,
		});
		const result = await engine.exec();
		expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join('')).not.toContain('[experimental-rust-core]');
		return result?.violations ?? [];
	} finally {
		stderr.mockRestore();
	}
};

const summarize = (violations: readonly Violation[]) =>
	violations.map(v => `${v.line}:${v.col} ${v.ruleId} ${v.message}`);

const places = (violations: readonly Violation[]) => violations.map(v => `${v.line}:${v.col}`);

const nodeRule = (selector: string): Config => ({
	nodeRules: [{ selector, rules: { 'require-attr': 'x' } }],
});

/**
 * A selector is matched in the tree of the element: the content of a `template` element is a tree
 * of its own, so a combinator does not reach out of it (TS `treeParentElement`). Each row says
 * where the rule is reported, which both engines must agree on.
 */
describe.skipIf(!nativeAddonIsBuilt)('the selector of a node rule stays in the tree of the element', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each([
		[
			'a descendant combinator',
			'<section><p></p><template><p></p></template></section>',
			nodeRule('section p'),
			['1:10'],
		],
		[
			'a child combinator',
			'<section><template><p></p></template></section>',
			nodeRule('section > template > p'),
			[],
		],
		['a sibling combinator', '<section><template><b></b><p></p></template></section>', nodeRule('b + p'), ['1:27']],
		['a negation', '<section><template><p></p></template></section>', nodeRule('p:not(section p)'), ['1:20']],
		['a relational selector', '<section><template><p></p></template></section>', nodeRule('section:has(p)'), []],
		['a child relational selector', '<template><p></p></template>', nodeRule('template:has(> p)'), []],
		[
			'a child relational selector below an element',
			'<section><template><p></p></template></section>',
			nodeRule('section > template:has(> p)'),
			[],
		],
		['closest', '<section><template><p></p></template></section>', nodeRule('p:closest(section)'), []],
		[
			'a negated closest',
			'<section><template><p></p></template></section>',
			nodeRule('p:not(:closest(section))'),
			['1:20'],
		],
		['the root of a fragment', '<p></p><template><html></html></template>', nodeRule(':root'), []],
		[
			'the root of a document',
			'<!DOCTYPE html><html lang="en"><head><title>t</title></head><body></body></html>',
			nodeRule(':root'),
			['1:16'],
		],
	])('matches as the TypeScript engine does for %s', async (_name, sourceCode, config, expectedPlaces) => {
		const expected = await lint(sourceCode, config, false);
		const actual = await lint(sourceCode, config, true);

		expect(places(expected)).toStrictEqual(expectedPlaces);
		expect(summarize(actual)).toStrictEqual(summarize(expected));
	});
});
