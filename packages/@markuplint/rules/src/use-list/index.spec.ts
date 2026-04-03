import { mlRuleTest } from 'markuplint';
import { test, expect, describe } from 'vitest';

import rule from './index.js';

test('[use-list-invalid-001] use bullets', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<div>
	•A<br>
	•B<br>
	•C
</div>`,
			)
		).violations.length,
	).toBe(3);
});

test('[use-list-invalid-002] use bullets (character reference)', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<div>
	&bullet;A<br>
	&bullet;B<br>
	&bullet;C
</div>`,
			)
		).violations.length,
	).toBe(3);
});

test('[use-list-invalid-003] use katakana middle', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<div>
	<span>・りんご</span>
	<span>・みかん</span>
	<span>・ぶどう</span>
</div>`,
			)
		).violations.length,
	).toBe(3);
});

test('[use-list-invalid-004] Markdown like', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<div>
	- A<br>
	- B<br>
	- C
</div>`,
			)
		).violations.length,
	).toBe(3);
});

test('[use-list-valid-001] Markdown list marker character with no space', async () => {
	expect((await mlRuleTest(rule, '<div>-MINUS</div>')).violations.length).toBe(0);
});

test('[use-list-valid-002] Character only', async () => {
	expect((await mlRuleTest(rule, '<div>●</div>')).violations.length).toBe(0);
});

test('[use-list-invalid-005] continuous', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<div>
	<span>‣‣‣</span><span>It is not a list item</span>
</div>`,
			)
		).violations.length,
	).toBe(0);
});

test('[use-list-invalid-006] emoji (surrogate pair character)', async () => {
	/**
	 * surrogate pair character
	 */
	const sp = '\u{1F846}';
	expect(sp.length).toBe(2);
	expect(
		(
			await mlRuleTest(
				rule,
				`<div>
	${sp}A<br/>
	${sp}B<br/>
	${sp}C
</div>`,
				{
					rule: {
						value: [sp],
					},
				},
			)
		).violations.length,
	).toBe(3);
});

describe('Issues', () => {
	test('[use-list-issue-957] #957', async () => {
		expect(
			(
				await mlRuleTest(rule, '<p>{count} * 2 = {doubled}</p>', {
					parser: {
						'.*': '@markuplint/svelte-parser',
					},
				})
			).violations.length,
		).toBe(0);

		expect(
			(
				await mlRuleTest(rule, '<p>{count} * 2 = {doubled}</p>', {
					rule: {
						options: {
							prevCodeBlock: true,
						},
					},
					parser: {
						'.*': '@markuplint/svelte-parser',
					},
				})
			).violations.length,
		).toBe(1);
	});
});
