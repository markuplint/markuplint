import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveNamespace, getAttrSpecsByNames } from '@markuplint/ml-spec';
import { glob } from '@markuplint/test-tools';
import Ajv from 'ajv';
import { parse } from 'jsonc-parser';
import { describe, test, expect } from 'vitest';

import htmlSpec from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);

const schemas = {
	element: {
		$id: '@markuplint/ml-spec/schemas/element.schema.json',
		...require('../../ml-spec/schemas/element.schema.json'),
	},
	aria: {
		$id: '@markuplint/ml-spec/schemas/aria.schema.json',
		...require('../../ml-spec/schemas/aria.schema.json'),
	},
	contentModels: {
		$id: '@markuplint/ml-spec/schemas/content-models.schema.json',
		...require('../../ml-spec/schemas/content-models.schema.json'),
	},
	globalAttributes: {
		$id: '@markuplint/ml-spec/schemas/global-attributes.schema.json',
		...require('../../ml-spec/schemas/global-attributes.schema.json'),
	},
	attributes: {
		$id: '@markuplint/ml-spec/schemas/attributes.schema.json',
		...require('../../ml-spec/schemas/attributes.schema.json'),
	},
	types: {
		$id: '@markuplint/types/types.schema.json',
		...require('../../types/types.schema.json'),
	},
};

test('structure', () => {
	for (const el of htmlSpec.specs) {
		const { localName, namespaceURI } = resolveNamespace(el.name);
		try {
			getAttrSpecsByNames(localName, namespaceURI, htmlSpec);
		} catch {
			throw el;
		}
	}
});

/**
 * The data carries no prose: the weekly spec citation watch reads the specifications themselves, and what MDN and
 * the W3C documents say in their own words is not copied into the package (`generator/strip-prose.ts`).
 */
describe('index.json carries no prose', () => {
	const aria = htmlSpec.def['#aria'];

	test('no element has a description', () => {
		expect(htmlSpec.specs.filter(el => 'description' in el).map(el => el.name)).toStrictEqual([]);
	});

	test('no attribute of an element has a description', () => {
		const withDescription = htmlSpec.specs.flatMap(el =>
			Object.entries(el.attributes ?? {})
				.filter(([, attr]) => 'description' in attr)
				.map(([name]) => `${el.name}[${name}]`),
		);
		expect(withDescription).toStrictEqual([]);
	});

	test('no global attribute has a description', () => {
		const withDescription = Object.entries(htmlSpec.def['#globalAttrs']).flatMap(([category, attrs]) =>
			Object.entries(attrs)
				.filter(([, attr]) => 'description' in attr)
				.map(([name]) => `${category}[${name}]`),
		);
		expect(withDescription).toStrictEqual([]);
	});

	/**
	 * The keys of `attributes` and of a category of `#globalAttrs` are attribute names, and an attribute can be called
	 * `description`; everywhere else the key is a field of the data.
	 */
	test('no field called description or valueDescriptions is anywhere', () => {
		const found = [];
		const walk = (value, trail, isNameMap) => {
			if (Array.isArray(value)) {
				for (const [i, item] of value.entries()) {
					walk(item, `${trail}[${i}]`, false);
				}
			} else if (value && typeof value === 'object') {
				for (const [key, child] of Object.entries(value)) {
					if (!isNameMap && (key === 'description' || key === 'valueDescriptions')) {
						found.push(`${trail}.${key}`);
					}
					const childIsNameMap = key === 'attributes' || (trail === '$.def.#globalAttrs' && !isNameMap);
					walk(child, `${trail}.${key}`, childIsNameMap);
				}
			}
		};
		walk(htmlSpec, '$', false);
		expect(found).toStrictEqual([]);
	});

	test.each(['1.1', '1.2', '1.3'])(
		'ARIA %s: no role has a description and no property has valueDescriptions',
		version => {
			const roles = ['roles', 'graphicsRoles', 'dpubRoles'].flatMap(key => aria[version][key] ?? []);
			expect(roles.filter(role => 'description' in role).map(role => role.name)).toStrictEqual([]);
			expect(roles.length).toBeGreaterThan(0);
			expect(
				(aria[version].props ?? []).filter(prop => 'valueDescriptions' in prop).map(prop => prop.name),
			).toStrictEqual([]);
		},
	);
});

/**
 * The generator reads deprecation only from marker wording in the spec text
 * (`generator/utils.ts`), so a rewording upstream drops the flags without any
 * error. These are the roles and properties the specs list as deprecated.
 */
describe('deprecation flags scraped from the specs', () => {
	const aria = htmlSpec.def['#aria'];

	test.each(['1.2', '1.3'])('ARIA %s: directory is deprecated', version => {
		expect(aria[version].roles.find(role => role.name === 'directory')?.deprecated).toBe(true);
	});

	test.each(['1.1', '1.2', '1.3'])('ARIA %s: doc-biblioentry and doc-endnote are deprecated', version => {
		const deprecated = aria[version].dpubRoles.filter(role => role.deprecated).map(role => role.name);
		expect(deprecated).toStrictEqual(['doc-biblioentry', 'doc-endnote']);
	});

	test.each(['1.2', '1.3'])('ARIA %s: aria-errormessage is deprecated on the button role', version => {
		const button = aria[version].roles.find(role => role.name === 'button');
		expect(button?.ownedProperties?.find(prop => prop.name === 'aria-errormessage')?.deprecated).toBe(true);
	});

	test.each(['1.1', '1.2', '1.3'])('ARIA %s: no DPUB-ARIA role lists a property twice', version => {
		const duplicated = aria[version].dpubRoles.filter(role => {
			const names = (role.ownedProperties ?? []).map(prop => prop.name);
			return new Set(names).size !== names.length;
		});
		expect(duplicated.map(role => role.name)).toStrictEqual([]);
	});

	test.each(['1.2', '1.3'])('ARIA %s: doc-noteref takes the deprecated properties of link', version => {
		const noteref = aria[version].dpubRoles.find(role => role.name === 'doc-noteref');
		const deprecated = noteref?.ownedProperties?.filter(prop => prop.deprecated).map(prop => prop.name);
		expect(deprecated).toStrictEqual(['aria-errormessage', 'aria-invalid']);
	});
});

describe('schema', () => {
	const map = [
		[
			'spec.*.jsonc',
			new Ajv({
				schemas: [
					schemas.element,
					schemas.aria,
					schemas.contentModels,
					schemas.globalAttributes,
					schemas.attributes,
					schemas.types,
				],
			}).getSchema(schemas.element.$id),

			'spec.*.jsonc',
		],
		[
			'spec-common.attributes.jsonc',
			new Ajv({
				schemas: [schemas.globalAttributes, schemas.attributes, schemas.types],
			}).getSchema(schemas.globalAttributes.$id),

			'spec-common.attributes.jsonc',
		],
	];

	for (const [testName, validator, pattern] of map) {
		test(testName, async () => {
			const files = await glob(pattern, { cwd: path.resolve(__dirname, '..', 'src'), absolute: true });
			// A pattern that matches nothing validates nothing and passes: the source files are in `src/`.
			expect(files.length).toBeGreaterThan(0);
			for (const jsonPath of files) {
				const json = parse(await readFile(jsonPath, { encoding: 'utf-8' }));
				const isValid = validator(json);
				if (!isValid) {
					throw new Error(`${path.basename(jsonPath)} is invalid (${validator.schemaEnv.baseId})`);
				}
			}
		});
	}
});
