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

			path.resolve(__dirname, 'spec.*.jsonc'),
		],
		[
			'spec-common.attributes.jsonc',
			new Ajv({
				schemas: [schemas.globalAttributes, schemas.attributes, schemas.types],
			}).getSchema(schemas.globalAttributes.$id),

			path.resolve(__dirname, 'spec-common.attributes.jsonc'),
		],
	];

	for (const [testName, validator, targetFiles] of map) {
		test(testName, async () => {
			const files = await glob(targetFiles);
			for (const jsonPath of files) {
				const json = parse(await readFile(jsonPath, { encoding: 'utf-8' }));
				const isValid = validator(json);
				if (!isValid) {
					throw new Error(`${path.basename(jsonPath)} is invalid (${validator.schemaEnv.baseId})`);
				}
			}
			expect(testName).toBe(testName);
		});
	}
});
