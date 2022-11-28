import { mlRuleTest } from 'markuplint';

import rule from './';

test('character-reference', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"> > < & " \' &amp;</div>');
	expect(violations.length).toBe(4);
	expect(violations[0]).toStrictEqual({
		severity: 'error',
		message: 'Illegal characters must escape in character reference',
		line: 1,
		col: 14,
		raw: '>',
	});
	expect(violations[1].col).toBe(16);
	expect(violations[1].raw).toBe('<');
	expect(violations[2].col).toBe(18);
	expect(violations[2].raw).toBe('&');
	expect(violations[3].col).toBe(20);
	expect(violations[3].raw).toBe('"');
});

test('character-reference', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="path/to?a=b&c=d">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'Illegal characters must escape in character reference',
			line: 1,
			col: 22,
			raw: '&',
		},
	]);
});

test('character-reference', async () => {
	const { violations } = await mlRuleTest(rule, '<script>if (i < 0) console.log("<markuplint>");</script>');
	expect(violations.length).toBe(0);
});

test('in Vue', async () => {
	const { violations } = await mlRuleTest(rule, '<template><div v-if="a < b"></div></template>', {
		parser: {
			'.*': '@markuplint/vue-parser',
		},
	});
	expect(violations.length).toBe(0);
});

test('in EJS', async () => {
	const { violations } = await mlRuleTest(rule, '<title><%- "title" _%></title>', {
		parser: {
			'.*': '@markuplint/ejs-parser',
		},
	});
	expect(violations.length).toBe(0);
});

describe('Issue', () => {
	test('#577', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Document</title>\n</head>\n<body>\nsample\n</body>\n',
				)
			).violations.length,
		).toBe(0);
		expect(
			(
				await mlRuleTest(
					rule,
					'<!DOCTYPE html>\r\n<html>\r\n<head>\r\n<meta charset="UTF-8">\r\n<title>Document</title>\r\n</head>\r\n<body>\r\nsample\r\n</body>\r\n',
				)
			).violations.length,
		).toBe(0);
	});
});
