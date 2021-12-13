import fs from 'fs';
import path from 'path';

// @ts-ignore
import { lexer } from 'css-tree';

import { types as extendedTypes, tokenizers } from '../src/defs';

const props = Object.keys(lexer.properties).map(p => `<'${p}'>`);
const types = Object.keys(lexer.types).map(t => `<${t}>`);

// eslint-disable-next-line @typescript-eslint/no-var-requires
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
				enum: [...Array.from(new Set([...props, ...types])), ...Object.keys(tokenizers).map(t => `<${t}>`)],
			},
			'extended-type': {
				type: 'string',
				enum: Object.keys(extendedTypes),
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
	{ encoding: 'utf-8' },
);

function oneOf(...keys: string[]) {
	return {
		oneOf: keys.map(key => ({
			$ref: `#/definitions/${key}`,
		})),
	};
}
