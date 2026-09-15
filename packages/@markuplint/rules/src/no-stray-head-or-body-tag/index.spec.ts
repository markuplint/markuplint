import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const MATH_IN_HEAD = `<!doctype html>
<head>
<meta charset=utf-8>
<title>math in head</title>
<math><mi>x</mi></math>
</head>
<body></body>
`;

test('[no-stray-head-or-body-tag-invalid-001] disallowed head content leaves a stray end tag and a duplicate body start tag', async () => {
	expect((await mlRuleTest(rule, MATH_IN_HEAD)).violations).toStrictEqual([
		{
			severity: 'error',
			line: 5,
			col: 24,
			raw: '\n</head>\n<body></body>\n',
			message: 'A stray "head" end tag detected',
		},
		{
			severity: 'error',
			line: 5,
			col: 24,
			raw: '\n</head>\n<body></body>\n',
			message: 'A duplicate "body" start tag detected',
		},
	]);
});

test('[no-stray-head-or-body-tag-valid-001] a normal document has no stray tags', async () => {
	expect(
		(await mlRuleTest(rule, '<!doctype html><head><title>ok</title></head><body><p>hi</p></body>')).violations,
	).toStrictEqual([]);
});

test('[no-stray-head-or-body-tag-valid-002] tag-shaped text inside script/style/title is not flagged', async () => {
	const code = `<!doctype html><head><title><body></title><script>const s = '<body>';</script></head><body></body>`;
	expect((await mlRuleTest(rule, code)).violations).toStrictEqual([]);
});
