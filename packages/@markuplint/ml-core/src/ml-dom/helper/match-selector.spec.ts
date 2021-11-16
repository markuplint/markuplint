import { createTestElement } from '../../test';

import { matchSelector } from './match-selector';

test('CSS Selector', async () => {
	const el = createTestElement('<div id="hoge" class="foo bar"></div>');
	expect(matchSelector(el, '*')).toStrictEqual({ __node: '*' });
	expect(matchSelector(el, 'div')).toStrictEqual({ __node: 'div' });
	expect(matchSelector(el, 'div#hoge')).toStrictEqual({ __node: 'div#hoge' });
	expect(matchSelector(el, 'div#fuga')).toStrictEqual(null);
	expect(matchSelector(el, '#hoge')).toStrictEqual({ __node: '#hoge' });
	expect(matchSelector(el, 'div.foo')).toStrictEqual({ __node: 'div.foo' });
	expect(matchSelector(el, 'div.bar')).toStrictEqual({ __node: 'div.bar' });
	expect(matchSelector(el, '.foo')).toStrictEqual({ __node: '.foo' });
	expect(matchSelector(el, '.foo.bar')).toStrictEqual({ __node: '.foo.bar' });
	expect(matchSelector(el, '.any')).toStrictEqual(null);
});

test('nodeName', async () => {
	const el = createTestElement('<div></div>');
	expect(
		matchSelector(el, {
			nodeName: '/^[a-z]+$/',
		}),
	).toStrictEqual({
		__node: 'div',
	});
});

test('nodeName named group capture', async () => {
	const el = createTestElement('<h6></h6>');
	expect(
		matchSelector(el, {
			nodeName: '/^h(?<level>[1-6])$/',
		}),
	).toStrictEqual({
		__node: 'h6',
		$1: '6',
		level: '6',
	});
});

test('nodeName (No RegExp)', async () => {
	const el = createTestElement('<div></div>');
	expect(
		matchSelector(el, {
			nodeName: 'div',
		}),
	).toStrictEqual({
		__node: 'div',
	});
});

test('attrName', async () => {
	const el = createTestElement('<div data-attr></div>');
	expect(
		matchSelector(el, {
			attrName: '/^data-([a-z]+)$/',
		}),
	).toStrictEqual({
		__node: '[data-attr]',
		$1: 'attr',
	});
});

test('attrValue', async () => {
	const el = createTestElement('<div data-attr="abc"></div>');
	expect(
		matchSelector(el, {
			attrValue: '/^[a-z]+$/',
		}),
	).toStrictEqual({
		__node: '[data-attr="abc"]',
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
	).toStrictEqual(null);
});

test('nodeName & attrName', async () => {
	const el = createTestElement('<div data-attr="abc"></div>');
	expect(
		matchSelector(el, {
			nodeName: 'div',
			attrName: 'data-attr',
		}),
	).toStrictEqual({
		__node: 'div[data-attr]',
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
		__node: '[data-attr][data-attr="abc"]',
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
		__node: 'div[data-attr][data-attr="abc"]',
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
		__node: 'div[data-attr][data-attr="abc"] span',
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
		__node: 'div[data-attr][data-attr="abc"] > span > a',
		$1: 'a',
		EdgeNodeName: 'a',
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
		__node: '[class="i3"] + li',
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
		__node: '[class="i3"] ~ li',
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
		__node: '[class="i4"]:has(+ li)',
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
		__node: '[class="i5"]:has(~ li)',
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
		__node: 'div[id][class][id="foo"][class="bar"]',
		tag: 'div',
		attr: 'class',
		value: 'bar',
		$1: 'bar',
	});
});
