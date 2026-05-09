import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[heading-levels-valid-001] No skipped', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
<h1>...</h1>
<p>...</p>
<h2>...</h2>
<p>...</p>
<h3>...</h3>
<p>...</p>
<h2>...</h2>
<p>...</p>
<h3>...</h3>
<p>...</p>
<h4>...</h4>
<p>...</p>
<h2>...</h2>
<p>...</p>
`,
	);
	expect(violations.length).toBe(0);
});

test('[heading-levels-valid-002] First heading at h3 (no preceding heading lead)', async () => {
	// HTML LS §4.3.11 only constrains a heading "following another heading lead".
	// A document whose first heading is h3 has no lead, so it must not fire.
	const { violations } = await mlRuleTest(
		rule,
		`
<h3>...</h3>
<p>...</p>
<h4>...</h4>
`,
	);
	expect(violations.length).toBe(0);
});

test('[heading-levels-valid-003] First heading at h6 (no preceding heading lead)', async () => {
	// Confirms the relaxation extends to every level, not only h3.
	const { violations } = await mlRuleTest(rule, '<h6>...</h6>');
	expect(violations.length).toBe(0);
});

test('[heading-levels-invalid-001] Skipped', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
<h1>...</h1>
<p>...</p>
<h2>...</h2>
<p>...</p>
<h4>...</h4>
<p>...</p>
<h2>...</h2>
<p>...</p>
<h5>...</h5>
<p>...</p>
`,
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 6,
			col: 1,
			message: 'Heading levels must not be skipped',
			raw: '<h4>',
		},
		{
			severity: 'error',
			line: 10,
			col: 1,
			message: 'Heading levels must not be skipped',
			raw: '<h5>',
		},
	]);
});

test('[heading-levels-invalid-002] First h3 then h5 still fires on h5', async () => {
	// Once the rule has a real previous heading lead (h3), a subsequent h5 is a
	// real skip (3+1=4 < 5) and must fire — proving the relaxation does not
	// suppress legitimate skips.
	const { violations } = await mlRuleTest(
		rule,
		`
<h3>...</h3>
<p>...</p>
<h5>...</h5>
`,
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 4,
			col: 1,
			message: 'Heading levels must not be skipped',
			raw: '<h5>',
		},
	]);
});

test('[heading-levels-invalid-003] Descending then ascending fires only on the skip', async () => {
	// Descents (h6 -> h3) are unconstrained. After h3 sets the new lead,
	// jumping to h5 (3+1=4 < 5) is a real skip and must fire on h5 only.
	const { violations } = await mlRuleTest(
		rule,
		`
<h6>...</h6>
<h3>...</h3>
<h5>...</h5>
`,
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 4,
			col: 1,
			message: 'Heading levels must not be skipped',
			raw: '<h5>',
		},
	]);
});

describe('Markdown parser', () => {
	test('[heading-levels-parser-001] HTML headings in Markdown: h1 then h3 skips h2', async () => {
		const { violations } = await mlRuleTest(rule, '<h1>Heading 1</h1>\n\n<h3>Heading 3</h3>\n', {
			parser: {
				'.*': '@markuplint/markdown-parser',
			},
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 3,
				col: 1,
				message: 'Heading levels must not be skipped',
				raw: '<h3>',
			},
		]);
	});

	test('[heading-levels-parser-002] HTML headings in Markdown: no skip', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<h1>Heading 1</h1>\n\n<h2>Heading 2</h2>\n\n<h3>Heading 3</h3>\n',
			{
				parser: {
					'.*': '@markuplint/markdown-parser',
				},
			},
		);
		expect(violations.length).toBe(0);
	});

	test('[heading-levels-parser-003] Markdown syntax headings: h1 then h3 skips h2', async () => {
		// Markdown headings are now converted to HTML heading elements.
		// Therefore heading-levels rule detects h1 → h3 skip.
		const { violations } = await mlRuleTest(rule, '# Heading 1\n\n### Heading 3\n', {
			parser: {
				'.*': '@markuplint/markdown-parser',
			},
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 3,
				col: 1,
				message: 'Heading levels must not be skipped',
				raw: '### Heading 3',
			},
		]);
	});

	test('[heading-levels-parser-004] Mixed Markdown + HTML headings: h1 Markdown then h3 HTML skips h2', async () => {
		const { violations } = await mlRuleTest(rule, '# Heading 1\n\n<h3>Heading 3</h3>\n', {
			parser: {
				'.*': '@markuplint/markdown-parser',
			},
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 3,
				col: 1,
				message: 'Heading levels must not be skipped',
				raw: '<h3>',
			},
		]);
	});
});

describe('Markdown parser - multiple heading skip', () => {
	test('[heading-levels-parser-005] h1 then h2 then h4 skips h3', async () => {
		const { violations } = await mlRuleTest(rule, '# Heading 1\n\n## Heading 2\n\n#### Heading 4\n', {
			parser: {
				'.*': '@markuplint/markdown-parser',
			},
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 5,
				col: 1,
				message: 'Heading levels must not be skipped',
				raw: '#### Heading 4',
			},
		]);
	});
});

describe('MDX parser', () => {
	test('[heading-levels-parser-006] HTML headings in MDX: h1 then h3 skips h2', async () => {
		const { violations } = await mlRuleTest(rule, '<h1>Heading 1</h1>\n\n<h3>Heading 3</h3>\n', {
			parser: {
				'.*': '@markuplint/mdx-parser',
			},
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 3,
				col: 1,
				message: 'Heading levels must not be skipped',
				raw: '<h3>',
			},
		]);
	});

	test('[heading-levels-parser-007] HTML headings in MDX: no skip', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<h1>Heading 1</h1>\n\n<h2>Heading 2</h2>\n\n<h3>Heading 3</h3>\n',
			{
				parser: {
					'.*': '@markuplint/mdx-parser',
				},
			},
		);
		expect(violations.length).toBe(0);
	});

	test('[heading-levels-parser-008] Markdown syntax headings in MDX: h1 then h3 skips h2', async () => {
		// Markdown headings are now converted to HTML heading elements in MDX too.
		const { violations } = await mlRuleTest(rule, '# Heading 1\n\n### Heading 3\n', {
			parser: {
				'.*': '@markuplint/mdx-parser',
			},
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 3,
				col: 1,
				message: 'Heading levels must not be skipped',
				raw: '### Heading 3',
			},
		]);
	});
});
