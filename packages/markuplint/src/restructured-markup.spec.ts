import { createTestDocument } from '@markuplint/ml-core';
import rules from '@markuplint/rules';
import { describe, expect, test } from 'vitest';

import { mlTest } from './index.js';

const document = (body: string) =>
	`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title></head><body>${body}</body></html>`;

const everyRule = () => ({ rules: Object.fromEntries(Object.keys(rules).map(name => [name, true])) });

/**
 * Markup in which the HTML parsing algorithm makes a formatting element again. The rules have their own reports for
 * it (a `div` in a `p`); what is looked at here is whether the mapping of the nodes broke, which only a `parse-error`
 * reports.
 */
const MISNESTED = ['<p><a href="#x"><div>x</div></a></p>', '<b><i>x</b>y</i>', '<p><b>x<div>y</div>z</b></p>'];

describe('a formatting element that the parser makes again', () => {
	test.each(MISNESTED)(
		'is not reported as a broken mapping of nodes by a rule that walks the nodes: %s',
		async code => {
			const { violations } = await mlTest(document(code), everyRule());
			expect(violations.filter(violation => violation.ruleId === 'parse-error')).toStrictEqual([]);
		},
	);

	test('has no violation that carries an identifier made at random, so the same document gives the same result', async () => {
		const code = document('<p><a href="#x"><div>x</div></a></p>');
		const first = await mlTest(code, everyRule());
		const second = await mlTest(code, everyRule());
		expect(JSON.stringify(first.violations)).toBe(JSON.stringify(second.violations));
		expect(JSON.stringify(first.violations)).not.toContain('uuid:');
	});

	test('is a node of the document, in the place that the tree of the HTML Standard gives it', () => {
		const html = createTestDocument(document('<p><a href="#x"><div>x</div></a></p>'));
		// the paragraph is closed at the `div`, and the link is made again inside it
		expect(html.querySelectorAll('div > a')).toHaveLength(1);
		expect(html.querySelectorAll('p > a')).toHaveLength(1);
		expect(html.querySelectorAll('a')).toHaveLength(2);
	});
});

describe('the end tags of body and html when an element is still open at </body>', () => {
	test.each([
		[
			'an element that is not closed, and a line break after </body>',
			'<!doctype html><html lang="en"><head><title>t</title></head><body><div>x\n</body>\n</html>\n',
		],
		[
			'a formatting element that is not closed',
			'<!doctype html><html lang="en"><head><title>t</title></head><body><p><b>x</p>\n</body>\n</html>\n',
		],
	])('are not orphaned: %s', async (_, code) => {
		const { violations } = await mlTest(code, { rules: { 'no-orphaned-end-tag': true } });
		expect(violations).toStrictEqual([]);
	});

	test('are not reported as missing either, so the end tag that the unclosed element lacks is the one reported', async () => {
		const { violations } = await mlTest(
			'<!doctype html><html lang="en"><head><title>t</title></head><body><div>x\n</body>\n</html>\n',
			{ rules: { 'require-end-tag': true } },
		);
		expect(violations.map(violation => violation.raw)).toStrictEqual(['<div>']);
	});

	test('an end tag that does close nothing is still orphaned', async () => {
		const { violations } = await mlTest(document('<div>x</div></span>'), {
			rules: { 'no-orphaned-end-tag': true },
		});
		expect(violations.map(violation => violation.raw)).toStrictEqual(['</span>']);
	});
});
