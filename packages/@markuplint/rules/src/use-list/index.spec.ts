import { mlRuleTest } from 'markuplint';

import rule from './';

test('use bullets', async () => {
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

test('use bullets (character reference)', async () => {
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

test('use katakana middle', async () => {
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

test('Markdown like', async () => {
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

test('Markdown list marker character with no space', async () => {
	expect((await mlRuleTest(rule, '<div>-MINUS</div>')).violations.length).toBe(0);
});

test('Character only', async () => {
	expect((await mlRuleTest(rule, '<div>●</div>')).violations.length).toBe(0);
});

test('continuous', async () => {
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
