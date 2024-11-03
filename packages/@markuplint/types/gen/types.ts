import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// @ts-ignore
import { lexer } from 'css-tree';

import { types as extendedTypes, tokenizers } from '../src/defs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);

const props = Object.keys(lexer.properties).map(p => `<'${p}'>`);
const types = Object.keys(lexer.types).map(t => `<${t}>`);

const specific = require('./specific-schema.json');

fs.writeFileSync(
	path.resolve(__dirname, '..', 'types.schema.json'),
	JSON.stringify({
		$schema: 'http://json-schema.org/draft-07/schema#',
		type: 'object',
		additionalProperties: false,
		definitions: {
			'css-syntax': {
				type: 'string',
				enum: [...new Set([...props, ...types]), ...Object.keys(tokenizers).map(t => `<${t}>`)].toSorted(),
			},
			'extended-type': {
				type: 'string',
				enum: Object.keys(extendedTypes).toSorted(),
			},
			'html-attr-requirement': {
				type: 'string',
				enum: ['Boolean'],
			},
			'keyword-defined-type': {
				...oneOf(
					//
					'css-syntax',
					'extended-type',
					'html-attr-requirement',
				),
			},
			...specific.definitions,
			type: {
				...oneOf(
					//
					'keyword-defined-type',
					...Object.keys(specific.definitions),
				),
			},
		},
		properties: {
			type: {
				$ref: '#/definitions/type',
			},
		},
	}),
	{ encoding: 'utf8' },
);

function oneOf(...keys: readonly string[]) {
	return {
		oneOf: keys
			.map(key => ({
				$ref: `#/definitions/${key}`,
			}))
			// @ts-ignore Charactor sorting
			.toSorted((a, b) => b.$ref - a.$ref),
	};
}
