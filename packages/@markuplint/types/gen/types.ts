import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { lexer } from 'css-tree';

import { defs } from '../src/defs.js';
import { cssDefs } from '../src/css-defs.js';
import { cssTokenizers } from '../src/css-tokenizers.js';

const require = createRequire(import.meta.url);

// @ts-ignore
const props = Object.keys(lexer.properties).map(p => `<'${p}'>`);
// @ts-ignore
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
				enum: [...new Set([...props, ...types]), ...Object.keys(cssTokenizers).map(t => `<${t}>`)].sort(),
			},
			'extended-type': {
				type: 'string',
				enum: Object.keys({ ...defs, ...cssDefs }).sort(),
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
