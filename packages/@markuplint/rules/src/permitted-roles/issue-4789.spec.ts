import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const parser = { '.*': '@markuplint/jsx-parser' };

test('[permitted-roles-issue-4789-001] JSX: the tokens of a role that code gives are not the roles that the element has', async () => {
	const source = [
		'<>',
		'<img role={props.role} src="a.png" alt="" />',
		'<img role="button" src="a.png" alt="" {...props} />',
		'</>',
	].join('\n');
	expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);

	// Control: the role that the markup tells is judged, also where a spread attribute is before it
	const message = 'Cannot overwrite the "button" role to the "img" element according to ARIA in HTML specification';
	expect((await mlRuleTest(rule, '<img role="button" src="a.png" alt="" />', { parser })).violations).toStrictEqual([
		{ severity: 'error', line: 1, col: 12, message, raw: 'button' },
	]);
	expect(
		(await mlRuleTest(rule, '<img {...props} role="button" src="a.png" alt="" />', { parser })).violations,
	).toStrictEqual([{ severity: 'error', line: 1, col: 23, message, raw: 'button' }]);
});

test('[permitted-roles-issue-4789-002] JSX: a literal that is written as code is a role that the markup tells', async () => {
	const { violations } = await mlRuleTest(rule, '<img role={"button"} src="a.png" alt="" />', { parser });
	expect(violations.map(v => v.message)).toStrictEqual([
		'Cannot overwrite the "button" role to the "img" element according to ARIA in HTML specification',
	]);
});
