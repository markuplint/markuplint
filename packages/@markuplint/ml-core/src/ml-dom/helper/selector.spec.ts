import { createSelector } from './selector';
import { createTestElement } from '../../test';

describe('selector matching', () => {
	it('Multiple selector', async () => {
		const el = createTestElement('<div></div>');
		expect(createSelector('div, span').match(el)).toBe(true);
	});

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
		const el = createTestElement('<div a="ABC" b="1 2 3" c="あいうえお" d="en-US" e="" f></div>');

		expect(createSelector('[a]').match(el)).toBe(true);
		expect(createSelector('[a][b][c][d]').match(el)).toBe(true);
		expect(createSelector('[a][d]').match(el)).toBe(true);
		expect(createSelector('[g]').match(el)).toBe(false);
		expect(createSelector('[a=ABC]').match(el)).toBe(true);
		expect(createSelector('[a="ABC"]').match(el)).toBe(true);
		expect(createSelector('[a=ABC i]').match(el)).toBe(true);
		expect(createSelector('[a=abc i]').match(el)).toBe(true);
		expect(createSelector('[a=abC i]').match(el)).toBe(true);
		expect(createSelector('[a=abC]').match(el)).toBe(false);
		expect(createSelector('[b~=2]').match(el)).toBe(true);
		expect(createSelector('[b~=12]').match(el)).toBe(false);
		expect(createSelector('[d|=en]').match(el)).toBe(true);
		expect(createSelector('[d|=e]').match(el)).toBe(false);
		expect(createSelector('[d|=ja]').match(el)).toBe(false);
		expect(createSelector('[a*=B]').match(el)).toBe(true);
		expect(createSelector('[a*=D]').match(el)).toBe(false);
		expect(createSelector('[a^=A]').match(el)).toBe(true);
		expect(createSelector('[a^=AB]').match(el)).toBe(true);
		expect(createSelector('[a^=ABC]').match(el)).toBe(true);
		expect(createSelector('[a^=C]').match(el)).toBe(false);
		expect(createSelector('[a^=BC]').match(el)).toBe(false);
		expect(createSelector('[a$=A]').match(el)).toBe(false);
		expect(createSelector('[a$=AB]').match(el)).toBe(false);
		expect(createSelector('[a$=C]').match(el)).toBe(true);
		expect(createSelector('[a$=BC]').match(el)).toBe(true);
		expect(createSelector('[a$=ABC]').match(el)).toBe(true);
		expect(createSelector('[e]').match(el)).toBe(true);
		expect(createSelector('[e=""]').match(el)).toBe(true);
		expect(createSelector('[e="a"]').match(el)).toBe(false);
		expect(createSelector('[a=""]').match(el)).toBe(false);
		expect(createSelector('[f]').match(el)).toBe(true);
		expect(createSelector('[f=""]').match(el)).toBe(true);
		expect(createSelector('[f="f"]').match(el)).toBe(false);
	});

	it(':not', async () => {
		const el = createTestElement('<div id="hoge" class="foo bar"></div>');
		expect(createSelector('*:not(a)').match(el)).toBe(true);
		expect(createSelector('*:not(div)').match(el)).toBe(false);
		expect(createSelector('div:not(.any)').match(el)).toBe(true);
		expect(createSelector('div:not(#fuga)').match(el)).toBe(true);
		expect(createSelector(':not(#hoge)').match(el)).toBe(false);
	});

	it(':is', async () => {
		const el = createTestElement('<div id="hoge" class="foo bar"></div>');
		expect(createSelector(':is(a, div)').match(el)).toBe(true);
		expect(createSelector(':is(a, span)').match(el)).toBe(false);
	});

	it(':scope', async () => {
		const el = createTestElement('<div></div>');
		expect(createSelector(':scope').match(el)).toBe(true);
	});

	it(':root', async () => {
		const el = createTestElement('<html><div id="hoge" class="foo bar"></div></html>');
		expect(createSelector(':root').match(el)).toBe(true);
		const el2 = createTestElement('<div id="hoge" class="foo bar"></div>');
		expect(createSelector(':root').match(el2)).toBe(false);
	});

	it('Descendant combinator', async () => {
		const el = createTestElement('<div><span><a></a></span></div>');
		const a = el.children[0].children[0];
		expect(a.nodeName).toBe('a');
		expect(createSelector('div a').match(a)).toBe(true);
		expect(createSelector('div span a').match(a)).toBe(true);
		expect(createSelector('span a').match(a)).toBe(true);
		expect(createSelector('header a').match(a)).toBe(false);
	});

	it('Child combinator', async () => {
		const el = createTestElement('<div><span><a></a></span></div>');
		const a = el.children[0].children[0];
		expect(createSelector('div > div').match(el)).toBe(false);
		expect(a.nodeName).toBe('a');
		expect(createSelector('span > a').match(a)).toBe(true);
		expect(createSelector('div span > a').match(a)).toBe(true);
		expect(createSelector('div > a').match(a)).toBe(false);
		expect(createSelector('header > a').match(a)).toBe(false);
	});

	it('Next-sibling combinator', async () => {
		const el = createTestElement(`<ul>
			<li class="i1"><a class="a1">1</a></li>
			<li class="i2"><a class="a2">2</a></li>
			<li class="i3"><a class="a3">3</a></li>
			<li class="i4"><a class="a4">4</a></li>
			<li class="i5"><a class="a5">5</a></li>
		</ul>`);
		expect(createSelector('.i2 + li').match(el.children[0])).toBe(false);
		expect(createSelector('.i2 + li').match(el.children[1])).toBe(false);
		expect(createSelector('.i2 + li').match(el.children[2])).toBe(true);
		expect(createSelector('.i2 + li').match(el.children[3])).toBe(false);
		expect(createSelector('.i2 + li').match(el.children[4])).toBe(false);
		expect(createSelector('.i4 + li').match(el.children[0])).toBe(false);
		expect(createSelector('.i4 + li').match(el.children[1])).toBe(false);
		expect(createSelector('.i4 + li').match(el.children[2])).toBe(false);
		expect(createSelector('.i4 + li').match(el.children[3])).toBe(false);
		expect(createSelector('.i4 + li').match(el.children[4])).toBe(true);
	});

	it('Subsequent-sibling combinator', async () => {
		const el = createTestElement(`<ul>
			<li class="i1"><a class="a1">1</a></li>
			<li class="i2"><a class="a2">2</a></li>
			<li class="i3"><a class="a3">3</a></li>
			<li class="i4"><a class="a4">4</a></li>
			<li class="i5"><a class="a5">5</a></li>
		</ul>`);
		expect(createSelector('.i2 ~ li').match(el.children[0])).toBe(false);
		expect(createSelector('.i2 ~ li').match(el.children[1])).toBe(false);
		expect(createSelector('.i2 ~ li').match(el.children[2])).toBe(true);
		expect(createSelector('.i2 ~ li').match(el.children[3])).toBe(true);
		expect(createSelector('.i2 ~ li').match(el.children[4])).toBe(true);
	});

	it(':has', async () => {
		const el = createTestElement('<div><span><i></i></span></div>');
		expect(createSelector(':has(span)').match(el)).toBe(true);
		expect(createSelector(':has(a)').match(el)).toBe(false);
		expect(createSelector(':has(i)').match(el)).toBe(true);
		expect(createSelector(':has(> span)').match(el)).toBe(true);
		expect(createSelector(':has(> i)').match(el)).toBe(false);

		const el2 = createTestElement('<div><a></a></div>');
		expect(createSelector(':has(> span)').match(el2)).toBe(false);

		const selector =
			':has(article, aside, main, nav, section, [role=article], [role=complementary], [role=main], [role=navigation], [role=region])';
		const el3 = createTestElement('<header><article></article></header>');
		expect(createSelector(selector).match(el3)).toBe(true);
		const el4 = createTestElement('<header><div><article></article></div></header>');
		expect(createSelector(selector).match(el4)).toBe(true);
	});
});
