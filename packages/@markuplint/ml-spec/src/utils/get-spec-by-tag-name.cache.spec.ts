import { describe, expect, test, vi } from 'vitest';

import { getSpecByTagName } from './get-spec-by-tag-name.js';

// The result of a lookup is kept for the list of specs it was made in: a list that has an entry
// the other has not (the specs of the document plus a rule's own, as `permitted-contents` does for
// the `tag` rules of its option) is not told it has none by a lookup made in the other first.
describe('getSpecByTagName keeps its results for each list of specs', () => {
	test('a name that one list lacks is found in another that has it, whichever is searched first', () => {
		const base = [{ name: 'a' }];
		const extended = [{ name: 'a' }, { name: 'Foo' }];

		expect(getSpecByTagName(base, 'Foo', null)).toBeNull();
		expect(getSpecByTagName(extended, 'Foo', null)).toStrictEqual({ name: 'Foo' });
		expect(getSpecByTagName(base, 'Foo', null)).toBeNull();
	});

	test('a name that two lists describe differently is the one of the list searched', () => {
		const first = [{ name: 'Foo', note: 'first' }];
		const second = [{ name: 'Foo', note: 'second' }];

		expect(getSpecByTagName(first, 'Foo', null)).toStrictEqual({ name: 'Foo', note: 'first' });
		expect(getSpecByTagName(second, 'Foo', null)).toStrictEqual({ name: 'Foo', note: 'second' });
	});

	test('a stable list is searched once for a name, whether it is found or not', () => {
		const list = [{ name: 'Foo' }];
		const find = vi.spyOn(list, 'find');

		getSpecByTagName(list, 'Foo', null);
		getSpecByTagName(list, 'Foo', null);
		getSpecByTagName(list, 'Bar', null);
		getSpecByTagName(list, 'Bar', null);

		expect(find).toHaveBeenCalledTimes(2);
	});

	test('a list made anew for each lookup is searched for each, and gives the right entry', () => {
		const searched: number[] = [];
		for (let i = 0; i < 3; i++) {
			const list = [{ name: 'Foo' }];
			const find = vi.spyOn(list, 'find');
			expect(getSpecByTagName(list, 'Foo', null)).toStrictEqual({ name: 'Foo' });
			searched.push(find.mock.calls.length);
		}

		expect(searched).toStrictEqual([1, 1, 1]);
	});

	test('the same list gives the same entry again', () => {
		const list = [{ name: 'Foo' }];

		expect(getSpecByTagName(list, 'Foo', null)).toBe(getSpecByTagName(list, 'Foo', null));
	});
});
