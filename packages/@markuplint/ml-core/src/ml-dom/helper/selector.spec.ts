import { createSelector } from './selector';

describe('selector matching', () => {
	it('type / id / class', async () => {
		const el = {
			nodeName: 'div',
			id: 'hoge',
			classList: ['foo', 'bar'],
			childNodes: [],
			parentNode: null,
		};
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
		const el = {
			nodeName: 'div',
			parentNode: null,
			childNodes: [],
			getAttribute(attr: string): string | null {
				const attrs = {
					a: 'ABC',
					b: '123',
					c: 'あいうえお',
				} as { [name: string]: string };
				return attrs[attr] || null;
			},
		};
		expect(createSelector('[a]').match(el)).toBe(true);
		expect(createSelector('[a][b][c]').match(el)).toBe(true);
		expect(createSelector('[d]').match(el)).toBe(false);
		expect(createSelector('[a=ABC]').match(el)).toBe(true);
		expect(createSelector('[a="ABC"]').match(el)).toBe(true);
		expect(createSelector('[a^=A]').match(el)).toBe(true);
		expect(createSelector('[a$=C]').match(el)).toBe(true);
		expect(createSelector('[a*=B]').match(el)).toBe(true);
	});

	it(':not', async () => {
		const el = {
			nodeName: 'div',
			id: 'hoge',
			classList: ['foo', 'bar'],
			parentNode: null,
			childNodes: [],
		};
		expect(createSelector('*:not(a)').match(el)).toBe(true);
		expect(createSelector('*:not(div)').match(el)).toBe(false);
		expect(createSelector('div:not(.any)').match(el)).toBe(true);
		expect(createSelector('div:not(#fuga)').match(el)).toBe(true);
		expect(createSelector(':not(#hoge)').match(el)).toBe(false);
	});

	it(':root', async () => {
		const el = {
			nodeName: 'div',
			parentNode: {
				nodeName: 'html',
				parentNode: null,
				childNodes: [],
			},
			childNodes: [],
		};
		expect(createSelector(':root').match(el)).toBe(false);
		expect(createSelector(':root').match(el.parentNode)).toBe(true);
	});

	it(':has', async () => {
		const el = {
			nodeName: 'div',
			parentNode: null,
			childNodes: [
				{
					nodeName: 'span',
					parentNode: null,
					childNodes: [],
				},
			],
		};
		expect(createSelector(':has(> span)').match(el)).toBe(true);

		const el2 = {
			nodeName: 'div',
			parentNode: null,
			childNodes: [
				{
					nodeName: 'a',
					parentNode: null,
					childNodes: [],
				},
			],
		};
		expect(createSelector(':has(> span)').match(el2)).toBe(false);
	});

	it('Multiple selector', async () => {
		const el = {
			nodeName: 'div',
			parentNode: null,
			childNodes: [],
		};
		expect(createSelector('div, span').match(el)).toBe(true);
	});
});
