import { test, expect } from 'vitest';

import { check } from '@markuplint/types';

import { intersectEnums } from './attr-eligibility.js';

function asEnum(type: ReturnType<typeof intersectEnums>) {
	if (typeof type === 'string' || Array.isArray(type) || !('enum' in type)) {
		throw new Error(`expected an enum, got ${JSON.stringify(type)}`);
	}
	return type;
}

test('enum intersection keeps the first entry order and drops tokens the other forbids', () => {
	expect(
		intersectEnums([
			{ enum: ['fetch', 'font', 'image', 'script', 'style', 'track'] },
			{ enum: ['audioworklet', 'json', 'script', 'style', 'text', 'worker'] },
		]),
	).toStrictEqual({ enum: ['script', 'style'] });
});

test('a case-sensitive spelling is kept when an earlier entry only has another case', () => {
	const type = asEnum(
		intersectEnums([{ enum: ['script', 'style', 'fetch'] }, { enum: ['Script', 'Style'], caseInsensitive: false }]),
	);
	expect(type).toStrictEqual({ enum: ['Script', 'Style'], caseInsensitive: false });
	expect(check('Script', type).matched).toBe(true);
	expect(check('script', type).matched).toBe(false);
});

test('three entries keep only the tokens every entry accepts, in encounter order', () => {
	expect(
		intersectEnums([{ enum: ['a', 'b', 'c'] }, { enum: ['b', 'c', 'd'] }, { enum: ['c', 'b', 'e'] }]),
	).toStrictEqual({ enum: ['b', 'c'] });
});

test('invalidValueDefault is not copied onto the intersection', () => {
	expect(
		intersectEnums([{ enum: ['script', 'style'], invalidValueDefault: 'script' }, { enum: ['script', 'text'] }]),
	).toStrictEqual({ enum: ['script'] });
});

test('surrounding spaces are allowed only when every entry allows them', () => {
	expect(
		intersectEnums([
			{ enum: ['a'], disallowToSurroundBySpaces: false },
			{ enum: ['a'], disallowToSurroundBySpaces: false },
		]),
	).toStrictEqual({ enum: ['a'], disallowToSurroundBySpaces: false });
	expect(intersectEnums([{ enum: ['a'], disallowToSurroundBySpaces: false }, { enum: ['a'] }])).toStrictEqual({
		enum: ['a'],
	});
});

test('an empty intersection matches nothing', () => {
	const type = intersectEnums([{ enum: ['fetch'] }, { enum: ['text'], caseInsensitive: false }]);
	expect(type).toStrictEqual({ pattern: '/(?!)/' });
	if (typeof type === 'string' || Array.isArray(type) || !('pattern' in type)) {
		throw new Error(`expected a pattern, got ${JSON.stringify(type)}`);
	}
	expect(check('fetch', type).matched).toBe(false);
	expect(check('text', type).matched).toBe(false);
});
