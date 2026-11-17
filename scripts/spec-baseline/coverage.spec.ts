import { parser } from '@markuplint/html-parser';
import htmlSpec from '@markuplint/html-spec';
import { describe, expect, test } from 'vitest';

import { generateCoverageInputs, placementOf } from './coverage.ts';
import { roleName } from './layout.ts';

const spec = htmlSpec as unknown as Parameters<typeof generateCoverageInputs>[0];
const inputs = generateCoverageInputs(spec);

const PREFIX: Readonly<Record<string, string>> = {
	'http://www.w3.org/2000/svg': 'svg:',
	'http://www.w3.org/1998/Math/MathML': 'mml:',
};

/** An element of a generated document as the parser has it, named as the data names it. */
interface Instance {
	readonly name: string;
	/** Attribute names (lower case) with their values. */
	readonly attributes: ReadonlyMap<string, string>;
}

function instancesOf(html: string): Instance[] {
	const found: Instance[] = [];
	for (const node of parser.parse(html).nodeList) {
		if (node.type === 'starttag') {
			found.push({
				name: `${PREFIX[node.namespace] ?? ''}${node.nodeName}`.toLowerCase(),
				attributes: new Map(
					node.attributes.flatMap(attribute =>
						// a spread attribute of a framework has no name; the parser of HTML makes none
						'name' in attribute ? [[attribute.name.raw.toLowerCase(), attribute.value.raw] as const] : [],
					),
				),
			});
		}
	}
	return found;
}

const instances = Object.values(inputs).flatMap(html => instancesOf(html));

describe('generateCoverageInputs', () => {
	test('gives the same documents each time', () => {
		expect(generateCoverageInputs(spec)).toStrictEqual(inputs);
	});

	test('makes a document for each part of the data, with names that mark them as generated', () => {
		expect(Object.keys(inputs).toSorted()).toStrictEqual([
			'generated-frameset.html',
			'generated-html.html',
			'generated-mathml.html',
			'generated-plaintext.html',
			'generated-roles.html',
			'generated-root.html',
			'generated-svg.html',
		]);
	});

	test('has each element of the data, by its namespace, as the parser keeps it where it is put', () => {
		const found = new Set(instances.map(instance => instance.name));
		const missing = spec.specs.map(element => element.name).filter(name => !found.has(name.toLowerCase()));
		expect(missing).toStrictEqual([]);
	});

	test('gives an element every attribute that the data lists for it, on that element', () => {
		const missing: string[] = [];
		for (const element of spec.specs) {
			const own = instances.filter(instance => instance.name === element.name.toLowerCase());
			for (const attribute of Object.keys(element.attributes ?? {})) {
				if (!own.some(instance => instance.attributes.has(attribute.toLowerCase()))) {
					missing.push(`${element.name}[${attribute}]`);
				}
			}
		}
		expect(missing).toStrictEqual([]);
	});

	test('gives an element each role that the data permits for it, and its implicit role, on that element', () => {
		const missing: string[] = [];
		// a document has one `html`, one `head` and one `body`, so their roles are not written
		for (const element of spec.specs.filter(item => !['html', 'head', 'body'].includes(item.name))) {
			const aria = element.aria;
			const wanted = [
				...(Array.isArray(aria?.permittedRoles) ? aria.permittedRoles.map(role => roleName(role)) : []),
				...(typeof aria?.implicitRole === 'string' ? [aria.implicitRole] : []),
			];
			const own = instances.filter(instance => instance.name === element.name.toLowerCase());
			for (const role of wanted) {
				if (!own.some(instance => instance.attributes.get('role') === role)) {
					missing.push(`${element.name} role=${role}`);
				}
			}
		}
		expect(missing).toStrictEqual([]);
	});

	test('does not write an element into a document where the parser would take it apart', () => {
		for (const [name, html] of Object.entries(inputs)) {
			const { nodeList } = parser.parse(html);
			expect(
				nodeList.filter(node => node.type === 'invalid'),
				name,
			).toStrictEqual([]);
		}
	});
});

describe('placementOf', () => {
	test('puts a flow element directly in the body, and a list item in a list', () => {
		expect(placementOf(spec, 'div')).toStrictEqual({ root: 'body', ancestors: [] });
		expect(placementOf(spec, 'li')?.root).toBe('body');
		expect(placementOf(spec, 'li')?.ancestors).toHaveLength(1);
	});

	test('puts the parts of a table in a table', () => {
		const td = placementOf(spec, 'td');
		expect(td?.ancestors[0]).toBe('table');
		expect(td?.ancestors.at(-1)).toBe('tr');
	});

	test('puts a metadata element in the head', () => {
		expect(placementOf(spec, 'title')).toStrictEqual({ root: 'head', ancestors: [] });
	});

	test('puts a graphics element in an svg element', () => {
		const rect = placementOf(spec, 'svg:rect');
		expect(rect?.root).toBe('body');
		expect(rect?.ancestors[0]).toBe('svg:svg');
	});
});
