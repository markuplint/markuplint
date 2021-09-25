import { createTestElement, createTestNodeList } from '../../test';
import { createSelector } from './selector';

describe('selector matching', () => {
	it('type / id / class', async () => {
		const el = createTestElement('<div id="hoge" class="foo bar"></div>');
		expect(createSelector('*').match(el)).toBe(true);
		expect(createSelector('div').match(el)).toBe(true);
		expect(createSelector('div#hoge').match(el)).toBe(true);
		expect(createSelector('div#fuga').match(el)).toBe(false);
		expect(createSelector('#hoge').match(el)).toBe(true);
		expect(createSelector('div.foo').match(el)).toBe(true);
		expect(createSelector('div.bar').match(el)).toBe(true);
		expect(createSelector('.foo').match(el)).toBe(true);
		expect(createSelector('.foo.bar').match(el)).toBe(true);
		expect(createSelector('.any').match(el)).toBe(false);
	});

	it('attributes', async () => {
		const el = createTestElement('<div a="ABC" b="123" c="あいうえお"></div>');
		expect(createSelector('[a]').match(el)).toBe(true);
		expect(createSelector('[a][b][c]').match(el)).toBe(true);
		expect(createSelector('[a][b][c][d]').match(el)).toBe(false);
		expect(createSelector('[d]').match(el)).toBe(false);
		expect(createSelector('[a=ABC]').match(el)).toBe(true);
		expect(createSelector('[a="ABC"]').match(el)).toBe(true);
		expect(createSelector('[a^=A]').match(el)).toBe(true);
		expect(createSelector('[a$=C]').match(el)).toBe(true);
		expect(createSelector('[a*=B]').match(el)).toBe(true);
	});

	it(':not', async () => {
		const el = createTestElement('<div id="hoge" class="foo bar"></div>');
		expect(createSelector('*:not(a)').match(el)).toBe(true);
		expect(createSelector('*:not(div)').match(el)).toBe(false);
		expect(createSelector('div:not(.any)').match(el)).toBe(true);
		expect(createSelector('div:not(#fuga)').match(el)).toBe(true);
		expect(createSelector(':not(#hoge)').match(el)).toBe(false);
	});

	it(':root', async () => {
		const nodeList = createTestNodeList('<html><body></body></html>');
		// @ts-ignore
		expect(createSelector(':root').match(nodeList[0])).toBe(true);
		// @ts-ignore
		expect(createSelector(':root').match(nodeList[0].childNodes[0])).toBe(false);
	});

	it(':has', async () => {
		const el = createTestElement('<div><span></span></div>');
		expect(createSelector(':has(> span)').match(el)).toBe(true);

		const el2 = createTestElement('<div><a></a></div>');
		expect(createSelector(':has(> span)').match(el2)).toBe(false);

		const el3 = createTestElement('<header><article></article></header>');
		const selector =
			':has(article, aside, main, nav, section, [role=article], [role=complementary], [role=main], [role=navigation], [role=region])';
		expect(createSelector(selector).match(el3)).toBe(true);

		const el4 = createTestElement('<header><div><article></article></div></header>');
		expect(createSelector(selector).match(el4)).toBe(true);
	});

	it('Multiple selector', async () => {
		const el = createTestElement('<div></div>');
		expect(createSelector('div, span').match(el)).toBe(true);
	});
});
