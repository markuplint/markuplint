import { createTestElement } from '../../test';
import { matchSelector } from './match-selector';

test('CSS Selector', async () => {
	const el = createTestElement('<div id="hoge" class="foo bar"></div>');
	expect(matchSelector(el, '*')).toStrictEqual({});
	expect(matchSelector(el, 'div')).toStrictEqual({});
	expect(matchSelector(el, 'div#hoge')).toStrictEqual({});
	expect(matchSelector(el, 'div#fuga')).toStrictEqual(null);
	expect(matchSelector(el, '#hoge')).toStrictEqual({});
	expect(matchSelector(el, 'div.foo')).toStrictEqual({});
	expect(matchSelector(el, 'div.bar')).toStrictEqual({});
	expect(matchSelector(el, '.foo')).toStrictEqual({});
	expect(matchSelector(el, '.foo.bar')).toStrictEqual({});
	expect(matchSelector(el, '.any')).toStrictEqual(null);
});

test('nodeName', async () => {
	const el = createTestElement('<div></div>');
	expect(
		matchSelector(el, {
			nodeName: '/^[a-z]+$/',
		}),
	).toStrictEqual({
		__nodeName: 'div',
	});
});

test('nodeName named group capture', async () => {
	const el = createTestElement('<h6></h6>');
	expect(
		matchSelector(el, {
			nodeName: '/^h(?<level>[1-6])$/',
		}),
	).toStrictEqual({
		__nodeName: 'h6',
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
		__nodeName: 'div',
	});
});

test('attrName', async () => {
	const el = createTestElement('<div data-attr></div>');
	expect(
		matchSelector(el, {
			attrName: '/^data-([a-z]+)$/',
		}),
	).toStrictEqual({
		__attrName0: 'data-attr',
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
		__attrValue0: 'abc',
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
		__nodeName: 'div',
		__attrName0: 'data-attr',
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
		__attrName0: 'data-attr',
		__attrValue0: 'abc',
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
		__nodeName: 'div',
		__attrName0: 'data-attr',
		__attrValue0: 'abc',
	});
});
