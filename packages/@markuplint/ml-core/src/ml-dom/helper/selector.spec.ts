import { createTestElement } from '../../test';

import { createSelector } from './selector';

describe('selector matching', () => {
	it('Multiple selector', async () => {
		const el = createTestElement('<div></div>');
		expect(createSelector('div, span').match(el)).toBeTruthy();
	});

	it('type / id / class', async () => {
		const el = createTestElement('<div id="hoge" class="foo bar"></div>');
		expect(createSelector('*').match(el)).toBeTruthy();
		expect(createSelector('div').match(el)).toBeTruthy();
		expect(createSelector('div#hoge').match(el)).toBeTruthy();
		expect(createSelector('div#fuga').match(el)).toBe(false);
		expect(createSelector('#hoge').match(el)).toBeTruthy();
		expect(createSelector('div.foo').match(el)).toBeTruthy();
		expect(createSelector('div.bar').match(el)).toBeTruthy();
		expect(createSelector('.foo').match(el)).toBeTruthy();
		expect(createSelector('.foo.bar').match(el)).toBeTruthy();
		expect(createSelector('.any').match(el)).toBe(false);
	});

	it('attributes', async () => {
		const el = createTestElement('<div a="ABC" b="1 2 3" c="あいうえお" d="en-US" e="" f></div>');

		expect(createSelector('[a]').match(el)).toBeTruthy();
		expect(createSelector('[a][b][c][d]').match(el)).toBeTruthy();
		expect(createSelector('[a][d]').match(el)).toBeTruthy();
		expect(createSelector('[g]').match(el)).toBe(false);
		expect(createSelector('[a=ABC]').match(el)).toBeTruthy();
		expect(createSelector('[a="ABC"]').match(el)).toBeTruthy();
		expect(createSelector('[a=ABC i]').match(el)).toBeTruthy();
		expect(createSelector('[a=abc i]').match(el)).toBeTruthy();
		expect(createSelector('[a=abC i]').match(el)).toBeTruthy();
		expect(createSelector('[a=abC]').match(el)).toBe(false);
		expect(createSelector('[b~=2]').match(el)).toBeTruthy();
		expect(createSelector('[b~=12]').match(el)).toBe(false);
		expect(createSelector('[d|=en]').match(el)).toBeTruthy();
		expect(createSelector('[d|=e]').match(el)).toBe(false);
		expect(createSelector('[d|=ja]').match(el)).toBe(false);
		expect(createSelector('[a*=B]').match(el)).toBeTruthy();
		expect(createSelector('[a*=D]').match(el)).toBe(false);
		expect(createSelector('[a^=A]').match(el)).toBeTruthy();
		expect(createSelector('[a^=AB]').match(el)).toBeTruthy();
		expect(createSelector('[a^=ABC]').match(el)).toBeTruthy();
		expect(createSelector('[a^=C]').match(el)).toBe(false);
		expect(createSelector('[a^=BC]').match(el)).toBe(false);
		expect(createSelector('[a$=A]').match(el)).toBe(false);
		expect(createSelector('[a$=AB]').match(el)).toBe(false);
		expect(createSelector('[a$=C]').match(el)).toBeTruthy();
		expect(createSelector('[a$=BC]').match(el)).toBeTruthy();
		expect(createSelector('[a$=ABC]').match(el)).toBeTruthy();
		expect(createSelector('[e]').match(el)).toBeTruthy();
		expect(createSelector('[e=""]').match(el)).toBeTruthy();
		expect(createSelector('[e="a"]').match(el)).toBe(false);
		expect(createSelector('[a=""]').match(el)).toBe(false);
		expect(createSelector('[f]').match(el)).toBeTruthy();
		expect(createSelector('[f=""]').match(el)).toBeTruthy();
		expect(createSelector('[f="f"]').match(el)).toBe(false);
	});

	it(':not', async () => {
		const el = createTestElement('<div id="hoge" class="foo bar"></div>');
		expect(createSelector('*:not(a)').match(el)).toBeTruthy();
		expect(createSelector('*:not(div)').match(el)).toBe(false);
		expect(createSelector('div:not(.any)').match(el)).toBeTruthy();
		expect(createSelector('div:not(#fuga)').match(el)).toBeTruthy();
		expect(createSelector(':not(#hoge)').match(el)).toBe(false);
	});

	it(':is', async () => {
		const el = createTestElement('<div id="hoge" class="foo bar"></div>');
		expect(createSelector(':is(a, div)').match(el)).toBeTruthy();
		expect(createSelector(':is(a, span)').match(el)).toBe(false);
	});

	it(':has', async () => {
		const el = createTestElement('<header><div></div></header>');
		expect(createSelector(':has(div, span)').match(el)).toBeTruthy();
		expect(
			createSelector(
				':has(article, aside, main, nav, section, [role=article], [role=complementary], [role=main], [role=navigation], [role=region])',
			).match(el),
		).toBe(false);
	});

	it(':scope', async () => {
		const el = createTestElement('<div></div>');
		expect(createSelector(':scope').match(el)).toBeTruthy();
	});

	it(':root', async () => {
		const el = createTestElement('<html><div id="hoge" class="foo bar"></div></html>');
		expect(createSelector(':root').match(el)).toBeTruthy();
		const el2 = createTestElement('<div id="hoge" class="foo bar"></div>');
		expect(createSelector(':root').match(el2)).toBe(false);
	});

	it('Descendant combinator', async () => {
		const el = createTestElement('<div><span><a></a></span></div>');
		const a = el.children[0].children[0];
		expect(a.nodeName).toBe('a');
		expect(createSelector('div a').match(a)).toBeTruthy();
		expect(createSelector('div span a').match(a)).toBeTruthy();
		expect(createSelector('span a').match(a)).toBeTruthy();
		expect(createSelector('header a').match(a)).toBe(false);
	});

	it('Child combinator', async () => {
		const el = createTestElement('<div><span><a></a></span></div>');
		const a = el.children[0].children[0];
		expect(createSelector('div > div').match(el)).toBe(false);
		expect(a.nodeName).toBe('a');
		expect(createSelector('span > a').match(a)).toBeTruthy();
		expect(createSelector('div span > a').match(a)).toBeTruthy();
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
		expect(createSelector('.i2 + li').match(el.children[2])).toBeTruthy();
		expect(createSelector('.i2 + li').match(el.children[3])).toBe(false);
		expect(createSelector('.i2 + li').match(el.children[4])).toBe(false);
		expect(createSelector('.i4 + li').match(el.children[0])).toBe(false);
		expect(createSelector('.i4 + li').match(el.children[1])).toBe(false);
		expect(createSelector('.i4 + li').match(el.children[2])).toBe(false);
		expect(createSelector('.i4 + li').match(el.children[3])).toBe(false);
		expect(createSelector('.i4 + li').match(el.children[4])).toBeTruthy();
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
		expect(createSelector('.i2 ~ li').match(el.children[2])).toBeTruthy();
		expect(createSelector('.i2 ~ li').match(el.children[3])).toBeTruthy();
		expect(createSelector('.i2 ~ li').match(el.children[4])).toBeTruthy();
	});

	it(':closest', async () => {
		const el = createTestElement('<table><tr><td></td></tr></table>');
		const td = el.children[0].children[0].children[0];
		expect(createSelector('td').match(td)).toBeTruthy();
		expect(createSelector(':closest(table)').match(td)).toBeTruthy();
		expect(createSelector(':closest(tr)').match(td)).toBeTruthy();
		expect(createSelector(':closest(tbody)').match(td)).toBeTruthy();
		expect(createSelector(':closest(div)').match(td)).toBe(false);
	});
});

describe('specificity', () => {
	it(':not', async () => {
		const el = createTestElement('<div></div>');
		expect(createSelector('div').match(el)).toStrictEqual([0, 0, 1]);
		expect(createSelector(':not(span)').match(el)).toStrictEqual([0, 0, 1]);
		expect(createSelector(':not(span, a)').match(el)).toStrictEqual([0, 0, 1]);
		expect(createSelector(':not(span, #foo)').match(el)).toStrictEqual([1, 0, 0]);
	});

	it(':is', async () => {
		const el = createTestElement('<div></div>');
		expect(createSelector('div').match(el)).toStrictEqual([0, 0, 1]);
		expect(createSelector(':is(div)').match(el)).toStrictEqual([0, 0, 1]);
		expect(createSelector(':is(div, span)').match(el)).toStrictEqual([0, 0, 1]);
		expect(createSelector(':is(div, #foo)').match(el)).toStrictEqual([1, 0, 0]);
		expect(createSelector(':is(div, #foo, .bar)').match(el)).toStrictEqual([1, 0, 0]);
		expect(createSelector(':is(div, #foo.bar)').match(el)).toStrictEqual([1, 1, 0]);
	});

	it(':where', async () => {
		const el = createTestElement('<div></div>');
		expect(createSelector('div').match(el)).toStrictEqual([0, 0, 1]);
		expect(createSelector(':where(div)').match(el)).toStrictEqual([0, 0, 0]);
		expect(createSelector(':where(div, span)').match(el)).toStrictEqual([0, 0, 0]);
		expect(createSelector(':where(div, #foo)').match(el)).toStrictEqual([0, 0, 0]);
		expect(createSelector(':where(div, #foo, .bar)').match(el)).toStrictEqual([0, 0, 0]);
		expect(createSelector(':where(div, #foo.bar)').match(el)).toStrictEqual([0, 0, 0]);
	});
});
