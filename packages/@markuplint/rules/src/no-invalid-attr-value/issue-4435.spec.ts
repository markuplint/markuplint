import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-invalid-attr-value-issue-4435-001] a literal in {…} is reported as the string is, at the start of the value that is written', async () => {
	const { violations } = await mlRuleTest(rule, '<input type={"bogus"} />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 14,
			message:
				'The "type" attribute expects either "hidden", "text", "search", "tel", "url", "email", "password", "date", "month", "week", "time", "datetime-local", "number", "range", "color", "checkbox", "radio", "file", "submit", "image", "reset", "button"',
			raw: '"bogus"',
		},
	]);
});

test('[no-invalid-attr-value-issue-4435-002] a position in a value that has an escape is not an offset of the source', async () => {
	const { violations } = await mlRuleTest(rule, '<input type={"bo\\u0067us"} />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 14,
			message:
				'The "type" attribute expects either "hidden", "text", "search", "tel", "url", "email", "password", "date", "month", "week", "time", "datetime-local", "number", "range", "color", "checkbox", "radio", "file", "submit", "image", "reset", "button"',
			raw: '"bo\\u0067us"',
		},
	]);
});

test('[no-invalid-attr-value-issue-4435-003] a string is reported as before', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="bogus" />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 14,
			message:
				'The "type" attribute expects either "hidden", "text", "search", "tel", "url", "email", "password", "date", "month", "week", "time", "datetime-local", "number", "range", "color", "checkbox", "radio", "file", "submit", "image", "reset", "button"',
			raw: 'bogus',
		},
	]);
});
