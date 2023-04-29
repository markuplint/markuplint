const specs = require('@markuplint/html-spec');
const { createTestElement } = require('@markuplint/ml-core');

const { order } = require('../../lib/permitted-contents/order');

function c(models, innerHtml) {
	const el = createTestElement(`<div>${innerHtml}</div>`);
	return order(models, Array.from(el.childNodes), specs, { ignoreHasMutableChildren: true }, 0);
}

it('ordered requires', () => {
	const models = [
		//
		{ require: 'a' },
		{ require: 'b' },
		{ require: 'c' },
	];

	expect(c(models, '<a></a>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<a></a><b></b>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<a></a><b></b><c></c>').type).toBe('MATCHED');
	expect(c(models, '<a></a><b></b><c></c><d></d>').type).toBe('UNEXPECTED_EXTRA_NODE');
});

it('ordered requires with #flow', () => {
	const models = [
		//
		{ require: '#flow' },
		{ require: 'a' },
		{ require: '#flow' },
		{ require: 'b' },
	];

	expect(c(models, '').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<a></a>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<a></a><b></b>').type).toBe('MATCHED');
	expect(c(models, '<a></a><b></b><c></c>').type).toBe('UNEXPECTED_EXTRA_NODE');
});

it('ordered requires and optionals', () => {
	const models = [
		//
		{ require: 'a' },
		{ optional: 'b' },
		{ require: 'c' },
	];

	expect(c(models, '<a></a><b></b><c></c>').type).toBe('MATCHED');
	expect(c(models, '<a></a><b></b><b></b><c></c>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<a></a>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<b></b><a></a>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<a></a><c></c>').type).toBe('MATCHED');
	expect(c(models, '<a></a><c></c><b></b>').type).toBe('UNEXPECTED_EXTRA_NODE');
});

it('ordered requires and optionals with #flow', () => {
	const models = [
		//
		{ require: 'a' },
		{ optional: 'b' },
		{ optional: 'c' },
		{ require: '#flow' },
	];

	expect(c(models, '<a></a><b></b><c></c>').type).toBe('MATCHED');
	expect(c(models, '<a></a><b></b><b></b><c></c>').type).toBe('UNEXPECTED_EXTRA_NODE');
	expect(c(models, '<a></a>').type).toBe('MATCHED');
	expect(c(models, '<b></b><a></a>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<a></a><c></c>').type).toBe('MATCHED');
	expect(c(models, '<a></a><c></c><b></b>').type).toBe('MATCHED');
});

it('ordered zeroOrMore combination', () => {
	const models = [
		//
		{ zeroOrMore: 'a' },
		{ zeroOrMore: 'b' },
		{ zeroOrMore: 'c' },
	];

	expect(c(models, '<b></b>').type).toBe('MATCHED');
	expect(c(models, '<c></c>').type).toBe('MATCHED');
	expect(c(models, '').type).toBe('MATCHED_ZERO');
	expect(c(models, '<b></b><c></c>').type).toBe('MATCHED');
});

it('the dl element', () => {
	const models = [
		{
			zeroOrMore: ':model(script-supporting)',
		},
		{
			oneOrMore: 'dt',
		},
		{
			zeroOrMore: ':model(script-supporting)',
		},
		{
			oneOrMore: 'dd',
		},
		{
			zeroOrMore: ':model(script-supporting)',
		},
	];

	expect(c(models, '<dt></dt>').type).toBe('MISSING_NODE_ONE_OR_MORE');
	expect(c(models, '<dt></dt><dt></dt>').type).toBe('MISSING_NODE_ONE_OR_MORE');
	expect(c(models, '<dt></dt><dd></dd>').type).toBe('MATCHED');
	expect(c(models, '<dt></dt><dd></dd><dd></dd>').type).toBe('MATCHED');
	expect(c(models, '<dt></dt><dd></dd><dt></dt>').type).toBe('UNEXPECTED_EXTRA_NODE');
});

it('the dl element', () => {
	const models = [
		{
			oneOrMore: [
				{
					zeroOrMore: ':model(script-supporting)',
				},
				{
					oneOrMore: 'dt',
				},
				{
					zeroOrMore: ':model(script-supporting)',
				},
				{
					oneOrMore: 'dd',
				},
				{
					zeroOrMore: ':model(script-supporting)',
				},
			],
		},
	];

	expect(c(models, '<dt></dt>').type).toBe('MISSING_NODE_ONE_OR_MORE');
	expect(c(models, '<dt></dt><dt></dt>').type).toBe('MISSING_NODE_ONE_OR_MORE');
	expect(c(models, '<dt></dt><dd></dd>').type).toBe('MATCHED');
	expect(c(models, '<dt></dt><dd></dd><dd></dd>').type).toBe('MATCHED');
	expect(c(models, '<dt></dt><dd></dd><dt></dt>').type).toBe('MISSING_NODE_ONE_OR_MORE');
	expect(c(models, '<dt></dt><dd></dd><dt></dt><dd></dd>').type).toBe('MATCHED');
	expect(c(models, '<dt></dt><dd></dd><dt></dt><dd></dd><dd></dd><dt></dt>').type).toBe('MISSING_NODE_ONE_OR_MORE');
});

it('the dl element', () => {
	const models = [
		{
			choice: [
				[
					{
						oneOrMore: [
							{
								zeroOrMore: ':model(script-supporting)',
							},
							{
								oneOrMore: 'dt',
							},
							{
								zeroOrMore: ':model(script-supporting)',
							},
							{
								oneOrMore: 'dd',
							},
							{
								zeroOrMore: ':model(script-supporting)',
							},
						],
					},
				],
				[
					{
						zeroOrMore: ':model(script-supporting)',
					},
					{
						oneOrMore: 'div',
					},
					{
						zeroOrMore: ':model(script-supporting)',
					},
				],
			],
		},
	];

	expect(c(models, '<dt></dt>').type).toBe('MISSING_NODE_ONE_OR_MORE');
	expect(c(models, '<dt></dt>').query).toBe('dd');
	expect(c(models, '<dt></dt><dt></dt>').type).toBe('MISSING_NODE_ONE_OR_MORE');
	expect(c(models, '<dt></dt><dd></dd>').type).toBe('MATCHED');
	expect(c(models, '<dt></dt><dd></dd><dd></dd>').type).toBe('MATCHED');
	expect(c(models, '<dt></dt><dd></dd><dt></dt>').type).toBe('MISSING_NODE_ONE_OR_MORE');
	expect(c(models, '<dt></dt><dd></dd><dt></dt><dd></dd>').type).toBe('MATCHED');
	expect(c(models, '<dt></dt><dd></dd><dt></dt><dd></dd><dd></dd><dt></dt>').type).toBe('MISSING_NODE_ONE_OR_MORE');
	expect(c(models, '<div></div>').type).toBe('MATCHED');
	expect(c(models, '<div></div><div></div>').type).toBe('MATCHED');
});

it('the ruby element', () => {
	const models = [
		{
			oneOrMore: [
				{
					require: ':model(phrasing):not(ruby, :has(ruby))',
				},
				{
					choice: [
						[
							{
								oneOrMore: 'rt',
							},
						],
						[
							{
								oneOrMore: [
									{
										require: 'rp',
									},
									{
										oneOrMore: [
											{
												require: 'rt',
											},
											{
												require: 'rp',
											},
										],
									},
								],
							},
						],
					],
				},
			],
		},
	];

	expect(c(models, '<span></span>').type).toBe('MISSING_NODE_ONE_OR_MORE');
	expect(c(models, '<span></span>').query).toBe('rt');
	expect(c(models, '<span></span><rt></rt>').type).toBe('MATCHED');
	expect(c(models, '<span></span><rp></rp><rt></rt>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<span></span><rp></rp><rt></rt>').query).toBe('rp');
});

it('part of the ruby element', () => {
	const models = [
		{
			require: ':model(phrasing):not(ruby, :has(ruby))',
		},
		{
			choice: [
				[
					{
						oneOrMore: 'rt',
					},
				],
				[
					{
						oneOrMore: [
							{
								require: 'rp',
							},
							{
								oneOrMore: [
									{
										require: 'rt',
									},
									{
										require: 'rp',
									},
								],
							},
						],
					},
				],
			],
		},
	];

	expect(c(models, '<span></span>').type).toBe('MISSING_NODE_ONE_OR_MORE');
	expect(c(models, '<span></span>').query).toBe('rt');
	expect(c(models, '<span></span><rt></rt>').type).toBe('MATCHED');
	expect(c(models, '<span></span><rp></rp><rt></rt>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<span></span><rp></rp><rt></rt>').query).toBe('rp');
});

it('part of the ruby element', () => {
	const models = [
		{
			oneOrMore: [
				{
					require: 'rp',
				},
				{
					oneOrMore: [
						{
							require: 'rt',
						},
						{
							require: 'rp',
						},
					],
				},
			],
		},
	];

	expect(c(models, '<span></span>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<span></span>').query).toBe('rp');
	expect(c(models, '<rp></rp>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<rp></rp>').query).toBe('rt');
	expect(c(models, '<rp></rp><rt></rt><rp></rp>').type).toBe('MATCHED');
	expect(c(models, '<rp></rp><rt></rt><rp></rp><rt></rt>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<rp></rp><rt></rt><rp></rp><rt></rt>').query).toBe('rp');
	expect(c(models, '<rp></rp><rt></rt><rp></rp><rt></rt><rp></rp>').type).toBe('MATCHED');
});

it('part of the ruby element', () => {
	const models = [
		{
			oneOrMore: [
				{
					require: 'rt',
				},
				{
					require: 'rp',
				},
			],
		},
	];

	expect(c(models, '<rt></rt>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<rt></rt>').query).toBe('rp');
	expect(c(models, '<rt></rt><rp></rp>').type).toBe('MATCHED');
	expect(c(models, '<rt></rt><rp></rp><rt></rt>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<rt></rt><rp></rp><rt></rt>').query).toBe('rp');
	expect(c(models, '<rt></rt><rp></rp><rt></rt><rp></rp>').type).toBe('MATCHED');
});

it('part of the ruby element', () => {
	const models = [
		{
			require: 'rt',
		},
		{
			require: 'rp',
		},
	];

	expect(c(models, '<rt></rt>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<rt></rt>').query).toBe('rp');
	expect(c(models, '<rt></rt><rp></rp>').type).toBe('MATCHED');
});
