import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[no-orphaned-end-tag-001] It is test', async () => {
	const { violations } = await mlRuleTest(rule, '<div></p></br><p></span></p></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			raw: '</p>',
			message: 'Orphaned end tag detected',
		},
		{
			severity: 'error',
			line: 1,
			col: 10,
			raw: '</br>',
			message: 'Orphaned end tag detected',
		},
		{
			severity: 'error',
			line: 1,
			col: 18,
			raw: '</span>',
			message: 'Orphaned end tag detected',
		},
	]);
});

test('[no-orphaned-end-tag-002] an orphaned end tag after a newline is reported at its own line and column', async () => {
	const { violations } = await mlRuleTest(rule, '<div>\n  </p>\n</div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 2,
			col: 3,
			raw: '</p>',
			message: 'Orphaned end tag detected',
		},
	]);
});

test('[no-orphaned-end-tag-003] the end tag of html in a frameset document is not orphaned', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<!doctype html><html lang="en"><head><title>t</title></head><frameset cols=""><frame src=""></frameset></html>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-orphaned-end-tag-004] `</html>` before the outermost frameset is closed is orphaned', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<!doctype html><html><head></head><frameset><frameset></frameset></html></frameset></html>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 66,
			raw: '</html>',
			message: 'Orphaned end tag detected',
		},
	]);
});

describe('fix', () => {
	test('[no-orphaned-end-tag-005] remove orphaned end tag', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<div></div></span>', undefined, true);
		expect(fixedCode).toBe('<div></div>');
	});

	test('[no-orphaned-end-tag-006] remove multiple orphaned end tags', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<div></p></br><p></span></p></div>', undefined, true);
		expect(fixedCode).toBe('<div><p></p></div>');
	});
});

test.each([
	'<!doctype html><head></head><body></body></html>',
	'<!doctype html><html><title>t</title></head><body></body></html>',
	'<!doctype html><html><head></head><p>x</p></body></html>',
	'<!doctype html><table><tr><td>x</td></tr></tbody></table>',
	'<!doctype html><table><col></colgroup><tr><td>x</td></tr></table>',
	'<!doctype html><frameset></frameset></html>',
])('[no-orphaned-end-tag-007] the end tag of an element whose start tag is omitted is not orphaned: %s', async code => {
	expect((await mlRuleTest(rule, code)).violations).toStrictEqual([]);
});

test.each([
	'<!doctype html><body><iframe></p></iframe></body>',
	'<!doctype html><body><noembed></p></noembed></body>',
	'<!doctype html><body><noframes></p></noframes></body>',
	'<!doctype html><body><textarea></p></textarea></body>',
	'<!doctype html><body><title></p></title></body>',
	'<!doctype html><body><plaintext></p></body>',
	'<!doctype html><body><TEXTAREA></P></TEXTAREA></body>',
	'<!doctype html><body><Title></P></Title></body>',
])(
	'[no-orphaned-end-tag-008] an end tag in the text of an element whose content is text is not orphaned: %s',
	async code => {
		expect((await mlRuleTest(rule, code)).violations).toStrictEqual([]);
	},
);

test('[no-orphaned-end-tag-009] an end tag that closes nothing is orphaned although the html, head and body around it have no start tag in the source', async () => {
	const { violations } = await mlRuleTest(rule, '<!doctype html><p>x</p></p></body></html>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 24,
			raw: '</p>',
			message: 'Orphaned end tag detected',
		},
	]);
});

test('[no-orphaned-end-tag-010] an end tag in the text of `title` in `<svg>` is orphaned, because its content is markup', async () => {
	const { violations } = await mlRuleTest(rule, '<!doctype html><body><svg><title></p></title></svg></body>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 34,
			raw: '</p>',
			message: 'Orphaned end tag detected',
		},
	]);
});

test('[no-orphaned-end-tag-011] the fix leaves the end tag of an element whose start tag is omitted', async () => {
	const code = '<!doctype html><head></head><body></body></html>';
	const { fixedCode } = await mlRuleTest(rule, code, undefined, true);
	expect(fixedCode).toBe(code);
});

test('[no-orphaned-end-tag-012] the end tag of `tr`, whose start tag the Standard does not let be omitted, is orphaned', async () => {
	const { violations } = await mlRuleTest(rule, '<!doctype html><table><td>x</td></tr></table>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			raw: '</tr>',
			message: 'Orphaned end tag detected',
		},
	]);
});
