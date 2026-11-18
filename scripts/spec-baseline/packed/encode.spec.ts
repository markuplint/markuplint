import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { FLAG_NAMES, askObject, buildLayout, questionsOf } from '../layout.ts';
import { encodeSpec, type SpecLike } from './encode.ts';
import { FLAGS, NONE, REGIONS, Section, VARIANTS, variantName, type Variant } from './format.ts';
import { PackedSpec, digestJson, wordsOf } from './read.ts';

const SPEC = JSON.parse(
	readFileSync(new URL('../../../packages/@markuplint/html-spec/index.json', import.meta.url), 'utf8'),
) as SpecLike & { specs: { name: string }[]; def: Record<string, Record<string, unknown>> };

const SORTED_ROWS: Variant = { columns: false, index: 'sorted', hash: 'murmur3' };

/** A spec of a few elements, with the names of an index (eight or more) and one that is not ASCII. */
function small(): SpecLike {
	const specs = Array.from({ length: 12 }, (_, index) => ({
		name: index === 11 ? 'x-日本' : `el${index}`,
		cite: `https://example.test/#el${index}`,
		...(index % 4 === 0 ? { obsolete: true } : {}),
		...(index === 3 ? { deprecated: true, experimental: true } : {}),
		attributes: Object.fromEntries(
			Array.from({ length: index % 3 === 0 ? 9 : 2 }, (_, a) => [
				`attr${a}`,
				{ type: a % 2 === 0 ? 'Any' : { enum: ['a', 'b'] } },
			]),
		),
	}));
	return {
		def: {
			'#globalAttrs': { '#HTMLGlobalAttrs': { id: { type: 'DOMID' } } },
			'#aria': { '1.2': { roles: [{ name: 'button', deprecated: false, n: 3 }], props: [] } },
			'#contentModels': { '#flow': ['el0', 'el3', 'x-日本', 'el3[href]', '#text'], '#empty': [] },
		},
		specs,
		acceptedAttrNames: ['a', 'b'],
	};
}

describe.each(VARIANTS)('the candidate %o', variant => {
	const name = variantName(variant);

	test(`${name}: gives back the JSON of html-spec from its words`, () => {
		const packed = encodeSpec(SPEC, variant);
		expect(packed.toJson()).toStrictEqual(SPEC);
	});

	test(`${name}: gives back the JSON from the words of a file that is opened`, () => {
		const words = encodeSpec(SPEC, variant).serialize();
		const opened = PackedSpec.open(wordsOf(new Uint8Array(words.buffer)));
		expect(opened.toJson()).toStrictEqual(SPEC);
		expect(opened.variant).toStrictEqual(variant);
	});

	test(`${name}: makes the same words from the same spec`, () => {
		const a = encodeSpec(SPEC, variant).serialize();
		const b = encodeSpec(SPEC, variant).serialize();
		expect(a.length).toBe(b.length);
		expect(a.every((word, index) => word === b[index])).toBe(true);
	});

	test(`${name}: holds a name that is not ASCII, and indexes it`, () => {
		const packed = encodeSpec(small(), variant);
		expect(packed.toJson()).toStrictEqual(small());
		const specs = packed.regions[0];
		if (!specs) {
			throw new Error('no region');
		}
		const found = packed.find(specs, specs.root, 'x-日本');
		expect(found).not.toBe(NONE);
		expect(packed.toValue(specs, found)).toMatchObject({ name: 'x-日本' });
		expect(packed.find(specs, specs.root, 'x-旦本')).toBe(NONE);
	});
});

describe('the bits', () => {
	const layout = buildLayout(SPEC as never);
	const questions = questionsOf(layout);
	const expected = askObject(SPEC as never, layout, questions);
	const categories = Object.keys(SPEC.def['#contentModels'] ?? {});

	test.each(VARIANTS)('answer the questions of layout.ts as the data does (%o)', variant => {
		const packed = encodeSpec(SPEC, variant);
		expect(packed.elementCount).toBe(layout.elements.length);
		const differences = questions.flatMap((question, position) => {
			const answer =
				question.kind === 'flag'
					? packed.flag(question.element, question.flag)
					: packed.member(question.element, categories.indexOf(layout.categories[question.category] ?? ''));
			return answer === expected[position] ? [] : [{ position, question, answer, data: expected[position] }];
		});
		expect(differences).toStrictEqual([]);
		expect(FLAGS).toStrictEqual(FLAG_NAMES);
	});
});

describe('a lookup', () => {
	test.each(VARIANTS)('finds every element by its name and no name that is not one (%o)', variant => {
		const packed = encodeSpec(SPEC, variant);
		const specs = packed.regions[0];
		if (!specs) {
			throw new Error('no region');
		}
		for (const [position, element] of SPEC.specs.entries()) {
			const node = packed.find(specs, specs.root, element.name);
			expect(node).toBe(packed.at(specs, specs.root, position));
		}
		for (const name of ['', 'nope', 'svg:', 'DIV', 'div ', 'svg:rec', 'mml:mié']) {
			expect(packed.find(specs, specs.root, name)).toBe(NONE);
		}
	});

	test.each(VARIANTS)('finds a name among fewer than eight, which no index covers, as among more (%o)', variant => {
		const packed = encodeSpec(
			{ specs: ['a', 'b', 'c', 'd', 'e'].map(name => ({ name, attributes: { name: { type: 'Any' } } })) },
			variant,
		);
		const specs = packed.regions[0];
		if (!specs) {
			throw new Error('no region');
		}
		expect(specs.c(specs.root)).toBe(0);
		for (const [position, name] of ['a', 'b', 'c', 'd', 'e'].entries()) {
			expect(packed.position(specs, specs.root, name)).toBe(position);
			expect(packed.toValue(specs, packed.find(specs, specs.root, name))).toMatchObject({ name });
		}
		expect(packed.find(specs, specs.root, 'f')).toBe(NONE);
	});

	test.each(VARIANTS)('finds every key of every object of #globalAttrs and #aria (%o)', variant => {
		const packed = encodeSpec(SPEC, variant);
		const global = packed.regions[1];
		if (!global) {
			throw new Error('no region');
		}
		const groups = SPEC.def['#globalAttrs'] as Record<string, Record<string, unknown>>;
		for (const [group, attributes] of Object.entries(groups)) {
			const groupNode = packed.get(global, global.root, group);
			expect(groupNode).not.toBe(NONE);
			for (const [attribute, value] of Object.entries(attributes)) {
				const node = packed.get(global, groupNode, attribute);
				expect(node).not.toBe(NONE);
				expect(packed.digest(global, node)).toBe(digestJson(value));
			}
			expect(packed.get(global, groupNode, 'no-such-attribute')).toBe(NONE);
		}
	});

	test.each(VARIANTS)('finds a role of every version by its name (%o)', variant => {
		const packed = encodeSpec(SPEC, variant);
		const aria = packed.regions[2];
		if (!aria) {
			throw new Error('no region');
		}
		for (const [version, lists] of Object.entries(
			SPEC.def['#aria'] as Record<string, Record<string, { name: string }[]>>,
		)) {
			const versionNode = packed.get(aria, aria.root, version);
			for (const [list, roles] of Object.entries(lists)) {
				if (list === 'props') {
					continue;
				}
				const listNode = packed.get(aria, versionNode, list);
				for (const role of roles) {
					const node = packed.find(aria, listNode, role.name);
					expect(packed.toValue(aria, node)).toStrictEqual(role);
				}
				expect(packed.find(aria, listNode, 'no-such-role')).toBe(NONE);
			}
		}
	});

	test('does not give a position for what is not an object or an array', () => {
		const packed = encodeSpec(small(), SORTED_ROWS);
		const specs = packed.regions[0];
		if (!specs) {
			throw new Error('no region');
		}
		expect(packed.get(specs, specs.root, 'name')).toBe(NONE);
		expect(packed.find(specs, NONE, 'el0')).toBe(NONE);
		expect(packed.at(specs, specs.root, 99)).toBe(NONE);
		expect(packed.at(specs, specs.root, -1)).toBe(NONE);
	});
});

describe('the sharing of what is the same', () => {
	test.each(VARIANTS)(
		'stores a subtree that is the same as another once: no two nodes of a region are alike (%o)',
		variant => {
			for (const region of encodeSpec(SPEC, variant).regions) {
				const alike = new Set<string>();
				for (let node = 0; node < region.count; node++) {
					alike.add(`${region.tag(node)} ${region.a(node)} ${region.b(node)} ${region.c(node)}`);
				}
				expect(alike.size).toBe(region.count);
			}
		},
	);

	test('has fewer nodes than the tree of the data', () => {
		const tree = (value: unknown): number =>
			1 +
			(typeof value === 'object' && value !== null
				? Object.values(value).reduce((sum: number, item) => sum + tree(item), 0)
				: 0);
		const nodes = REGIONS.reduce(
			(sum, id) => sum + (encodeSpec(SPEC, SORTED_ROWS).regions[REGIONS.indexOf(id)]?.count ?? 0),
			0,
		);
		expect(nodes).toBeLessThan(tree(SPEC) / 5);
	});
});

describe('open', () => {
	const words = encodeSpec(small(), SORTED_ROWS).serialize();
	const copy = () => Uint32Array.from(words);

	/** What `open` says for a word that was changed: the part of the file that the word is in, or the checksum. */
	const REFUSED = /magic|version|variant|sections|section \d|between the last section|checksum|region|string/u;

	test('refuses a file in which any word was changed, by the part of it that the word is in', () => {
		const accepted: number[] = [];
		for (let at = 0; at < words.length; at++) {
			const changed = copy();
			changed[at] = ((changed[at] ?? 0) ^ 0x00_01_00_00) >>> 0;
			try {
				PackedSpec.open(changed);
				accepted.push(at);
			} catch (error) {
				expect((error as Error).message, `word ${at}`).toMatch(REFUSED);
			}
		}
		expect(accepted).toStrictEqual([]);
	});

	test('refuses a file that is cut short', () => {
		expect(() => PackedSpec.open(copy().subarray(0, words.length - 1))).toThrow(
			/not inside the file|between the last section/u,
		);
		expect(() => PackedSpec.open(copy().subarray(0, 10))).toThrow('shorter than the header');
	});

	test('refuses a file that has another magic or another version', () => {
		const magic = copy();
		magic[0] = 1;
		expect(() => PackedSpec.open(magic)).toThrow('magic');
		const version = copy();
		version[1] = 2;
		expect(() => PackedSpec.open(version)).toThrow('version 2');
	});

	test('names the section that is not inside the file', () => {
		const changed = copy();
		changed[5 + 2 * Section.Aria] = 0x7F_FF_FF_FF;
		expect(() => PackedSpec.open(changed)).toThrow(`section ${Section.Aria}`);
	});
});

describe('encodeSpec', () => {
	test.each([
		['a negative number', { specs: [-1] }, 'non-negative integer below 2^32, not -1'],
		['a number that is not an integer', { specs: [1.5] }, 'non-negative integer below 2^32, not 1.5'],
		['a number of 2^32 or more', { specs: [2 ** 32] }, 'non-negative integer below 2^32, not 4294967296'],
		['an undefined in an array', { specs: [undefined] }, 'no undefined in an array'],
		['a key of def that it does not hold', { def: { '#other': {} } }, 'holds no "#other" in def'],
	] as const)('stops for %s', (_name, spec, message) => {
		expect(() => encodeSpec(spec as SpecLike, SORTED_ROWS)).toThrow(message);
	});

	test('leaves out a key whose value is undefined, as JSON does', () => {
		const packed = encodeSpec({ specs: [], extra: undefined, kept: 1 }, SORTED_ROWS);
		expect(packed.toJson()).toStrictEqual({
			def: { '#globalAttrs': {}, '#aria': {}, '#contentModels': {} },
			specs: [],
			kept: 1,
		});
	});

	test('reads a region that the spec lacks as the empty value of its kind', () => {
		expect(encodeSpec({}, SORTED_ROWS).toJson()).toStrictEqual({
			def: { '#globalAttrs': {}, '#aria': {}, '#contentModels': {} },
			specs: [],
		});
	});
});

describe('wordsOf', () => {
	test('views bytes that are aligned and copies bytes that are not, to the same words', () => {
		const words = Uint32Array.from([1, 0x01_02_03_04, 0xFF_FF_FF_FF]);
		const aligned = new Uint8Array(words.buffer);
		expect([...wordsOf(aligned)]).toStrictEqual([...words]);
		const shifted = new Uint8Array(aligned.length + 1);
		shifted.set(aligned, 1);
		expect([...wordsOf(shifted.subarray(1))]).toStrictEqual([...words]);
		expect(() => wordsOf(new Uint8Array(5))).toThrow('whole words');
	});
});

describe('the comparison of strings', () => {
	test('is the same for decoded strings and for bytes', () => {
		for (const variant of VARIANTS) {
			const words = encodeSpec(small(), variant).serialize();
			for (const compare of ['decoded', 'bytes'] as const) {
				const packed = PackedSpec.open(words, { compare });
				const specs = packed.regions[0];
				if (!specs) {
					throw new Error('no region');
				}
				expect(packed.find(specs, specs.root, 'el5')).not.toBe(NONE);
				expect(packed.find(specs, specs.root, 'x-日本')).not.toBe(NONE);
				expect(packed.find(specs, specs.root, 'el55')).toBe(NONE);
			}
		}
	});
});
