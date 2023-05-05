const { readFile } = require('node:fs/promises');
const path = require('node:path');

const { resolveNamespace, getAttrSpecsByNames } = require('@markuplint/ml-spec');
const { glob } = require('@markuplint/test-tools');
const Ajv = require('ajv');
const strip = require('strip-json-comments');

const htmlSpec = require('../index');

const schemas = {
	element: {
		$id: '@markuplint/ml-spec/schemas/element.schema.json',
		...require('@markuplint/ml-spec/schemas/element.schema.json'),
	},
	aria: {
		$id: '@markuplint/ml-spec/schemas/aria.schema.json',
		...require('@markuplint/ml-spec/schemas/aria.schema.json'),
	},
	contentModels: {
		$id: '@markuplint/ml-spec/schemas/content-models.schema.json',
		...require('@markuplint/ml-spec/schemas/content-models.schema.json'),
	},
	globalAttributes: {
		$id: '@markuplint/ml-spec/schemas/global-attributes.schema.json',
		...require('@markuplint/ml-spec/schemas/global-attributes.schema.json'),
	},
	attributes: {
		$id: '@markuplint/ml-spec/schemas/attributes.schema.json',
		...require('@markuplint/ml-spec/schemas/attributes.schema.json'),
	},
	types: {
		$id: '@markuplint/types/types.schema.json',
		...require('../../types/types.schema.json'),
	},
};

test('structure', () => {
	htmlSpec.specs.forEach(el => {
		const { localName, namespaceURI } = resolveNamespace(el.name);
		try {
			getAttrSpecsByNames(localName, namespaceURI, htmlSpec);
		} catch (e) {
			throw el;
		}
	});
});

describe('schema', () => {
	const map = [
		[
			'spec.*.json',
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
			path.resolve(__dirname, 'spec.*.json'),
		],
		[
			'spec-common.attributes.json',
			new Ajv({
				schemas: [schemas.globalAttributes, schemas.attributes, schemas.types],
			}).getSchema(schemas.globalAttributes.$id),
			path.resolve(__dirname, 'spec-common.attributes.json'),
		],
	];

	for (const [testName, validator, targetFiles] of map) {
		test(testName, async () => {
			const files = await glob(targetFiles);
			for (const jsonPath of files) {
				const json = JSON.parse(strip(await readFile(jsonPath, { encoding: 'utf-8' })));
				const isValid = validator(json);
				if (!isValid) {
					throw new Error(`${path.basename(jsonPath)} is invalid (${validator.schemaEnv.baseId})`);
				}
			}
			expect(testName).toBe(testName);
		});
	}
});
