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
