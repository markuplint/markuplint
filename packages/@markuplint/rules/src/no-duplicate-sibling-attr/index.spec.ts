import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-duplicate-sibling-attr-issue-3640-001] multiple track default is invalid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<video><track kind="subtitles" src="a.vtt" default><track kind="captions" src="b.vtt" default></video>',
	);
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			raw: '<track kind="captions" src="b.vtt" default>',
			message: 'The "default" attribute must not appear on more than one "track" element within the same parent',
		}),
	]);
});

test('[no-duplicate-sibling-attr-issue-3640-002] single track default is valid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<video><track kind="subtitles" src="a.vtt" default><track kind="captions" src="b.vtt"></video>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-duplicate-sibling-attr-issue-3640-003] multiple track default in audio is invalid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<audio><track kind="subtitles" src="a.vtt" default><track kind="captions" src="b.vtt" default></audio>',
	);
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			raw: '<track kind="captions" src="b.vtt" default>',
			message: 'The "default" attribute must not appear on more than one "track" element within the same parent',
		}),
	]);
});

test('[no-duplicate-sibling-attr-issue-4584-001] the message is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<video><track kind="subtitles" src="a.vtt" default><track kind="captions" src="b.vtt" default></video>',
		undefined,
		false,
		'ja',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 52,
			message: '「default」属性は、同じ親の中にある複数の「track」要素に指定するべきではありません',
			raw: '<track kind="captions" src="b.vtt" default>',
		},
	]);
});
