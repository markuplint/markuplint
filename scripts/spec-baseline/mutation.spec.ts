import { describe, expect, test } from 'vitest';

import { applyMutation, enumerateMutations, runMutations, sample, summarize } from './mutation.ts';

const spec = () => ({
	def: { '#contentModels': { '#flow': ['div', 'a[href]'], '#phrasing': ['span'] } },
	specs: [
		{
			name: 'div',
			obsolete: true,
			contentModel: { contents: [{ require: 'p' }, { zeroOrMore: ':model(flow)' }] },
			attributes: { align: { type: 'Any', deprecated: true }, id: { type: 'DOMID' } },
			aria: { implicitRole: 'generic', permittedRoles: ['group', 'region'] },
		},
		{ name: 'span' },
	],
});

describe('enumerateMutations', () => {
	const mutations = enumerateMutations(spec());
	const operators = new Set(mutations.map(mutation => mutation.operator));

	test('has each kind of change that a reader of the data could get wrong', () => {
		expect([...operators].toSorted()).toStrictEqual([
			'aria-implicit-role',
			'aria-permitted-role',
			'attribute-delete',
			'attribute-flag',
			'category-member-delete',
			'content-model-pattern',
			'element-flag',
		]);
	});

	test('names the place that each one changes', () => {
		expect(mutations.every(mutation => mutation.target.length > 0)).toBe(true);
		expect(new Set(mutations.map(mutation => `${mutation.operator} ${mutation.target}`)).size).toBe(
			mutations.length,
		);
	});

	test('is the same list each time', () => {
		expect(enumerateMutations(spec()).map(mutation => mutation.target)).toStrictEqual(
			mutations.map(mutation => mutation.target),
		);
	});
});

describe('a role that the data writes as an object', () => {
	const original = {
		def: { '#contentModels': {} },
		specs: [{ name: 'menu', aria: { permittedRoles: ['menu', { name: 'directory', deprecated: true }] } }],
	};

	test('is a mutation of its own, named by the role', () => {
		const targets = enumerateMutations(original)
			.filter(mutation => mutation.operator === 'aria-permitted-role')
			.map(mutation => mutation.target);
		expect(targets).toStrictEqual(['menu.permittedRoles:menu', 'menu.permittedRoles:directory']);
	});

	test('is taken out of the roles by that name', () => {
		const mutation = enumerateMutations(original).find(item => item.target === 'menu.permittedRoles:directory')!;
		expect(applyMutation(original, mutation).specs[0]?.aria?.permittedRoles).toStrictEqual(['menu']);
	});
});

describe('applyMutation', () => {
	test('changes a copy of the data and leaves the original as it was', () => {
		const original = spec();
		const before = JSON.stringify(original);
		for (const mutation of enumerateMutations(original)) {
			const changed = applyMutation(original, mutation);
			expect(JSON.stringify(original)).toBe(before);
			expect(JSON.stringify(changed), `${mutation.operator} ${mutation.target}`).not.toBe(before);
		}
	});

	test('removes a flag that an element has and sets one that it lacks', () => {
		const original = spec();
		const mutations = enumerateMutations(original).filter(mutation => mutation.operator === 'element-flag');
		const obsolete = mutations.find(mutation => mutation.target === 'div.obsolete');
		const deprecated = mutations.find(mutation => mutation.target === 'div.deprecated');
		expect(applyMutation(original, obsolete!).specs[0]).not.toHaveProperty('obsolete');
		expect(applyMutation(original, deprecated!).specs[0]).toHaveProperty('deprecated', true);
	});

	test('loosens a pattern of a content model and drops another', () => {
		const original = spec();
		const patterns = enumerateMutations(original).filter(mutation => mutation.operator === 'content-model-pattern');
		const changed = patterns.map(mutation => applyMutation(original, mutation).specs[0]?.contentModel?.contents);
		expect(changed).toContainEqual([{ optional: 'p' }, { zeroOrMore: ':model(flow)' }]);
		expect(changed).toContainEqual([{ zeroOrMore: ':model(flow)' }]);
	});
});

describe('sample', () => {
	const mutations = enumerateMutations(spec());

	test('takes the number asked for, and the same ones for the same seed', () => {
		const picked = sample(mutations, 5, 1);
		expect(picked).toHaveLength(5);
		expect(sample(mutations, 5, 1).map(mutation => mutation.target)).toStrictEqual(
			picked.map(mutation => mutation.target),
		);
	});

	test('takes all of them when there are no more than asked for', () => {
		expect(sample(mutations, 1000, 1)).toHaveLength(mutations.length);
	});

	test('does not take one twice', () => {
		const picked = sample(mutations, mutations.length - 1, 3);
		expect(new Set(picked).size).toBe(picked.length);
	});
});

describe('runMutations', () => {
	const inputs = [
		{ name: 'one', html: '1' },
		{ name: 'two', html: '2' },
	];

	test('kills a mutation that changes what an input reports and names the inputs', async () => {
		const original = spec();
		const mutation = enumerateMutations(original).find(item => item.target === 'div.obsolete')!;
		const outcomes = await runMutations(original, [mutation], inputs, (html, options) => {
			const current = (
				options.transformSpec ? options.transformSpec(original as never) : original
			) as typeof original;
			return Promise.resolve(JSON.stringify({ html, obsolete: current.specs[0]?.obsolete === true }));
		});
		expect(outcomes).toStrictEqual([{ mutation, killedBy: ['one', 'two'] }]);
	});

	test('stops when a run with no change at all is told apart from the data as it is, because nothing it says is then worth anything', async () => {
		const original = spec();
		const mutation = enumerateMutations(original)[0]!;
		await expect(
			runMutations(original, [mutation], inputs, (html, options) =>
				Promise.resolve(`${html}${options.transformSpec ? ' with a transform' : ''}`),
			),
		).rejects.toThrow(/control/);
	});

	test('lets a mutation survive when no input reports anything different', async () => {
		const original = spec();
		const mutation = enumerateMutations(original)[0]!;
		const outcomes = await runMutations(original, [mutation], inputs, html => Promise.resolve(html));
		expect(outcomes[0]?.killedBy).toStrictEqual([]);
	});
});

describe('runMutations: progress', () => {
	test('is reported after each mutation, and not for the control runs', async () => {
		const original = spec();
		const mutations = enumerateMutations(original).slice(0, 3);
		const seen: [number, number][] = [];
		await runMutations(
			original,
			mutations,
			[{ name: 'one', html: '1' }],
			html => Promise.resolve(html),
			(done, total) => seen.push([done, total]),
		);
		expect(seen).toStrictEqual([
			[1, 3],
			[2, 3],
			[3, 3],
		]);
	});
});

describe('summarize', () => {
	test('gives the share killed for each kind and lists the ones that survived', () => {
		const original = spec();
		const [first, second, third] = enumerateMutations(original);
		const text = summarize([
			{ mutation: first!, killedBy: ['a'] },
			{ mutation: second!, killedBy: [] },
			{ mutation: third!, killedBy: ['a', 'b'] },
		]);
		expect(text).toContain('killed 2 of 3');
		expect(text).toContain(`${second!.operator} ${second!.target}`);
		expect(text).not.toContain(`survived: ${first!.operator} ${first!.target}`);
	});
});
