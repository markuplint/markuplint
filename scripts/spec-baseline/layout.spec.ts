import { describe, expect, test } from 'vitest';

import { FLAG_NAMES, askBits, askObject, assertQuestions, buildLayout, questionsOf } from './layout.ts';

const spec = {
	def: {
		'#contentModels': {
			'#flow': ['a', 'div', 'a[href]', 'svg:rect'],
			'#phrasing': ['a', 'span'],
			'#empty': [],
		},
	},
	specs: [
		{ name: 'a' },
		{ name: 'div' },
		{ name: 'span', deprecated: true },
		{ name: 'font', obsolete: true, nonStandard: true },
		{ name: 'svg:rect', experimental: true },
	],
};

describe('buildLayout', () => {
	const layout = buildLayout(spec);

	test('keeps the elements in the order of the data and the categories sorted by name', () => {
		expect(layout.elements).toStrictEqual(['a', 'div', 'span', 'font', 'svg:rect']);
		expect(layout.categories).toStrictEqual(['#empty', '#flow', '#phrasing']);
	});

	test('sets one flag bit for each flag an element has, in the order of FLAG_NAMES', () => {
		expect(FLAG_NAMES).toStrictEqual(['obsolete', 'deprecated', 'nonStandard', 'experimental']);
		expect([...layout.flags]).toStrictEqual([0, 0, 0b0010, 0b0101, 0b1000]);
	});

	test('sets one bit for each unconditional member of a category, in the row of that category', () => {
		expect(layout.wordsPerRow).toBe(1);
		// #empty, #flow (a, div, svg:rect), #phrasing (a, span)
		expect([...layout.categoryBits]).toStrictEqual([0, 0b1_0011, 0b0_0101]);
	});

	test('does not put a selector in the bits and counts it as conditional instead', () => {
		expect(layout.conditional).toStrictEqual({ '#empty': 0, '#flow': 1, '#phrasing': 0 });
	});

	test('uses more than one word per row when there are more than 32 elements', () => {
		const many = {
			def: { '#contentModels': { '#flow': ['e40'] } },
			specs: Array.from({ length: 41 }, (_, index) => ({ name: `e${index}` })),
		};
		const wide = buildLayout(many);
		expect(wide.wordsPerRow).toBe(2);
		// element 40 is bit 8 of the second word
		expect([...wide.categoryBits]).toStrictEqual([0, 256]);
	});
});

describe('questionsOf', () => {
	const layout = buildLayout(spec);

	test('asks every element about every flag and every category, in a fixed order', () => {
		const questions = questionsOf(layout);
		expect(questions).toHaveLength(5 * 4 + 5 * 3);
		expect(questions[0]).toStrictEqual({ kind: 'flag', element: 0, flag: 0 });
		expect(questions.at(-1)).toStrictEqual({ kind: 'category', element: 4, category: 2 });
	});
});

describe('a question that points outside the layout', () => {
	const layout = buildLayout(spec);

	test.each([
		{ kind: 'flag', element: 99, flag: 0 },
		{ kind: 'flag', element: 0, flag: 9 },
		{ kind: 'category', element: 0, category: 9 },
		{ kind: 'category', element: -1, category: 0 },
	] as const)('is refused by assertQuestions: %j', question => {
		expect(() => assertQuestions(layout, [question])).toThrow(/outside the layout/);
	});

	test.each([
		{ kind: 'flag', element: 99, flag: 0 },
		{ kind: 'flag', element: 0, flag: 9 },
		{ kind: 'category', element: 0, category: 9 },
	] as const)('is not answered as no by askObject: %j', question => {
		expect(() => askObject(spec, layout, [question])).toThrow();
	});

	test('is accepted by assertQuestions when it is one that questionsOf makes', () => {
		expect(() => assertQuestions(layout, questionsOf(layout))).not.toThrow();
	});
});

describe('the two ways of answering', () => {
	const layout = buildLayout(spec);
	const questions = questionsOf(layout);

	test('give the same answer to every question', () => {
		const objects = askObject(spec, layout, questions);
		const bits = askBits(layout, questions);
		expect([...bits]).toStrictEqual([...objects]);
	});

	test('answer true for an element that is in a category and false for one that is not', () => {
		const answers = askBits(layout, [
			{ kind: 'category', element: 0, category: 1 },
			{ kind: 'category', element: 2, category: 1 },
			{ kind: 'flag', element: 3, flag: 0 },
			{ kind: 'flag', element: 3, flag: 1 },
		]);
		expect([...answers]).toStrictEqual([1, 0, 1, 0]);
	});
});
