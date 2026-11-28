import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

const document = (svg: string) =>
	`<!doctype html><html lang="en"><head><title>t</title></head><body>${svg}</body></html>`;

/**
 * The content model of the SVG `script` element is character data only. The rule must be able to read the content
 * model of the element: a model that names a category with no member makes the rule throw. In the HTML syntax its
 * content is foreign content, which the tree construction parses as markup (the rules for parsing tokens in foreign
 * content), so what looks like an element in it is one, and is not allowed there.
 *
 * @see https://svgwg.org/svg2-draft/interact.html#ScriptElement
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inforeign
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

	test('[permitted-contents-300] holds what looks like an element as the element that it is', async () => {
		const { violations } = await mlRuleTest(rule, document('<svg><script><circle r="1"></circle></script></svg>'));
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 80,
				message: 'The "circle" element is not allowed in the "script" element in this context',
				raw: '<circle r="1">',
			},
		]);
	});
});
