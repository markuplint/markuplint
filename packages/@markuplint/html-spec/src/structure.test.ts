import path from 'path';

import $RefParser from '@apidevtools/json-schema-ref-parser';
import { getAttrSpecs } from '@markuplint/ml-spec';
import { sync as glob } from 'glob';
import { Validator } from 'jsonschema';

import htmlSpec, { specs } from '../index';

test('structure', () => {
	specs.forEach(el => {
		getAttrSpecs(el.name, htmlSpec);
	});
});

describe('schema', () => {
	const map = [
		[
			'permitted-structures',
			path.resolve(__dirname, '../../ml-spec/schemas/permitted-structures.schema.json'),
			path.resolve(__dirname, 'permitted-structures'),
		],
		// [
		// 	'attributes',
		// 	path.resolve(__dirname, '../../ml-spec/schemas/attributes.schema.json'),
		// 	path.resolve(__dirname, 'attributes'),
		// ],
		[
			'global-attributes',
			path.resolve(__dirname, '../../ml-spec/schemas/global-attributes.schema.json'),
			path.resolve(__dirname, 'global-attributes'),
		],
		[
			'aria-in-html',
			path.resolve(__dirname, '../../ml-spec/schemas/wai-aria.schema.json'),
			path.resolve(__dirname, 'aria-in-html'),
		],
	];

	for (const [testName, schamaPath, targetDir] of map) {
		test(testName, async () => {
			const schema = await $RefParser.bundle(schamaPath);
			const validator = new Validator();
			const attributes = glob(path.resolve(targetDir, '*.json')).map(attr => path.resolve(targetDir, attr));
			attributes.forEach(jsonPath => {
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const json = require(jsonPath);
				try {
					const res = validator.validate(json, schema as any);
					if (!res.valid) {
						// eslint-disable-next-line no-console
						console.warn(res);
						throw new SyntaxError(`Invalid JSON: ${jsonPath}`);
					}
				} catch (e) {
					// eslint-disable-next-line no-console
					console.log({ target: jsonPath, schema: schamaPath });
					throw e;
				}
			});
			expect(testName).toBe(testName);
		});
	}
});
