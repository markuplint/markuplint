import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

const document = (svg: string) =>
	`<!doctype html><html lang="en"><head><title>t</title></head><body>${svg}</body></html>`;

/**
 * The SVG `script` element holds character data only ("Content model: Character data."). The parser reads what is in
 * it as text, so a document with one has no violation of its content model, and the rule must be able to read the
 * content model of the element: a model that names a category with no member makes the rule throw.
 *
 * @see https://svgwg.org/svg2-draft/interact.html#ScriptElement
 */
describe('the script element of SVG', () => {
	test('[permitted-contents-298] holds character data', async () => {
		const { violations } = await mlRuleTest(rule, document('<svg><script>var a = 1;</script></svg>'));
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-299] is empty', async () => {
		const { violations } = await mlRuleTest(rule, document('<svg><script href="a.js"></script></svg>'));
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-300] holds what looks like an element as the text that it is', async () => {
		const { violations } = await mlRuleTest(rule, document('<svg><script><circle r="1"></circle></script></svg>'));
		expect(violations).toStrictEqual([]);
	});
});
