import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[meta-charset-position-invalid-001] meta charset serialized after the first 1024 bytes', async () => {
	const padding = '#'.repeat(1002);
	const code = `<!doctype html><!--${padding}--><meta charset=utf-8>`;
	const metaOffset = code.indexOf('<meta');

	expect((await mlRuleTest(rule, code)).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: metaOffset + 1,
			raw: '<meta charset=utf-8>',
			message: 'The character encoding declaration must be within the first 1024 bytes of the document',
		},
	]);
});

test('[meta-charset-position-invalid-002] meta http-equiv content-type serialized after the first 1024 bytes', async () => {
	const padding = '#'.repeat(1002);
	const code = `<!doctype html><!--${padding}--><meta http-equiv="Content-Type" content="text/html; charset=utf-8">`;

	expect((await mlRuleTest(rule, code)).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1025,
			raw: '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">',
			message: 'The character encoding declaration must be within the first 1024 bytes of the document',
		},
	]);
});

test('[meta-charset-position-valid-001] meta charset within the first 1024 bytes', async () => {
	const padding = '#'.repeat(1001);
	const code = `<!doctype html><!--${padding}--><meta charset=utf-8>`;

	expect((await mlRuleTest(rule, code)).violations).toStrictEqual([]);
});

test('[meta-charset-position-valid-002] no character encoding declaration present', async () => {
	expect((await mlRuleTest(rule, '<!doctype html><title>no charset</title>')).violations).toStrictEqual([]);
});
