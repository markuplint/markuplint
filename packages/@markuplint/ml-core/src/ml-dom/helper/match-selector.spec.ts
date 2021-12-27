import { createTestElement } from '../../test';

import { matchSelector } from './match-selector';

test('CSS Selector', async () => {
	const el = createTestElement('<div id="hoge" class="foo bar"></div>');
	expect(matchSelector(el, '*')).toStrictEqual({ matched: true, selector: '*', specificity: [0, 0, 0] });
	expect(matchSelector(el, 'div')).toStrictEqual({ matched: true, selector: 'div', specificity: [0, 0, 1] });
	expect(matchSelector(el, 'div#hoge')).toStrictEqual({
		matched: true,
		selector: 'div#hoge',
		specificity: [1, 0, 1],
	});
	expect(matchSelector(el, 'div#fuga')).toStrictEqual({ matched: false });
	expect(matchSelector(el, '#hoge')).toStrictEqual({ matched: true, selector: '#hoge', specificity: [1, 0, 0] });
	expect(matchSelector(el, 'div.foo')).toStrictEqual({ matched: true, selector: 'div.foo', specificity: [0, 1, 1] });
	expect(matchSelector(el, 'div.bar')).toStrictEqual({ matched: true, selector: 'div.bar', specificity: [0, 1, 1] });
	expect(matchSelector(el, '.foo')).toStrictEqual({ matched: true, selector: '.foo', specificity: [0, 1, 0] });
	expect(matchSelector(el, '.foo.bar')).toStrictEqual({
		matched: true,
		selector: '.foo.bar',
		specificity: [0, 2, 0],
	});
	expect(matchSelector(el, '.any')).toStrictEqual({ matched: false });
});

test('nodeName', async () => {
	const el = createTestElement('<div></div>');
	expect(
		matchSelector(el, {
			nodeName: '/^[a-z]+$/',
		}),
	).toStrictEqual({
		matched: true,
		selector: 'div',
		specificity: [0, 0, 1],
		data: {},
	});
});

test('nodeName named group capture', async () => {
	const el = createTestElement('<h6></h6>');
	expect(
		matchSelector(el, {
			nodeName: '/^h(?<level>[1-6])$/',
		}),
	).toStrictEqual({
		matched: true,
		selector: 'h6',
		specificity: [0, 0, 1],
		data: {
			$1: '6',
			level: '6',
		},
	});
});

test('nodeName (No RegExp)', async () => {
	const el = createTestElement('<div></div>');
	expect(
		matchSelector(el, {
			nodeName: 'div',
		}),
	).toStrictEqual({
		matched: true,
		selector: 'div',
		specificity: [0, 0, 1],
		data: {},
	});
});

test('attrName', async () => {
	const el = createTestElement('<div data-attr></div>');
	expect(
		matchSelector(el, {
			attrName: '/^data-([a-z]+)$/',
		}),
	).toStrictEqual({
		matched: true,
		selector: '[data-attr]',
		specificity: [0, 1, 0],
		data: {
			$1: 'attr',
		},
	});
});

test('attrValue', async () => {
	const el = createTestElement('<div data-attr="abc"></div>');
	expect(
		matchSelector(el, {
			attrValue: '/^[a-z]+$/',
		}),
	).toStrictEqual({
		matched: true,
		selector: '[data-attr="abc"]',
		specificity: [0, 1, 0],
		data: {},
	});
});

test('No matched', async () => {
	const el = createTestElement('<div data-attr="abc"></div>');
	expect(
		matchSelector(el, {
			nodeName: 'span',
			attrName: 'data-attr',
			attrValue: 'abc',
		}),
	).toStrictEqual({
		matched: false,
	});
});

test('nodeName & attrName', async () => {
	const el = createTestElement('<div data-attr="abc"></div>');
	expect(
		matchSelector(el, {
			nodeName: 'div',
			attrName: 'data-attr',
		}),
	).toStrictEqual({
		matched: true,
		selector: 'div[data-attr]',
		specificity: [0, 1, 1],
		data: {},
	});
});

test('attrName & attrValue', async () => {
	const el = createTestElement('<div data-attr="abc"></div>');
	expect(
		matchSelector(el, {
			attrName: 'data-attr',
			attrValue: '/^[a-z]+$/',
		}),
	).toStrictEqual({
		matched: true,
		selector: '[data-attr="abc"]',
		specificity: [0, 1, 0],
		data: {},
	});
});

test('nodeName & attrName & attrValue', async () => {
	const el = createTestElement('<div data-attr="abc"></div>');
	expect(
		matchSelector(el, {
			nodeName: 'div',
			attrName: 'data-attr',
			attrValue: 'abc',
		}),
	).toStrictEqual({
		matched: true,
		selector: 'div[data-attr="abc"]',
		specificity: [0, 1, 1],
		data: {},
	});
});

test('combination " "', async () => {
	const el = createTestElement('<div data-attr="abc"><span></span></div>');
	const span = el.children[0];
	expect(
		matchSelector(span, {
			nodeName: 'div',
			attrName: 'data-attr',
			attrValue: 'abc',
			combination: {
				combinator: ' ',
				nodeName: 'span',
			},
		}),
	).toStrictEqual({
		matched: true,
		selector: 'div[data-attr="abc"] span',
		specificity: [0, 1, 2],
		data: {},
	});
});

test('combination >', async () => {
	const el = createTestElement('<div data-attr="abc"><span><a></a></span></div>');
	const span = el.children[0];
	const a = span.children[0];
	expect(
		matchSelector(a, {
			nodeName: 'div',
			attrName: 'data-attr',
			attrValue: 'abc',
			combination: {
				combinator: '>',
				nodeName: 'span',
				combination: {
					combinator: '>',
					nodeName: '/^(?<EdgeNodeName>[a-z]+)$/',
				},
			},
		}),
	).toStrictEqual({
		matched: true,
		selector: 'div[data-attr="abc"] > span > a',
		specificity: [0, 1, 3],
		data: {
			$1: 'a',
			EdgeNodeName: 'a',
		},
	});
});

test('combination +', async () => {
	const el = createTestElement(`<ul>
	<li class="i1"><a class="a1">1</a></li>
	<li class="i2"><a class="a2">2</a></li>
	<li class="i3"><a class="a3">3</a></li>
	<li class="i4"><a class="a4">4</a></li>
	<li class="i5"><a class="a5">5</a></li>
</ul>`);
	const i4 = el.children[3];
	expect(
		matchSelector(i4, {
			attrValue: 'i3',
			combination: {
				combinator: '+',
				nodeName: 'li',
			},
		}),
	).toStrictEqual({
		matched: true,
		selector: '[class="i3"] + li',
		specificity: [0, 1, 1],
		data: {},
	});
});

test('combination ~', async () => {
	const el = createTestElement(`<ul>
	<li class="i1"><a class="a1">1</a></li>
	<li class="i2"><a class="a2">2</a></li>
	<li class="i3"><a class="a3">3</a></li>
	<li class="i4"><a class="a4">4</a></li>
	<li class="i5"><a class="a5">5</a></li>
</ul>`);
	const i5 = el.children[4];
	expect(
		matchSelector(i5, {
			attrValue: 'i3',
			combination: {
				combinator: '~',
				nodeName: 'li',
			},
		}),
	).toStrictEqual({
		matched: true,
		selector: '[class="i3"] ~ li',
		specificity: [0, 1, 1],
		data: {},
	});
});

test('combination :has(+)', async () => {
	const el = createTestElement(`<ul>
	<li class="i1"><a class="a1">1</a></li>
	<li class="i2"><a class="a2">2</a></li>
	<li class="i3"><a class="a3">3</a></li>
	<li class="i4"><a class="a4">4</a></li>
	<li class="i5"><a class="a5">5</a></li>
</ul>`);
	const i3 = el.children[2];
	expect(
		matchSelector(i3, {
			attrValue: 'i4',
			combination: {
				combinator: ':has(+)',
				nodeName: 'li',
			},
		}),
	).toStrictEqual({
		matched: true,
		selector: '[class="i4"]:has(+ li)',
		specificity: [0, 1, 1],
		data: {},
	});
});

test('combination :has(~)', async () => {
	const el = createTestElement(`<ul>
	<li class="i1"><a class="a1">1</a></li>
	<li class="i2"><a class="a2">2</a></li>
	<li class="i3"><a class="a3">3</a></li>
	<li class="i4"><a class="a4">4</a></li>
	<li class="i5"><a class="a5">5</a></li>
</ul>`);
	const i3 = el.children[2];
	expect(
		matchSelector(i3, {
			attrValue: 'i5',
			combination: {
				combinator: ':has(~)',
				nodeName: 'li',
			},
		}),
	).toStrictEqual({
		matched: true,
		selector: '[class="i5"]:has(~ li)',
		specificity: [0, 1, 1],
		data: {},
	});
});

test('pug', async () => {
	const el = createTestElement('div#foo.bar', { parser: require('@markuplint/pug-parser') });
	expect(
		matchSelector(el, {
			nodeName: '/^(?<tag>[a-z]+)$/',
			attrName: '/^(?<attr>[a-z]+)$/',
			attrValue: '/^(?<value>[a-z]+)$/',
		}),
	).toStrictEqual({
		matched: true,
		selector: 'div[id="foo"][class="bar"]',
		specificity: [0, 2, 1],
		data: {
			tag: 'div',
			attr: 'class',
			value: 'bar',
			$1: 'bar',
		},
	});
});
