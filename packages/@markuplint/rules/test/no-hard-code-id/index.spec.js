const { mlRuleTest } = require('markuplint');

const rule = require('../../lib/no-hard-code-id').default;

it('is hard-coded', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="foo"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			raw: 'id="foo"',
			message: 'It is hard-coded',
		},
	]);
});

it("does't have id", async () => {
	const { violations } = await mlRuleTest(rule, '<div class="foo"></div>');
	expect(violations).toStrictEqual([]);
});

it("does't have id", async () => {
	const { violations } = await mlRuleTest(rule, '<div data-id="foo"></div>');
	expect(violations).toStrictEqual([]);
});

it('is hard-coded', async () => {
	const { violations } = await mlRuleTest(rule, 'div#foo', {
		parser: {
			'/.*/': '@markuplint/pug-parser',
		},
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 4,
			raw: '#foo',
			message: 'It is hard-coded',
		},
	]);
});

it('is hard-coded', async () => {
	const { violations } = await mlRuleTest(rule, 'div(id="foo")', {
		parser: {
			'/.*/': '@markuplint/pug-parser',
		},
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 5,
			raw: 'id="foo"',
			message: 'It is hard-coded',
		},
	]);
});

it('is hard-coded', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="foo"></div>', {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			raw: 'id="foo"',
			message: 'It is hard-coded',
		},
	]);
});

it('is no hard-coded', async () => {
	const { violations } = await mlRuleTest(rule, 'div(id=foo)', {
		parser: {
			'/.*/': '@markuplint/pug-parser',
		},
	});
	expect(violations.length).toBe(0);
});

it('is no hard-coded', async () => {
	const { violations } = await mlRuleTest(rule, '<div id={foo}></div>', {
		parser: {
			'/.*/': '@markuplint/jsx-parser',
		},
	});
	expect(violations.length).toBe(0);
});

it('is no fragment', async () => {
	const { violations } = await mlRuleTest(rule, '<html><body><div id="foo"></div></body></html>');
	expect(violations.length).toBe(0);
});
