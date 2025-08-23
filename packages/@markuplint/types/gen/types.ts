import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

// @ts-ignore
import { lexer } from 'css-tree';

import { types as extendedTypes, tokenizers } from '../src/defs.js';

const require = createRequire(import.meta.url);

const props = Object.keys(lexer.properties).map(p => `<'${p}'>`);
const types = Object.keys(lexer.types).map(t => `<${t}>`);

const specific = require('./specific-schema.json');

fs.writeFileSync(
	path.resolve(import.meta.dirname, '..', 'types.schema.json'),
	JSON.stringify({
		$schema: 'http://json-schema.org/draft-07/schema#',
		type: 'object',
		additionalProperties: false,
		definitions: {
			'css-syntax': {
				type: 'string',
				enum: [...new Set([...props, ...types]), ...Object.keys(tokenizers).map(t => `<${t}>`)].sort(),
			},
			'extended-type': {
				type: 'string',
				enum: Object.keys(extendedTypes).sort(),
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
			.sort((a, b) => b.$ref - a.$ref),
	};
}
